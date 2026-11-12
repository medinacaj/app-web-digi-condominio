import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';
const pwd='Synthetic-Review-2026-NotReal!';
function fixture(t){
 const s=new Store();t.after(()=>s.close());
 const admin=s.createUser('review-admin@example.test',pwd),owner=s.createUser('review-owner@example.test',pwd);
 const other=s.createUser('review-other@example.test',pwd),committee=s.createUser('review-committee@example.test',pwd);
 const account=s.createAccount(admin,{name:'Administración',kind:'independent'}).id;
 const otherAccount=s.createAccount(other,{name:'Otra administración',kind:'independent'}).id;
 const community=s.createCommunity('Edificio A','',account),outside=s.createCommunity('Edificio B','',otherAccount);
 for(const [user,cid,role] of [[admin,community,'admin'],[owner,community,'owner'],[committee,community,'committee'],[other,outside,'admin']])s.setMembership(user,cid,role);
 const unit=s.addUnit(admin,community,{code:'B-504',kind:'Departamento',ownerUserId:owner}).id;
 const another=s.addUnit(admin,community,{code:'B-505',kind:'Departamento'}).id;
 const outsideUnit=s.addUnit(other,outside,{code:'B-504',kind:'Departamento'}).id;
 return {s,admin,owner,other,committee,community,outside,unit,another,outsideUnit};
}
const payment=(unitId,reference='REF-DEMO-123')=>({unitId,reference,concept:'Abono declarado por propietario',amountMinor:25000});
const decision=(action,note='Revisión administrativa en entorno ficticio')=>({action,note});
test('pago informado nunca descuenta saldos sin validación administrativa; fases auditadas',t=>{
 const x=fixture(t);
 x.s.addCharge(x.admin,x.community,{unitId:x.unit,period:'2026-11',concept:'Gastos comunes',amountMinor:40000,dueOn:'2026-11-20'});
 const rep=x.s.submitPaymentReport(x.owner,x.community,payment(x.unit));
 assert.equal(rep.status,'informado');
 assert.equal(rep.ledgerPosted,false);
 assert.equal(rep.bankReconciled,false);
 assert.equal(x.s.overview(x.owner,x.community).units[0].balanceMinor,40000);
 assert.equal(x.s.overview(x.owner,x.community).payments.length,0);
 assert.equal(x.s.paymentReportsFor(x.owner,x.community)[0].status,'informado');
 x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('review'));
 assert.equal(x.s.paymentReportsFor(x.owner,x.community)[0].status,'en_revision');
 assert.equal(x.s.overview(x.owner,x.community).units[0].balanceMinor,40000);
 const confirmed=x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('confirm'));
 assert.equal(confirmed.status,'confirmado');assert.equal(confirmed.ledgerPosted,true);assert.equal(confirmed.bankReconciled,false);
 assert.equal(x.s.overview(x.owner,x.community).units[0].balanceMinor,15000);
 assert.equal(x.s.overview(x.owner,x.community).payments.length,1);
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('confirm')),e=>e.status===409);
 const ledger=x.s.paymentReportsFor(x.admin,x.community)[0].ledgerPaymentId;
 assert.equal(x.s.overview(x.owner,x.community).payments[0].id,ledger);
 x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('reverse','Reversión administrativa justificada manualmente'));
 assert.equal(x.s.paymentReportsFor(x.owner,x.community)[0].status,'reversado');
 assert.equal(x.s.overview(x.owner,x.community).units[0].balanceMinor,40000);
 assert.equal(x.s.overview(x.owner,x.community).payments[0].reversed,1);
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('reverse')),e=>e.status===409);
 const events=x.s.db.prepare('SELECT action,note FROM payment_report_events WHERE report_id=? ORDER BY rowid').all(rep.id);
 assert.deepEqual(events.map(x=>x.action),['informado','review','confirm','reverse']);
 assert.equal(events[2].note,'Revisión administrativa en entorno ficticio');
 assert.doesNotMatch(JSON.stringify(x.s.notificationsFor(x.owner,x.community)),/REF-DEMO-123|Revisión administrativa en entorno ficticio/);
});
test('rechazar bloquea ledger y transiciones inválidas',t=>{
 const x=fixture(t),rep=x.s.submitPaymentReport(x.owner,x.community,payment(x.unit));
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('confirm')),e=>e.status===409);
 x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('review'));
 x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('reject','No hay constancia suficiente del pago'));
 assert.equal(x.s.paymentReportsFor(x.owner,x.community)[0].status,'rechazado');
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM payments').get().n,0);
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('review')),e=>e.status===409);
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('reverse')),e=>e.status===409);
});
test('nunca acepta pagos de unidades ajenas ni permite forzar roles o estados',t=>{
 const x=fixture(t);
 for(const body of [
  {...payment(x.unit),status:'confirmado'},
  {...payment(x.unit),userId:x.admin},
  {...payment(x.unit),bankReconciled:true},
  {...payment(x.unit),amountMinor:0},
  {...payment(x.unit),amountMinor:-2},
  {...payment(x.unit),amountMinor:'25000'},
  {...payment(x.unit),reference:''}
 ])assert.throws(()=>x.s.submitPaymentReport(x.owner,x.community,body),e=>e.status===400);
 assert.throws(()=>x.s.submitPaymentReport(x.admin,x.community,payment(x.unit)),e=>e.status===403);
 assert.throws(()=>x.s.submitPaymentReport(x.committee,x.community,payment(x.unit)),e=>e.status===403);
 assert.throws(()=>x.s.submitPaymentReport(x.owner,x.community,payment(x.another)),e=>e.status===404);
 assert.throws(()=>x.s.submitPaymentReport(x.owner,x.community,payment(x.outsideUnit)),e=>e.status===404);
 assert.throws(()=>x.s.submitPaymentReport(x.other,x.outside,payment(x.unit)),e=>e.status===403);
 const rep=x.s.submitPaymentReport(x.owner,x.community,payment(x.unit));
 assert.throws(()=>x.s.submitPaymentReport(x.owner,x.community,payment(x.unit)),e=>e.status===409);
 assert.throws(()=>x.s.decidePaymentReport(x.owner,x.community,rep.id,decision('review')),e=>e.status===403);
 assert.throws(()=>x.s.decidePaymentReport(x.other,x.outside,rep.id,decision('review')),e=>e.status===404);
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,{action:'review',note:'Correcto',status:'confirmado'}),e=>e.status===400);
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('review','breve')),e=>e.status===400);
 assert.throws(()=>x.s.paymentReportsFor(x.committee,x.community),e=>e.status===403);
 assert.throws(()=>x.s.paymentReportsFor(x.other,x.community),e=>e.status===404);
});
test('transferencia de unidad revoca acceso a reportes antiguos',t=>{
 const x=fixture(t);
 const rep=x.s.submitPaymentReport(x.owner,x.community,payment(x.unit));
 assert.equal(x.s.paymentReportsFor(x.owner,x.community).length,1);
 x.s.assignUnitOwner(x.admin,x.community,x.unit,null);
 assert.deepEqual(x.s.paymentReportsFor(x.owner,x.community),[]);
 assert.equal(x.s.paymentReportsFor(x.admin,x.community)[0].id,rep.id);
});
test('fallos de auditoría y colisiones de referencia conservan saldos y eventos coherentes',t=>{
 const x=fixture(t),rep=x.s.submitPaymentReport(x.owner,x.community,payment(x.unit));
 const original=x.s.audit;x.s.audit=()=>{throw Error('Auditoría ficticia interrumpida');};
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('review')),/Auditoría ficticia/);
 assert.equal(x.s.paymentReportsFor(x.owner,x.community)[0].status,'informado');
 x.s.audit=original;
 x.s.addPayment(x.admin,x.community,{unitId:x.unit,reference:'REF-DEMO-123',concept:'Abono duplicado',amountMinor:10000});
 x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('review'));
 assert.throws(()=>x.s.decidePaymentReport(x.admin,x.community,rep.id,decision('confirm')),e=>e.status===409);
 assert.equal(x.s.paymentReportsFor(x.admin,x.community)[0].status,'en_revision');
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM payments').get().n,1);
 assert.equal(x.s.db.prepare("SELECT COUNT(*) n FROM payment_report_events WHERE action='confirm'").get().n,0);
});
test('HTTP informes aislados y decisión administrativa no equivale a confirmación bancaria',async t=>{
 const x=fixture(t),app=createApp(x.s);
 app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(done=>app.close(done)));
 const host='http://127.0.0.1:'+app.address().port;
 const call=async(path,method='GET',payload,token)=>{
   const res=await fetch(host+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
   return {status:res.status,body:await res.json(),cache:res.headers.get('cache-control')};
 };
 const tokens={};
 for(const [role,email] of [['owner','review-owner@example.test'],['admin','review-admin@example.test'],['other','review-other@example.test']]){
   tokens[role]=(await call('/api/login','POST',{email,password:pwd})).body.token;
 }
 const endpoint='/api/communities/'+x.community+'/payment-reports';
 assert.equal((await call(endpoint)).status,401);
 assert.equal((await call(endpoint,'GET',null,tokens.other)).status,404);
 assert.equal((await call(endpoint,'POST',payment(x.unit),tokens.admin)).status,403);
 const report=await call(endpoint,'POST',payment(x.unit),tokens.owner);
 assert.equal(report.status,201);assert.equal(report.cache,'no-store');
 assert.equal(report.body.ledgerPosted,false);
 assert.equal((await call(endpoint,'GET',null,tokens.owner)).body.reports.length,1);
 const decisionPath=endpoint+'/'+report.body.id+'/decision';
 assert.equal((await call(decisionPath,'POST',decision('review'),tokens.owner)).status,403);
 assert.equal((await call(decisionPath,'POST',decision('review'),tokens.admin)).body.status,'en_revision');
 const confirmed=await call(decisionPath,'POST',decision('confirm'),tokens.admin);
 assert.equal(confirmed.status,200);assert.equal(confirmed.body.bankReconciled,false);
 assert.equal(x.s.overview(x.owner,x.community).payments.length,1);
});
