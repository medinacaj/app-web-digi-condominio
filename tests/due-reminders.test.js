import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';
import { strictUtcDay, addUtcDays } from '../server/due-calendar.js';

const password='SyntheticReminderPassword-2026!';
const quoted={period:'2026-11',concept:'Gastos comunes DEMO',amountMinor:25000};
function setup(t){
 const s=new Store();t.after(()=>s.close());
 const admin=s.createUser('reminder-admin@example.test',password,'Administración DEMO');
 const owner=s.createUser('reminder-owner@example.test',password,'Propietario DEMO');
 const outsider=s.createUser('reminder-other@example.test',password,'Otro operador DEMO');
 const committee=s.createUser('reminder-committee@example.test',password,'Comité DEMO');
 const a=s.createCommunity('A','',s.createAccount(admin,{name:'Cuenta A',kind:'independent'}).id);
 const b=s.createCommunity('B','',s.createAccount(outsider,{name:'Cuenta B',kind:'independent'}).id);
 for(const [user,community,role] of [[admin,a,'admin'],[owner,a,'owner'],[committee,a,'committee'],[outsider,b,'admin']])s.setMembership(user,community,role);
 const unit=s.addUnit(admin,a,{code:'T-B-504',kind:'Departamento',ownerUserId:owner}).id;
 const noOwner=s.addUnit(admin,a,{code:'T-B-505',kind:'Departamento'}).id;
 const foreign=s.addUnit(outsider,b,{code:'T-B-504',kind:'Departamento'}).id;
 return {s,admin,owner,outsider,committee,a,b,unit,noOwner,foreign};
}
function charge(x,unitId=x.unit,dueOn='2026-11-15',rest={}){
 return x.s.addCharge(x.admin,x.a,{unitId,...quoted,dueOn,...rest});
}
test('calendario UTC exige fechas reales y considera años bisiestos',()=>{
 assert.equal(strictUtcDay('2028-02-29'),'2028-02-29');
 for(const date of ['2027-02-29','2026-04-31','2026-13-01','2026-01-00','2026-1-01','2026-01-01T00:00:00Z','2026-02-30','2099-02-29']){
   assert.equal(strictUtcDay(date),null,date);
 }
 assert.equal(addUtcDays('2028-02-27',2),'2028-02-29');
 assert.equal(addUtcDays('2028-02-28',5),'2028-03-04');
 assert.throws(()=>addUtcDays('2028-02-30',1));
});

test('cuotas sin fecha explícita no generan recordatorios',t=>{
 const x=setup(t);
 x.s.addCharge(x.admin,x.a,{unitId:x.unit,...quoted});
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').pending,0);
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-11-12').created,0);
 assert.equal(x.s.overview(x.owner,x.a).charges[0].dueOn,null);
 assert.equal(x.s.notificationsFor(x.owner,x.a).length,1); // Solo aviso de emisión de cuota.
});

test('ventana de cinco días, importe no expuesto y preparación manual idempotente',t=>{
 const x=setup(t);
 const c=charge(x,x.unit,'2026-11-18');
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').pending,0); // Seis días.
 const preview=x.s.previewDueReminders(x.admin,x.a,'2026-11-13');
 assert.equal(preview.pending,1);
 assert.equal(preview.eligible[0].stage,'upcoming');
 assert.equal(preview.eligible[0].dueOn,'2026-11-18');
 assert.equal(preview.eligible[0].balanceMinor,25000);
 assert.ok(!Object.hasOwn(preview.eligible[0],'sourceId'));
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-11-13').created,1);
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-11-14').created,0);
 const notices=x.s.notificationsFor(x.owner,x.a);
 assert.equal(notices.filter(x=>x.title==='Recordatorio próximo vencimiento').length,1);
 assert.doesNotMatch(JSON.stringify(notices),/25000|reminder:|Cuenta A|@example.test/);
 assert.equal(x.s.overview(x.owner,x.a).charges[0].dueOn,'2026-11-18');
 assert.ok(c.id);
});

test('pago manual completo, reverso y cuota anulada controlan elegibilidad',t=>{
 const x=setup(t);
 const c=charge(x,x.unit,'2026-11-10');
 const payment=x.s.addPayment(x.admin,x.a,{unitId:x.unit,reference:'DEMO-REF-1',concept:'Abono manual',amountMinor:25000});
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').pending,0);
 x.s.reverseEntry(x.admin,x.a,'payment',payment.id,'Abono duplicado de demostración');
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').pending,1);
 x.s.reverseEntry(x.admin,x.a,'charge',c.id,'Cargo generado por error de demostración');
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').pending,0);
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-11-12').created,0);
});

