import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';

async function fixture(t){
  const s=new Store(),id=s.createUser('admin@hosted.test','HostedTestPassword123!');
  const account=s.createAccount(id,{name:'Hosted test',kind:'independent'}).id;
  const server=createApp(s,{hosted:true,publicOrigin:'https://condominio.example.test',trustProxy:true});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(r=>server.close(r));s.close();});
  const ask=(path,method='GET',data,headers={})=>new Promise((resolve,reject)=>{
    const body=data?JSON.stringify(data):null;
    const req=request({host:'127.0.0.1',port:server.address().port,path,method,headers:{Host:'condominio.example.test','X-Forwarded-Proto':'https',...(body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}),...headers}},res=>{
      const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>{const text=Buffer.concat(chunks).toString();let data;try{data=JSON.parse(text);}catch{data=text;}resolve({status:res.statusCode,headers:res.headers,data});});
    });req.on('error',reject);if(body)req.write(body);req.end();
  });
  return {s,server,account,ask};
}
const creds={email:'admin@hosted.test',password:'HostedTestPassword123!'};
const origin={Origin:'https://condominio.example.test'};
test('alojado usa cookie HttpOnly Secure y token CSRF; nunca devuelve token de sesión',async t=>{
  const {ask}=await fixture(t);
  const login=await ask('/api/login','POST',creds,origin);
  assert.equal(login.status,200);assert.equal(login.data.token,undefined);
  const cookie=login.headers['set-cookie']?.[0];assert.match(cookie,/^__Host-digi_session=[a-f0-9]{64};/);
  for(const attr of ['HttpOnly','Secure','SameSite=Lax','Path=/'])assert.ok(cookie.includes(attr),attr);
  assert.match(login.data.csrfToken,/^[a-f0-9]{64}$/);
  assert.equal(login.headers['strict-transport-security'],'max-age=31536000');
  const Cookie=cookie.split(';')[0];
  const session=await ask('/api/session','GET',null,{Cookie});
  assert.equal(session.status,200);assert.equal(session.data.csrfToken,login.data.csrfToken);
  assert.equal((await ask('/api/logout','POST',null,{...origin,Cookie})).status,403);
  assert.equal((await ask('/api/logout','POST',null,{...origin,Cookie,'X-CSRF-Token':login.data.csrfToken})).status,200);
  assert.equal((await ask('/api/session','GET',null,{Cookie})).status,401);
});
test('alojado rechaza Host, Origin y HTTP distintos; no acepta sesión Bearer',async t=>{
  const {s,ask}=await fixture(t);
  assert.equal((await ask('/api/login','POST',creds)).status,403);
  assert.equal((await ask('/api/login','POST',creds,{Origin:'https://evil.test'})).status,403);
  assert.equal((await ask('/','GET',null,{Host:'evil.test'})).status,403);
  assert.equal((await ask('/','GET',null,{'X-Forwarded-Proto':'http'})).status,426);
  const token=s.authenticate(creds.email,creds.password).token;
  assert.equal((await ask('/api/session','GET',null,{Authorization:`Bearer ${token}`})).status,401);
});
test('configuración alojada exige origen HTTPS y no confía en cabeceras proxy por defecto',async t=>{
  const s=new Store();t.after(()=>s.close());
  assert.throws(()=>createApp(s,{hosted:true,publicOrigin:'http://example.test'}),/HTTPS/i);
  const server=createApp(s,{hosted:true,publicOrigin:'https://condominio.example.test'});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  const r=await fetch(`http://127.0.0.1:${server.address().port}/`,{headers:{Host:'condominio.example.test','X-Forwarded-Proto':'https'}});
  // Fetch normalizes Host, so either Host rejection or TLS rejection must fail closed.
  assert.ok([403,426].includes(r.status));
});

test('fallos de un usuario detrás del proxy no bloquean a todos ni se evaden con X-Forwarded-For',async t=>{
  const {s,ask}=await fixture(t);
  s.createUser('other@hosted.test','OtherHostedPassword123!');
  for(let i=0;i<8;i++)assert.equal((await ask('/api/login','POST',{email:'admin@hosted.test',password:'incorrect'},origin)).status,401);
  const other=await ask('/api/login','POST',{email:'other@hosted.test',password:'OtherHostedPassword123!'},origin);
  assert.equal(other.status,200,'Un atacante no debe bloquear otra identidad por compartir proxy');
  assert.equal((await ask('/api/login','POST',creds,{...origin,'X-Forwarded-For':'1.2.3.4'})).status,429);
});

test('suscripción solo visible al administrador de su cuenta y no permite autoactivar pagos',async t=>{
  const {s,account,ask}=await fixture(t);
  const member=s.createUser('member@hosted.test','MemberHostedPassword123!');
  const admin=s.db.prepare('SELECT id FROM users WHERE email=?').get(creds.email).id;
  s.changeAccountMember(admin,account,member,'member');
  const login=await ask('/api/login','POST',creds,origin);
  const headers={...origin,Cookie:login.headers['set-cookie'][0].split(';')[0],'X-CSRF-Token':login.data.csrfToken};
  assert.equal((await ask(`/api/accounts/${account}/subscription`,'GET',null,headers)).data.subscription.status,'unconfigured');
  assert.equal((await ask(`/api/accounts/${account}/subscription`,'PATCH',{status:'active'},headers)).status,405);
  const ordinary=await ask('/api/login','POST',{email:'member@hosted.test',password:'MemberHostedPassword123!'},origin);
  const memberCookie={Cookie:ordinary.headers['set-cookie'][0].split(';')[0]};
  assert.equal((await ask(`/api/accounts/${account}/subscription`,'GET',null,memberCookie)).status,403);
});
