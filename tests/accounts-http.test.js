import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';

async function fixture(t){
  const s=new Store();
  const admin=s.createUser('account@http.test','AccountPassword123!');
  const outsider=s.createUser('outside@http.test','AccountPassword123!');
  const resident=s.createUser('resident@http.test','AccountPassword123!');
  const account=s.createAccount(admin,{name:'Administradora A',kind:'management_company'}).id;
  const other=s.createAccount(outsider,{name:'Independiente B',kind:'independent'}).id;
  const community=s.createCommunity('Condominio A','',account);
  const foreign=s.createCommunity('Condominio B','',other);
  s.setMembership(resident,community,'owner');s.setMembership(outsider,foreign,'admin');
  const server=createApp(s);server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(r=>server.close(r));s.close();});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const tokens={admin:s.authenticate('account@http.test','AccountPassword123!').token,resident:s.authenticate('resident@http.test','AccountPassword123!').token,outsider:s.authenticate('outside@http.test','AccountPassword123!').token};
  const ask=async(path,token,method='GET',data)=>{
    const r=await fetch(origin+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
    return {status:r.status,data:await r.json()};
  };
  return {s,admin,resident,account,other,community,foreign,tokens,ask};
}

test('API cuentas: sesión obligatoria y cuenta administrativa sin acceso operacional implícito',async t=>{
  const f=await fixture(t),{ask,tokens,account,community}=f;
  assert.equal((await ask('/api/accounts')).status,401);
  const accounts=await ask('/api/accounts',tokens.admin);
  assert.deepEqual(accounts.data.accounts.map(a=>a.name),['Administradora A']);
  assert.equal((await ask(`/api/accounts/${account}`,tokens.admin)).status,200);
  assert.equal((await ask(`/api/accounts/${account}`,tokens.resident)).status,403);
  assert.deepEqual((await ask(`/api/accounts/${account}/communities`,tokens.admin)).data.communities,[]);
  assert.equal((await ask(`/api/communities/${community}/overview`,tokens.admin)).status,404);
  assert.equal((await ask(`/api/accounts/${f.other}`,tokens.admin)).status,404);
});

test('API cuentas: crea condominio y concede acceso explícito sin cruzar clientes',async t=>{
  const {ask,tokens,account,admin,foreign}=await fixture(t);
  const created=await ask(`/api/accounts/${account}/communities`,tokens.admin,'POST',{name:'Segundo condominio',address:''});
  assert.equal(created.status,201);assert.ok(created.data.id);
  const path=`/api/accounts/${account}/communities/${created.data.id}/members/${admin}`;
  assert.equal((await ask(path,tokens.admin,'PATCH',{role:'admin'})).status,200);
  assert.equal((await ask(`/api/communities/${created.data.id}/overview`,tokens.admin)).status,200);
  assert.equal((await ask(`/api/accounts/${account}/communities/${foreign}/members/${admin}`,tokens.admin,'PATCH',{role:'admin'})).status,404);
  assert.equal((await ask(path,tokens.resident,'PATCH',{role:'admin'})).status,403);
  assert.equal((await ask(path,tokens.admin,'PATCH',{role:'superadmin'})).status,400);
});

test('API cuentas: revocación de cuenta corta acceso con una sesión ya abierta',async t=>{
  const {ask,tokens,account,community,resident}=await fixture(t);
  assert.equal((await ask(`/api/communities/${community}/overview`,tokens.resident)).status,200);
  assert.equal((await ask(`/api/accounts/${account}/members/${resident}`,tokens.admin,'PATCH',{role:null})).status,200);
  assert.equal((await ask(`/api/communities/${community}/overview`,tokens.resident)).status,404);
  assert.deepEqual((await ask('/api/accounts',tokens.resident)).data.accounts,[]);
  assert.deepEqual((await ask('/api/communities',tokens.resident)).data.communities,[]);
});

test('API cuentas: no permite eliminar al último administrador ni escalamiento del propietario',async t=>{
  const {ask,tokens,account,admin,resident}=await fixture(t);
  assert.equal((await ask(`/api/accounts/${account}/members/${admin}`,tokens.admin,'PATCH',{role:null})).status,409);
  assert.equal((await ask(`/api/accounts/${account}/members/${resident}`,tokens.resident,'PATCH',{role:'account_admin'})).status,403);
});
