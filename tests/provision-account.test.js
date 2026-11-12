import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Store } from '../server/store.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'digi-provision-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  return {...process.env,DIGI_DB_PATH:join(dir,'accounts.sqlite'),DIGI_ACCOUNT_ADMIN_EMAIL:'admin@provision.test',DIGI_ACCOUNT_ADMIN_PASSWORD:'ProvisionTestPassword123!',DIGI_ACCOUNT_NAME:'Administradora asistida',DIGI_ACCOUNT_KIND:'management_company'};
}
test('alta asistida crea cuenta y permite reutilizar usuario sin otorgar condominios',t=>{
  const env=fixture(t);
  for(const changes of [{},{DIGI_ACCOUNT_NAME:'Condominio nuevo',DIGI_ACCOUNT_KIND:'independent',DIGI_ACCOUNT_ADMIN_PASSWORD:''}]){
    const result=spawnSync(process.execPath,['server/provision-account.js'],{env:{...env,...changes},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.doesNotMatch(result.stdout+result.stderr,/ProvisionTestPassword123!/);
  }
  const s=new Store(env.DIGI_DB_PATH);
  try{
    assert.equal(s.countUsers(),1);
    const user=s.db.prepare('SELECT id FROM users').get().id;
    assert.equal(s.accountsFor(user).length,2);
    assert.deepEqual(s.communitiesFor(user),[]);
  }finally{s.close();}
});
test('alta asistida inválida revierte también el usuario recién creado',t=>{
  const env={...fixture(t),DIGI_ACCOUNT_KIND:'unknown'};
  const result=spawnSync(process.execPath,['server/provision-account.js'],{env,encoding:'utf8'});
  assert.equal(result.status,1);assert.doesNotMatch(result.stdout+result.stderr,/ProvisionTestPassword123!/);
  const s=new Store(env.DIGI_DB_PATH);
  try{assert.equal(s.countUsers(),0);assert.equal(s.db.prepare('SELECT count(*) n FROM accounts').get().n,0);}finally{s.close();}
});
