import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Store} from '../server/store.js';
import { sqliteTempCleanup } from './helpers/sqlite-fixture.js';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';

function legacy(t){const dir=mkdtempSync(join(tmpdir(),'digi-migrate-'));const cleanup=sqliteTempCleanup(t,dir);const file=join(dir,'old.sqlite'),backup=join(dir,'backup.sqlite');const db=new DatabaseSync(file);db.exec(readFileSync(new URL('./fixtures/schema-v3.sql',import.meta.url),'utf8'));db.exec(`INSERT INTO users VALUES ('admin','a@example.test','Admin','hash','now'),('owner','o@example.test','Owner','hash','now'),('operator','op@example.test','Operator','hash','now'); INSERT INTO communities VALUES ('11111111-1111-1111-1111-111111111111','Legacy','Address','now'); INSERT INTO memberships VALUES ('admin','11111111-1111-1111-1111-111111111111','admin'),('owner','11111111-1111-1111-1111-111111111111','owner'),('operator','11111111-1111-1111-1111-111111111111','admin'); INSERT INTO units VALUES ('unit','11111111-1111-1111-1111-111111111111','101','flat','Resident','owner','now'); INSERT INTO charges VALUES ('charge','11111111-1111-1111-1111-111111111111','unit','2026-10','Fee',1500,'now'); INSERT INTO payments VALUES ('pay','11111111-1111-1111-1111-111111111111','unit','ref','Payment',500,'now');`);db.close();return {cleanup,file,backup,mapping:{accounts:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',name:'Client',kind:'independent',adminUserIds:['admin']}],communities:[{communityId:'11111111-1111-1111-1111-111111111111',accountId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]}};}
test('legacy open refuses without mutation and explicit migration preserves finances and assignments',async t=>{const {cleanup,file,backup,mapping}=legacy(t);const original=readFileSync(file);assert.throws(()=>new Store(file),/Migración/);assert.deepEqual(readFileSync(file),original);const {migrateAccounts}=await import('../server/account-migration.js');await migrateAccounts(file,mapping,backup);assert(existsSync(backup));const old=new DatabaseSync(backup);assert.equal(old.prepare('PRAGMA user_version').get().user_version,3);assert(!old.prepare('PRAGMA table_info(communities)').all().some(c=>c.name==='account_id'));old.close();const migrated=new DatabaseSync(file,{readOnly:true});assert.equal(migrated.prepare('PRAGMA user_version').get().user_version,4);migrated.close();const s=cleanup.track(new Store(file));assert.equal(s.db.prepare('PRAGMA user_version').get().user_version,11);assert.equal(s.overview('owner',mapping.communities[0].communityId).units[0].balanceMinor,1000);assert.equal(s.accountsFor('owner')[0].role,'member');assert.equal(s.accountsFor('admin')[0].role,'account_admin');assert.equal(s.accountsFor('operator')[0].role,'member');assert.equal(s.db.prepare('PRAGMA foreign_key_check').all().length,0);assert.equal(s.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.throws(()=>s.db.prepare("INSERT INTO communities(id,name,address,created_at) VALUES ('bad','Bad','','now')").run(),/NOT NULL/);});
test('all invalid mappings preserve exact old schema and data',async t=>{const {migrateAccounts}=await import('../server/account-migration.js');for(const change of [m=>m.communities=[],m=>m.communities.push({...m.communities[0]}),m=>m.communities[0].accountId='unknown',m=>m.accounts[0].adminUserIds=[],m=>m.accounts[0].adminUserIds=['missing'],m=>m.accounts.push({...m.accounts[0]}),m=>m.accounts.push({id:'empty',name:'Empty',kind:'independent',adminUserIds:['admin']}),m=>m.accounts[0].kind='other',m=>{m.accounts[0].id='short';m.communities[0].accountId='short'}]){const {file,backup,mapping}=legacy(t);change(mapping);const before=readFileSync(file);await assert.rejects(()=>migrateAccounts(file,mapping,backup));assert.deepEqual(readFileSync(file),before);}});
test('failed schema write rolls back, backup retained; backup and future version required',async t=>{const {migrateAccounts}=await import('../server/account-migration.js');const {file,backup,mapping}=legacy(t);await assert.rejects(()=>migrateAccounts(file,mapping));const conflict=new DatabaseSync(file);conflict.exec('CREATE TABLE account_audit_events (unexpected TEXT)');conflict.close();await assert.rejects(()=>migrateAccounts(file,mapping,backup));const verify=new DatabaseSync(file);assert.equal(verify.prepare('PRAGMA user_version').get().user_version,3);assert.equal(verify.prepare('SELECT COUNT(*) n FROM charges').get().n,1);assert.equal(verify.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='accounts'").get().n,0);assert(existsSync(backup));assert(!verify.prepare('PRAGMA table_info(communities)').all().some(c=>c.name==='account_id'));verify.exec('PRAGMA user_version=99');verify.close();await assert.rejects(()=>migrateAccounts(file,mapping,join(backup,'other')),/versión/i);});
test('migration refuses broken foreign keys before creating a backup or changing schema',async t=>{
  const {file,backup,mapping}=legacy(t);
  const db=new DatabaseSync(file);db.exec("PRAGMA foreign_keys=OFF; INSERT INTO memberships VALUES ('missing','11111111-1111-1111-1111-111111111111','owner')");db.close();
  const original=readFileSync(file);
  const {migrateAccounts}=await import('../server/account-migration.js');
  await assert.rejects(()=>migrateAccounts(file,mapping,backup),/integridad/);
  assert.deepEqual(readFileSync(file),original);assert(!existsSync(backup));
});
test('migration CLI consumes explicit environment paths and refuses overwriting the backup',t=>{
  const {file,backup,mapping}=legacy(t);const mappingFile=join(file+'-mapping.json');
  writeFileSync(mappingFile,JSON.stringify(mapping));
  const env={...process.env,DIGI_DB_PATH:file,DIGI_ACCOUNT_MAPPING:mappingFile,DIGI_MIGRATION_BACKUP:backup};
  const first=spawnSync(process.execPath,['server/migrate-accounts.js'],{env,encoding:'utf8'});
  assert.equal(first.status,0,first.stderr);assert.match(first.stdout,/completada/);
  const bytes=readFileSync(backup);
  const again=spawnSync(process.execPath,['server/migrate-accounts.js'],{env,encoding:'utf8'});
  assert.equal(again.status,1);assert.deepEqual(readFileSync(backup),bytes);
});
