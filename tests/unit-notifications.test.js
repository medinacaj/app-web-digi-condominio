import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';

const pwd='OnlySyntheticPassword2026-!';
function setup(t){
 const s=new Store();t.after(()=>s.close());
 const admin=s.createUser('admin@example.test',pwd);
 const owner=s.createUser('owner@example.test',pwd);
 const newOwner=s.createUser('new-owner@example.test',pwd);
 const outside=s.createUser('outside@example.test',pwd);
 const committee=s.createUser('committee@example.test',pwd);
 const accountA=s.createAccount(admin,{name:'Administradora A',kind:'independent'}).id;
 const accountB=s.createAccount(outside,{name:'Administradora B',kind:'independent'}).id;
 const a=s.createCommunity('Edificio A','',accountA),b=s.createCommunity('Edificio B','',accountB);
 for(const [uid,cid,role] of [[admin,a,'admin'],[owner,a,'owner'],[newOwner,a,'owner'],[outside,b,'admin'],[committee,a,'committee']])s.setMembership(uid,cid,role);
 const unit=s.addUnit(admin,a,{code:'B-504',kind:'Departamento',ownerUserId:owner}).id;
 const neighbor=s.addUnit(admin,a,{code:'B-505',kind:'Departamento'}).id;
 const otherUnit=s.addUnit(outside,b,{code:'B-504',kind:'Departamento'}).id;
 return {s,admin,owner,newOwner,outside,committee,a,b,unit,neighbor,otherUnit};
}

test('cuota y pago manual producen avisos privados, sin enviar ni confirmar transferencias',t=>{
 const x=setup(t);
 const charge=x.s.addCharge(x.admin,x.a,{unitId:x.unit,period:'2026-11',concept:'Gastos comunes',amountMinor:49000});
 const payment=x.s.addPayment(x.admin,x.a,{unitId:x.unit,reference:'DEMO-123',concept:'Pago manual',amountMinor:10000});
 const notices=x.s.notificationsFor(x.owner,x.a);
 assert.equal(notices.length,2);
 assert.deepEqual(new Set(notices.map(n=>n.kind)),new Set(['charge_created','payment_recorded']));
 assert.ok(notices.every(n=>n.unit==='B-504'&&n.readAt===null));
 assert.match(notices.find(n=>n.kind==='payment_recorded').body,/No equivale a confirmación/);
 assert.doesNotMatch(JSON.stringify(notices),/DEMO-123|49000|10000/);
 assert.deepEqual(x.s.notificationsFor(x.committee,x.a),[]);
 assert.deepEqual(x.s.notificationsFor(x.admin,x.a),[]);
 assert.deepEqual(x.s.notificationsFor(x.newOwner,x.a),[]);
 assert.throws(()=>x.s.notificationsFor(x.owner,x.b),e=>e.status===404);
 assert.throws(()=>x.s.addCharge(x.admin,x.a,{unitId:x.unit,period:'2026-11',concept:'Gastos comunes',amountMinor:49000}),e=>e.status===409);
 assert.equal(x.s.notificationsFor(x.owner,x.a).length,2);
 assert.ok(charge.id&&payment.id);
});

test('mensajes puntuales requieren administrador, propietario asignado y unidad del mismo condominio',t=>{
 const x=setup(t);
 assert.throws(()=>x.s.sendUnitMessage(x.owner,x.a,x.unit,{title:'Aviso',body:'Solo para esta unidad'}),e=>e.status===403);
 assert.throws(()=>x.s.sendUnitMessage(x.committee,x.a,x.unit,{title:'Aviso',body:'Solo para esta unidad'}),e=>e.status===403);
 assert.throws(()=>x.s.sendUnitMessage(x.admin,x.a,x.otherUnit,{title:'Aviso',body:'Solo para esta unidad'}),e=>e.status===404);
 assert.throws(()=>x.s.sendUnitMessage(x.admin,x.a,x.neighbor,{title:'Aviso',body:'Solo para esta unidad'}),e=>e.status===409);
 for(const bad of [{title:'',body:'Bien'},{title:'Bien',body:''},{title:'Bien',body:'Hola',email:'victima@example.test'}])
   assert.throws(()=>x.s.sendUnitMessage(x.admin,x.a,x.unit,bad),e=>e.status===400);
 x.s.sendUnitMessage(x.admin,x.a,x.unit,{title:'Revisión de acceso',body:'Actualiza la llave en administración.'});
 const inbox=x.s.notificationsFor(x.owner,x.a);
 assert.equal(inbox.length,1);
 assert.equal(inbox[0].kind,'unit_message');
 assert.equal(inbox[0].title,'Revisión de acceso');
 assert.equal(x.s.notificationsFor(x.newOwner,x.a).length,0);
});

