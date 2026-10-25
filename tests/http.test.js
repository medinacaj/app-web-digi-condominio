import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';

test('API HTTP: login, autorización, validación, assets y revocación',async t=>{
  const store=new Store();
  const admin=store.createUser('admin@example.test','VeryStrongPassword#2026');
  const outsider=store.createUser('outside@example.test','VeryStrongPassword#2026');
  const a=store.createCommunity('Edificio A'),b=store.createCommunity('Edificio B');
  store.setMembership(admin,a,'admin');store.setMembership(outsider,b,'admin');
  const server=createApp(store);
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));store.close();});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const req=async(path,method='GET',body,token)=>{
    const response=await fetch(origin+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
    const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
    return {status:response.status,headers:response.headers,data};
  };
  assert.equal((await req('/api/health')).data.status,'ok');
  assert.equal((await req('/api/communities')).status,401);
  assert.equal((await req('/api/login','POST',{email:'admin@example.test',password:'bad'})).status,401);
  assert.equal((await req('/api/login','POST',{email:'admin@example.test',password:'VeryStrongPassword#2026'})).status,200);
  const login=(await req('/api/login','POST',{email:'admin@example.test',password:'VeryStrongPassword#2026'})).data;
  assert.equal((await req('/api/session','GET',null,login.token)).data.user.email,'admin@example.test');
  const communities=(await req('/api/communities','GET',null,login.token)).data.communities;
  assert.deepEqual(communities.map(x=>x.name),['Edificio A']);
  assert.equal((await req(`/api/communities/${b}/overview`,'GET',null,login.token)).status,404);
  assert.equal((await req(`/api/communities/${a}/units`,'POST',{code:'X-1',kind:'Casa'},login.token)).status,201);
  assert.equal((await req(`/api/communities/${a}/units`,'POST',{code:'X-1',kind:'Casa'},login.token)).status,409);
  const overview=(await req(`/api/communities/${a}/overview`,'GET',null,login.token)).data;
  assert.equal(overview.units.length,1);
  assert.equal((await req('/src/connected.js')).status,200);
  assert.equal((await req('/src/connected.css')).headers.get('content-type'),'text/css; charset=utf-8');
  assert.equal((await req('/.data/condominio.sqlite')).status,404);
  assert.equal((await req('/server/store.js')).status,404);
  assert.equal((await req('/api/logout','POST',null,login.token)).status,200);
  assert.equal((await req('/api/session','GET',null,login.token)).status,401);
});
