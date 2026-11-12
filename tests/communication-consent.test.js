import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';
const pwd='SyntheticPassword-Consent-2026!';
function setup(t){
  const s=new Store();t.after(()=>s.close());
  const admin=s.createUser('admin-consent@example.test',pwd);
  const owner=s.createUser('owner-consent@example.test',pwd);
  const other=s.createUser('other-consent@example.test',pwd);
  const committee=s.createUser('committee-consent@example.test',pwd);
  const a=s.createCommunity('Comunidad A','',s.createAccount(admin,{name:'A',kind:'independent'}).id);
  const b=s.createCommunity('Comunidad B','',s.createAccount(other,{name:'B',kind:'independent'}).id);
  for(const [u,c,role] of [[admin,a,'admin'],[owner,a,'owner'],[other,b,'owner'],[committee,a,'committee']])s.setMembership(u,c,role);
  s.addUnit(admin,a,{code:'T-504',kind:'Departamento',ownerUserId:owner});
  return {s,admin,owner,other,committee,a,b};
}
const enable={purpose:'billing_updates',channel:'email',enabled:true};
test('default deny; consent recorded only for authenticated owner and purpose, independently revocable',t=>{
 const x=setup(t);
 assert.deepEqual(x.s.communicationConsent(x.owner,x.a),{entries:[],verifiedChannel:false,externalDeliveryEnabled:false});
 const a=x.s.setCommunicationConsent(x.owner,x.a,enable);
 assert.equal(a.enabled,true);assert.equal(a.externalDeliveryEnabled,false);
 x.s.setCommunicationConsent(x.owner,x.a,{purpose:'community_news',channel:'email',enabled:true});
 let current=x.s.communicationConsent(x.owner,x.a).entries;
 assert.equal(current.length,2);
 assert.ok(current.every(v=>v.enabled));
 x.s.setCommunicationConsent(x.owner,x.a,{...enable,enabled:false});
 current=x.s.communicationConsent(x.owner,x.a).entries;
 assert.equal(current.find(v=>v.purpose==='billing_updates').enabled,false);
 assert.equal(current.find(v=>v.purpose==='community_news').enabled,true);
 const events=x.s.db.prepare('SELECT authentication,enabled,purpose,user_id userId FROM communication_consent_events WHERE community_id=? ORDER BY rowid').all(x.a);
 assert.equal(events.length,3);
 assert.ok(events.every(v=>v.authentication==='authenticated_self_service'&&v.userId===x.owner));
 assert.deepEqual(events.map(v=>v.enabled),[1,1,0]);
 assert.equal(x.s.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='communication.consent_changed'").get().n,3);
 assert.equal(x.s.communicationConsent(x.owner,x.a).externalDeliveryEnabled,false);
});
test('admins cannot set owners consent and directory preferences are not opt-in evidence',t=>{
 const x=setup(t);
 x.s.addUnitPerson(x.admin,x.a,x.s.overview(x.admin,x.a).units[0].id,{
  fullName:'Inquilino ficticio',relationship:'tenant',email:'tenant@example.test',contactPreference:'email'
 });
 assert.throws(()=>x.s.communicationConsent(x.admin,x.a),e=>e.status===403);
 assert.throws(()=>x.s.setCommunicationConsent(x.admin,x.a,enable),e=>e.status===403);
 assert.throws(()=>x.s.setCommunicationConsent(x.committee,x.a,enable),e=>e.status===403);
 assert.throws(()=>x.s.communicationConsent(x.other,x.a),e=>e.status===404);
 assert.equal(x.s.communicationConsent(x.owner,x.a).entries.length,0);
 assert.doesNotMatch(JSON.stringify(x.s.overview(x.owner,x.a)),/tenant@example.test/);
});
test('strict payload allowlist blocks forged account or email destination',t=>{
 const x=setup(t);
 const invalid=[
  {...enable,userId:x.admin},
  {...enable,email:'spoofed@example.test'},
  {...enable,tenantId:x.b},
  {...enable,enabled:'true'},
  {...enable,purpose:'marketing'},
  {...enable,channel:'whatsapp'},
  {...enable,channel:'sms'},
  {...enable,channel:'in_app'},
  {channel:'email',enabled:true},
  null
 ];
 for(const input of invalid)assert.throws(()=>x.s.setCommunicationConsent(x.owner,x.a,input),e=>e.status===400);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM communication_consent_events').get().n,0);
});
test('audit failure reverts preference and consent event',t=>{
 const x=setup(t);
 const original=x.s.audit;x.s.audit=()=>{throw Error('Synthetic audit outage');};
 assert.throws(()=>x.s.setCommunicationConsent(x.owner,x.a,enable),/Synthetic audit outage/);
 assert.equal(x.s.communicationConsent(x.owner,x.a).entries.length,0);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM communication_consent_events').get().n,0);
 x.s.audit=original;
 assert.equal(x.s.setCommunicationConsent(x.owner,x.a,enable).enabled,true);
});
test('authenticated HTTP consent is per-owner, scoped and no-store; never enables delivery',async t=>{
 const x=setup(t),app=createApp(x.s);app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(resolve=>app.close(resolve)));
 const root='http://127.0.0.1:'+app.address().port;
 const ask=async(path,method='GET',payload,token)=>{
   const res=await fetch(root+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
   return {status:res.status,body:await res.json(),cache:res.headers.get('cache-control')};
 };
 const token={};
 for(const [k,email] of [['owner','owner-consent@example.test'],['admin','admin-consent@example.test'],['other','other-consent@example.test']]){
   token[k]=(await ask('/api/login','POST',{email,password:pwd})).body.token;
 }
 const path='/api/communities/'+x.a+'/communication-consent';
 assert.equal((await ask(path)).status,401);
 assert.equal((await ask(path,'GET',null,token.admin)).status,403);
 assert.equal((await ask(path,'GET',null,token.other)).status,404);
 assert.equal((await ask(path,'PUT',enable,token.admin)).status,403);
 const updated=await ask(path,'PUT',enable,token.owner);
 assert.equal(updated.status,200);assert.equal(updated.cache,'no-store');
 assert.equal(updated.body.externalDeliveryEnabled,false);
 assert.equal((await ask(path,'GET',null,token.owner)).body.entries[0].enabled,true);
 assert.equal((await ask(path,'PUT',{...enable,enabled:false},token.owner)).body.enabled,false);
 assert.equal((await ask(path,'GET',null,token.owner)).body.entries[0].enabled,false);
});
