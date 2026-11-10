import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync,rmSync,existsSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.js';

test('CLI de respaldo y restauración cifrados opera sin sobrescribir ni mostrar clave',t=>{
  const root=mkdtempSync(join(tmpdir(),'digi-cli-'));t.after(()=>rmSync(root,{force:true,recursive:true}));
  const file=join(root,'original.sqlite'),backup=join(root,'snapshot.dcb'),restored=join(root,'restore.sqlite');
  const s=new Store(file);const u=s.createUser('cli@backup.test','VeryStrongPassword#2026');
  const c=s.createCommunity('Copia CLI','',s.createAccount(u,{name:'Copia CLI',kind:'independent'}).id);s.setMembership(u,c,'admin');s.close();
  const passphrase='Contraseña cifrado QA de veinte o más caracteres';
  const env={...process.env,DIGI_DB_PATH:file,DIGI_BACKUP_PATH:backup,DIGI_BACKUP_PASSPHRASE:passphrase};
  const message=execFileSync(process.execPath,['server/secure-backup-cli.js'],{cwd:join(import.meta.dirname,'..'),env,encoding:'utf8'});
  assert.match(message,/cifrado AES-GCM/);assert.ok(!message.includes(passphrase));
  assert.ok(existsSync(backup));assert.notEqual(readFileSync(backup).subarray(0,6).toString(),'SQLite');
  const restore=execFileSync(process.execPath,['server/restore-backup-cli.js'],{
    cwd:join(import.meta.dirname,'..'),env:{...env,DIGI_RESTORE_SOURCE:backup,DIGI_RESTORE_PATH:restored},encoding:'utf8'
  });
  assert.match(restore,/recuperada y verificada/);assert.ok(!restore.includes(passphrase));
  assert.ok(existsSync(restored));
  const db=new Store(restored);t.after(()=>db.close());assert.equal(db.communitiesFor(u)[0].name,'Copia CLI');
});
