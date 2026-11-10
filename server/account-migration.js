import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,mkdirSync,mkdtempSync,linkSync,rmSync,chmodSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Problem,requireText} from './store.js';

function validate(db,mapping) {
  if(!mapping || !Array.isArray(mapping.accounts) || !Array.isArray(mapping.communities))throw new Problem(400,'Mapeo de cuentas y comunidades obligatorio');
  const users=new Set(db.prepare('SELECT id FROM users').all().map(u=>u.id));
  const communities=new Set(db.prepare('SELECT id FROM communities').all().map(c=>c.id));
  const accountIds=new Set(),mapped=new Set(),owned=new Set();
  for(const account of mapping.accounts){
    if(!account || typeof account.id!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(account.id) || accountIds.has(account.id))throw new Problem(400,'Cuenta duplicada o identificador inválido');
    accountIds.add(account.id);requireText(account.name,'Cuenta',130);
    if(!['independent','management_company'].includes(account.kind))throw new Problem(400,'Tipo de cuenta inválido');
    if(!Array.isArray(account.adminUserIds)||!account.adminUserIds.length||new Set(account.adminUserIds).size!==account.adminUserIds.length||account.adminUserIds.some(id=>!users.has(id)))throw new Problem(400,'Cada cuenta requiere administradores explícitos existentes sin duplicados');
  }
  for(const assignment of mapping.communities){
    if(!assignment || !communities.has(assignment.communityId)||mapped.has(assignment.communityId)||!accountIds.has(assignment.accountId))throw new Problem(400,'Comunidad duplicada, desconocida o sin cuenta');
    mapped.add(assignment.communityId);owned.add(assignment.accountId);
  }
  if(mapped.size!==communities.size || owned.size!==accountIds.size)throw new Problem(400,'Mapeo incompleto o cuenta sin comunidad');
}
function integrity(db){
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw new Problem(409,'La base no supera las comprobaciones de integridad');
}

/** Explicit offline migration. A source write lock protects mapping and backup consistency. */
export async function migrateAccounts(location,mapping,backupPath){
  if(typeof location!=='string'||!existsSync(location))throw new Problem(400,'La base de datos origen no existe');
  const source=realpathSync(location);
  if(typeof backupPath!=='string'||!backupPath.trim()||resolve(backupPath)===source||existsSync(backupPath))throw new Problem(400,'Respaldo obligatorio en un archivo nuevo distinto del origen');
  const db=new DatabaseSync(source);let transaction=false,work;
  try{
    const version=db.prepare('PRAGMA user_version').get().user_version;
    if(version!==3)throw new Problem(409,'Versión de esquema no admitida: la migración requiere versión 3');
    if(db.prepare('PRAGMA table_info(communities)').all().some(c=>c.name==='account_id'))throw new Problem(409,'La base ya contiene cuentas');
    db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE');transaction=true;
    integrity(db);validate(db,mapping);
    mkdirSync(dirname(resolve(backupPath)),{recursive:true,mode:0o700});
    work=mkdtempSync(join(dirname(resolve(backupPath)),'.digi-account-backup-'));
    const snapshot=join(work,'snapshot.sqlite');
    const reader=new DatabaseSync(source,{readOnly:true});
    try{await backup(reader,snapshot);}finally{reader.close();}
    const verify=new DatabaseSync(snapshot,{readOnly:true});
    try{integrity(verify);}finally{verify.close();}
    chmodSync(snapshot,0o600);linkSync(snapshot,resolve(backupPath));
    const schemaObjects=db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='communities' AND type IN ('index','trigger') AND sql IS NOT NULL").all();
    db.exec(`CREATE TABLE accounts (id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('independent','management_company')),created_at TEXT NOT NULL);
      CREATE TABLE account_memberships (account_id TEXT NOT NULL REFERENCES accounts(id),user_id TEXT NOT NULL REFERENCES users(id),role TEXT NOT NULL CHECK(role IN ('account_admin','member')),PRIMARY KEY(account_id,user_id));
      CREATE TABLE account_audit_events (id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),user_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,entity_id TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE communities_new (id TEXT PRIMARY KEY,name TEXT NOT NULL,address TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,account_id TEXT NOT NULL REFERENCES accounts(id));`);
    const now=new Date().toISOString();
    for(const account of mapping.accounts){
      db.prepare('INSERT INTO accounts VALUES (?,?,?,?)').run(account.id,account.name.trim(),account.kind,now);
      for(const userId of account.adminUserIds)db.prepare("INSERT INTO account_memberships VALUES (?,?,'account_admin')").run(account.id,userId);
      db.prepare('INSERT INTO account_audit_events VALUES (?,?,?,?,?,?)').run(randomUUID(),account.id,account.adminUserIds[0],'account.migrated',account.id,now);
    }
    for(const entry of mapping.communities)db.prepare('INSERT INTO communities_new SELECT id,name,address,created_at,? FROM communities WHERE id=?').run(entry.accountId,entry.communityId);
    db.exec('DROP TABLE communities; ALTER TABLE communities_new RENAME TO communities;');
    for(const obj of schemaObjects)db.exec(obj.sql);
    db.exec("INSERT OR IGNORE INTO account_memberships SELECT DISTINCT c.account_id,m.user_id,'member' FROM memberships m JOIN communities c ON c.id=m.community_id");
    integrity(db);db.exec('PRAGMA user_version=4; COMMIT');transaction=false;
    return {ok:true,backupPath:resolve(backupPath)};
  }catch(error){if(transaction)db.exec('ROLLBACK');throw error;}
  finally{db.close();if(work)rmSync(work,{recursive:true,force:true});}
}