test('una unidad solo genera un recordatorio por fase y vencimiento, sin avisar a unidades sin dueño',t=>{
 const x=setup(t);
 charge(x,x.unit,'2026-11-15');
 charge(x,x.unit,'2026-11-17',{concept:'Fondo de reserva'});
 charge(x,x.noOwner,'2026-11-15',{concept:'Unidad sin propietario'});
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').eligible.length,1);
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-11-12').created,1);
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-11-16').created,1); // Próximo->vencido.
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-11-20').created,0);
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-12-02').created,1); // Cadencia máxima mensual.
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-12-20').created,0);
 const messages=x.s.notificationsFor(x.owner,x.a).filter(x=>/Recordatorio próximo|Revisión de saldo/.test(x.title));
 assert.equal(messages.length,3);
 assert.ok(messages.every(n=>!n.body.includes('confirmado')));
});

test('cambio de propietario o membresía revocada evita destinatarios inactivos',t=>{
 const x=setup(t);
 charge(x,x.unit,'2026-11-10');
 x.s.assignUnitOwner(x.admin,x.a,x.unit,null);
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').pending,0);
 x.s.assignUnitOwner(x.admin,x.a,x.unit,x.owner);
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').pending,1);
 x.s.changeCommunityMember(x.admin,x.a,x.owner,null);
 assert.equal(x.s.previewDueReminders(x.admin,x.a,'2026-11-12').pending,0);
});

test('solo administrador autorizado consulta y prepara sin permitir fecha arbitraria desde API',t=>{
 const x=setup(t);
 charge(x,x.unit,'2026-11-15');
 assert.throws(()=>x.s.previewDueReminders(x.owner,x.a,'2026-11-12'),e=>e.status===403);
 assert.throws(()=>x.s.prepareDueReminders(x.committee,x.a,'2026-11-12'),e=>e.status===403);
 assert.throws(()=>x.s.previewDueReminders(x.outsider,x.a,'2026-11-12'),e=>e.status===404);
 assert.throws(()=>x.s.previewDueReminders(x.admin,x.b,'2026-11-12'),e=>e.status===404);
 assert.throws(()=>x.s.previewDueReminders(x.admin,x.a,'2026-02-30'),e=>e.status===400);
});

test('fallo de auditoría revierte batch entero de notificaciones internas',t=>{
 const x=setup(t);
 charge(x,x.unit,'2026-11-10');
 const old=x.s.audit;
 x.s.audit=()=>{throw new Error('Auditoría temporalmente caída');};
 assert.throws(()=>x.s.prepareDueReminders(x.admin,x.a,'2026-11-12'),/Auditoría temporalmente caída/);
 assert.equal(x.s.db.prepare("SELECT COUNT(*) n FROM unit_notifications WHERE source_id LIKE 'reminder:%'").get().n,0);
 x.s.audit=old;
 assert.equal(x.s.prepareDueReminders(x.admin,x.a,'2026-11-12').created,1);
 assert.equal(x.s.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='reminder.inapp_batch'").get().n,1);
});

test('HTTP: endpoints restringidos, respuesta sin caché y cero comunicaciones externas',async t=>{
 const x=setup(t),app=createApp(x.s);
 app.listen(0,'127.0.0.1');await once(app,'listening');t.after(()=>new Promise(done=>app.close(done)));
 const base='http://127.0.0.1:'+app.address().port;
 const ask=async(path,method='GET',payload,token)=>{
   const res=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
   return {status:res.status,body:await res.json(),cache:res.headers.get('cache-control')};
 };
 const tokens={};
 for(const [name,email] of [['admin','reminder-admin@example.test'],['owner','reminder-owner@example.test'],['outsider','reminder-other@example.test']]){
   tokens[name]=(await ask('/api/login','POST',{email,password})).body.token;
 }
 x.s.addCharge(x.admin,x.a,{unitId:x.unit,period:'2026-01',concept:'Factura con fecha pasada',amountMinor:30000,dueOn:'2026-01-10'});
 const root='/api/communities/'+x.a+'/reminders';
 assert.equal((await ask(root+'/preview')).status,401);
 assert.equal((await ask(root+'/preview','GET',null,tokens.owner)).status,403);
 assert.equal((await ask(root+'/preview','GET',null,tokens.outsider)).status,404);
 assert.equal((await ask(root+'/prepare','GET',null,tokens.admin)).status,405);
 const prev=await ask(root+'/preview','GET',null,tokens.admin);
 assert.equal(prev.status,200);assert.equal(prev.cache,'no-store');
 assert.equal(prev.body.pending,1);
 const result=await ask(root+'/prepare','POST',null,tokens.admin);
 assert.equal(result.status,201);assert.equal(result.body.created,1);
 assert.equal(result.body.externalMessagesSent,0);
 assert.equal((await ask(root+'/prepare','POST',null,tokens.admin)).body.created,0);
 const inbox=await ask('/api/communities/'+x.a+'/notifications','GET',null,tokens.owner);
 assert.equal(inbox.status,200);
 assert.equal(inbox.body.notifications.filter(n=>n.title==='Revisión de saldo y vencimiento').length,1);
});
