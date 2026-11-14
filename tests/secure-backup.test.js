import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, openSync, closeSync, ftruncateSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.js';
import { createEncryptedBackup, restoreEncryptedBackup, decryptSqlite } from '../server/secure-backup.js';

test('respaldo cifrado restaura unidades, pagos, membresías e incidencias',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'digi-cipher-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const dbPath=join(dir,'orig.sqlite'),enc=join(dir,'backup.dcb'),recovered=join(dir,'restored.sqlite');
  const passphrase='Passphrase muy larga de respaldo solo de QA 2026';
  const s=new Store(dbPath);
  const admin=s.createUser('admin@encrypted.test','VeryStrongPassword#2026');
  const community=s.createCommunity('Torre prueba');s.setMembership(admin,community,'admin');
  const unit=s.addUnit(admin,community,{code:'T1',kind:'Casa'}).id;
  s.addCharge(admin,community,{unitId:unit,period:'2026-10',concept:'Común',amountMinor:3000});
  s.addPayment(admin,community,{unitId:unit,reference:'QA-1',concept:'Abono',amountMinor:500});
  s.addIncident(admin,community,{title:'Falla de bomba',detail:'Se detuvo el motor',category:'maintenance',priority:'high'});
  const summary=await createEncryptedBackup(s,enc,passphrase);s.close();
  assert.ok(summary.bytes>100);
  assert.equal(readFileSync(enc).subarray(0,5).toString(),'DGCB1');
  assert.ok(!readFileSync(enc).includes(Buffer.from('SQLite format 3')));
  assert.throws(()=>restoreEncryptedBackup(enc,recovered,'passphrase totalmente incorrecta'),/Contraseña incorrecta/);
  assert.equal(existsSync(recovered),false);
  const tampered=Buffer.from(readFileSync(enc));tampered[tampered.length-1]^=0x50;
  writeFileSync(join(dir,'tampered.dcb'),tampered);
  assert.throws(()=>restoreEncryptedBackup(join(dir,'tampered.dcb'),recovered,passphrase),/respaldo modificado/);
  const recoveredSummary=restoreEncryptedBackup(enc,recovered,passphrase);
  assert.ok(recoveredSummary.bytes>100);
  assert.throws(()=>restoreEncryptedBackup(enc,recovered,passphrase),/destino ya existe/);
  const output=new Store(recovered);t.after(()=>output.close());
  assert.equal(output.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(output.communitiesFor(admin).length,1);
  assert.equal(output.overview(admin,community).units[0].balanceMinor,2500);
  assert.equal(output.incidentsFor(admin,community).length,1);
});

test('no cifra datos que no son SQLite ni admite clave débil',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'digi-cipher-bad-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const orig=join(dir,'plain.sqlite'),enc=join(dir,'encrypted.dcb');const s=new Store(orig);t.after(()=>s.close());
  await assert.rejects(createEncryptedBackup(s,enc,'clave-corta'),/frase de cifrado/);
  assert.equal(existsSync(enc),false);
  assert.throws(()=>decryptSqlite(Buffer.from('texto de ejemplo'),'otra clave segura de prueba 2026'),/Formato de respaldo/);
});

test('rechaza un respaldo sobredimensionado antes de cargarlo en memoria',t=>{
  const dir=mkdtempSync(join(tmpdir(),'digi-large-backup-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const oversized=join(dir,'oversized.dcb'),destination=join(dir,'restored.sqlite');
  const fd=openSync(oversized,'w',0o600);
  try{ftruncateSync(fd,100*1024*1024+50);}finally{closeSync(fd);}
  assert.throws(
    ()=>restoreEncryptedBackup(oversized,destination,'Frase de respaldo de prueba suficientemente larga'),
    /superior al límite/
  );
  assert.equal(existsSync(destination),false);
});

test('publica respaldo completo sin sobrescribir ni dejar archivos temporales',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'digi-atomic-backup-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const s=new Store(join(dir,'source.sqlite'));t.after(()=>s.close());
  const location=join(dir,'out','snapshot.dcb');
  const pass='Contraseña para prueba de publicación atómica 2026';
  const result=await createEncryptedBackup(s,location,pass);
  assert.ok(result.bytes>49);
  assert.equal(readFileSync(location).length,result.bytes);
  assert.deepEqual(readdirSync(join(dir,'out')),['snapshot.dcb']);
  const original=readFileSync(location);
  await assert.rejects(createEncryptedBackup(s,location,pass),/ya existe/);
  assert.deepEqual(readFileSync(location),original);
  assert.deepEqual(readdirSync(join(dir,'out')),['snapshot.dcb']);
});