test('al cambiar propietario se revocan avisos previos, sin entregarlos al nuevo titular',t=>{
 const x=setup(t);
 x.s.sendUnitMessage(x.admin,x.a,x.unit,{title:'Privado',body:'Mensaje del antiguo titular'});
 const old=x.s.notificationsFor(x.owner,x.a)[0];
 assert.throws(()=>x.s.readUnitNotification(x.newOwner,x.a,old.id),e=>e.status===404);
 assert.equal(x.s.readUnitNotification(x.owner,x.a,old.id).read,true);
 assert.ok(x.s.notificationsFor(x.owner,x.a)[0].readAt);
 assert.equal(x.s.readUnitNotification(x.owner,x.a,old.id).read,true);
 assert.equal(x.s.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='notification.read'").get().n,1);
 x.s.assignUnitOwner(x.admin,x.a,x.unit,x.newOwner);
 assert.deepEqual(x.s.notificationsFor(x.owner,x.a),[]);
 assert.deepEqual(x.s.notificationsFor(x.newOwner,x.a),[]);
 assert.throws(()=>x.s.readUnitNotification(x.owner,x.a,old.id),e=>e.status===404);
 x.s.sendUnitMessage(x.admin,x.a,x.unit,{title:'Bienvenida',body:'Mensaje privado a nueva persona'});
 assert.deepEqual(x.s.notificationsFor(x.newOwner,x.a).map(n=>n.title),['Bienvenida']);
 x.s.assignUnitOwner(x.admin,x.a,x.unit,null);
 assert.equal(x.s.notificationsFor(x.newOwner,x.a).length,0);
});

test('auditoría fallida revierte también cuotas y avisos locales',t=>{
 const x=setup(t);
 const audit=x.s.audit;
 x.s.audit=()=>{throw Error('Auditoría simulada fallida');};
 assert.throws(()=>x.s.addCharge(x.admin,x.a,{unitId:x.unit,period:'2026-12',concept:'Cuota',amountMinor:9900}),/Auditoría simulada/);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM charges').get().n,0);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM unit_notifications').get().n,0);
 x.s.audit=audit;
 x.s.addCharge(x.admin,x.a,{unitId:x.unit,period:'2026-12',concept:'Cuota',amountMinor:9900});
 assert.equal(x.s.notificationsFor(x.owner,x.a).length,1);
});

test('API no expone bandejas de terceros y restringe escritura y lectura',async t=>{
 const x=setup(t),app=createApp(x.s);
 app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(resolve=>app.close(resolve)));
 const host='http://127.0.0.1:'+app.address().port;
 const ask=async(path,method='GET',payload,token)=>{
   const res=await fetch(host+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
   return {status:res.status,body:await res.json()};
 };
 const tokens={};
 for(const who of ['admin','owner','outside','new-owner']){
   tokens[who]=(await ask('/api/login','POST',{email:who+'@example.test',password:pwd})).body.token;
   assert.ok(tokens[who]);
 }
 const root='/api/communities/'+x.a;
 assert.equal((await ask(root+'/notifications')).status,401);
 assert.equal((await ask(root+'/notifications','GET',null,tokens.outside)).status,404);
 assert.equal((await ask(root+'/units/'+x.unit+'/messages','POST',{title:'Aviso',body:'Probando'},tokens.owner)).status,403);
 assert.equal((await ask(root+'/units/'+x.unit+'/messages','POST',{title:'Hola',body:'Solo B-504'},tokens.admin)).status,201);
 const inbox=await ask(root+'/notifications','GET',null,tokens.owner);
 assert.equal(inbox.status,200);assert.equal(inbox.body.notifications.length,1);
 const notice=inbox.body.notifications[0];
 assert.equal((await ask(root+'/notifications','GET',null,tokens['new-owner'])).body.notifications.length,0);
 assert.equal((await ask(root+'/notifications/'+notice.id+'/read','PATCH',null,tokens['new-owner'])).status,404);
 assert.equal((await ask(root+'/notifications/'+notice.id+'/read','PATCH',null,tokens.owner)).status,200);
 assert.ok((await ask(root+'/notifications','GET',null,tokens.owner)).body.notifications[0].readAt);
 assert.equal((await ask('/api/communities/'+x.b+'/units/'+x.unit+'/messages','POST',{title:'Fuga',body:'Mal'},tokens.outside)).status,404);
});
