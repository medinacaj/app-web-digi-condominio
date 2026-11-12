import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';

const pwd='OnlySyntheticAllocationPassword2026#';
function setup(t){
 const s=new Store();t.after(()=>s.close());
 const admin=s.createUser('allocation-admin@example.test',pwd);
 const owner=s.createUser('allocation-owner@example.test',pwd);
 const nextOwner=s.createUser('allocation-new@example.test',pwd);
 const foreign=s.createUser('allocation-foreign@example.test',pwd);
 const committee=s.createUser('allocation-committee@example.test',pwd);
 const account=s.createAccount(admin,{name:'Administración DEMO A',kind:'independent'}).id;
 const accountB=s.createAccount(foreign,{name:'Administración DEMO B',kind:'independent'}).id;
 const a=s.createCommunity('Comunidad DEMO A','',account);
 const b=s.createCommunity('Comunidad DEMO B','',accountB);
 for(const [id,community,role] of [[admin,a,'admin'],[owner,a,'owner'],[nextOwner,a,'owner'],[committee,a,'committee'],[foreign,b,'admin']])
   s.setMembership(id,community,role);
 const unit=s.addUnit(admin,a,{code:'A-101',kind:'Departamento',ownerUserId:owner}).id;
 const other=s.addUnit(admin,a,{code:'A-102',kind:'Departamento'}).id;
 const external=s.addUnit(foreign,b,{code:'B-101',kind:'Departamento'}).id;
 return {s,admin,owner,nextOwner,foreign,committee,a,b,unit,other,external};
}
const charge=(x,unitId=x.unit,period='2026-11',amountMinor=5000)=>x.s.addCharge(x.admin,x.a,{unitId,period,concept:'Cuota '+period,amountMinor,dueOn:period+'-20'}).id;
const payment=(x,unitId=x.unit,reference='DEMO-TRANSFER-1',amountMinor=5000)=>x.s.addPayment(x.admin,x.a,{unitId,reference,concept:'Pago registrado manualmente',amountMinor}).id;
const request=(unitId,chargeId,paymentId,amountMinor)=>({unitId,chargeId,paymentId,amountMinor});

test('imputación parcial respeta los límites sin cambiar el saldo neto de la unidad',t=>{
 const x=setup(t),c=charge(x),p=payment(x);
 assert.equal(x.s.overview(x.owner,x.a).units[0].balanceMinor,0);
 const result=x.s.allocatePayment(x.admin,x.a,request(x.unit,c,p,2000));
 assert.equal(result.created,true);assert.equal(result.bankReconciled,false);
 const snap=x.s.allocationSnapshot(x.owner,x.a,x.unit);
 assert.equal(snap.charges[0].remainingMinor,3000);
 assert.equal(snap.charges[0].allocatedMinor,2000);
 assert.equal(snap.payments[0].unallocatedMinor,3000);
 assert.equal(snap.payments[0].allocatedMinor,2000);
 assert.equal(snap.bankReconciled,false);
 assert.equal(snap.openChargesMinor,3000);
 assert.equal(snap.unallocatedPaymentsMinor,3000);
 assert.equal(x.s.overview(x.owner,x.a).units[0].balanceMinor,0);
 assert.throws(()=>x.s.allocatePayment(x.admin,x.a,request(x.unit,c,p,1000)),e=>e.status===409);
 assert.equal(x.s.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='payment.allocated'").get().n,1);
});
test('un pago puede cubrir parcialmente dos cuotas y rechaza exceso de dinero o cuota',t=>{
 const x=setup(t),c1=charge(x),c2=charge(x,x.unit,'2026-12',3000),p=payment(x,x.unit,'DEMO-TRANSFER-2',7000);
 x.s.allocatePayment(x.admin,x.a,request(x.unit,c1,p,5000));
 x.s.allocatePayment(x.admin,x.a,request(x.unit,c2,p,2000));
 const snapshot=x.s.allocationSnapshot(x.admin,x.a,x.unit);
 assert.equal(snapshot.openChargesMinor,1000);
 assert.equal(snapshot.unallocatedPaymentsMinor,0);
 assert.equal(snapshot.allocations.length,2);
 const p2=payment(x,x.unit,'DEMO-TRANSFER-3',5000);
 assert.throws(()=>x.s.allocatePayment(x.admin,x.a,request(x.unit,c2,p2,1500)),e=>e.status===409);
 x.s.allocatePayment(x.admin,x.a,request(x.unit,c2,p2,1000));
 assert.equal(x.s.allocationSnapshot(x.admin,x.a,x.unit).openChargesMinor,0);
 assert.equal(x.s.allocationSnapshot(x.admin,x.a,x.unit).unallocatedPaymentsMinor,4000);
});
test('ni unidades ajenas ni saldos reversados se pueden imputar; consulta queda aislada',t=>{
 const x=setup(t),c=charge(x),p=payment(x),otherCharge=charge(x,x.other,'2026-10',1000);
 assert.throws(()=>x.s.allocatePayment(x.owner,x.a,request(x.unit,c,p,1000)),e=>e.status===403);
 assert.throws(()=>x.s.allocatePayment(x.committee,x.a,request(x.unit,c,p,1000)),e=>e.status===403);
 assert.throws(()=>x.s.allocatePayment(x.admin,x.a,request(x.unit,otherCharge,p,1000)),e=>e.status===404);
 assert.throws(()=>x.s.allocatePayment(x.foreign,x.b,request(x.unit,c,p,1000)),e=>e.status===404);
 assert.throws(()=>x.s.allocationSnapshot(x.owner,x.a,x.other),e=>e.status===404);
 assert.throws(()=>x.s.allocationSnapshot(x.committee,x.a,x.unit),e=>e.status===403);
 assert.throws(()=>x.s.allocationSnapshot(x.foreign,x.b,x.unit),e=>e.status===404);
 x.s.reverseEntry(x.admin,x.a,'payment',p,'Reverso administrativo de prueba de abono');
 assert.throws(()=>x.s.allocatePayment(x.admin,x.a,request(x.unit,c,p,1000)),e=>e.status===404);
});
test('reversar cargo libera abono asignado para reasignarlo; reversar pago lo invalida',t=>{
 const x=setup(t),c=charge(x),c2=charge(x,x.unit,'2026-12',5000),p=payment(x);
 x.s.allocatePayment(x.admin,x.a,request(x.unit,c,p,4000));
 assert.equal(x.s.allocationSnapshot(x.owner,x.a,x.unit).unallocatedPaymentsMinor,1000);
 x.s.reverseEntry(x.admin,x.a,'charge',c,'Cuota duplicada de test con reverso justificado');
 let result=x.s.allocationSnapshot(x.owner,x.a,x.unit);
 assert.equal(result.allocations.length,0);
 assert.equal(result.unallocatedPaymentsMinor,5000);
 assert.equal(result.openChargesMinor,5000);
 x.s.allocatePayment(x.admin,x.a,request(x.unit,c2,p,5000));
 result=x.s.allocationSnapshot(x.owner,x.a,x.unit);
 assert.equal(result.allocations.length,1);
 assert.equal(result.openChargesMinor,0);
 x.s.reverseEntry(x.admin,x.a,'payment',p,'Reverso de prueba por operación administrativa incorrecta');
 result=x.s.allocationSnapshot(x.owner,x.a,x.unit);
 assert.equal(result.payments.length,0);
 assert.equal(result.openChargesMinor,5000);
 assert.equal(result.allocations.length,0);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM payment_allocations').get().n,2);
});
test('cambio del titular revoca consulta del anterior sin transferir mensajes ni movimientos ajenos',t=>{
 const x=setup(t),c=charge(x),p=payment(x);
 x.s.allocatePayment(x.admin,x.a,request(x.unit,c,p,3000));
 x.s.assignUnitOwner(x.admin,x.a,x.unit,x.nextOwner);
 assert.throws(()=>x.s.allocationSnapshot(x.owner,x.a,x.unit),e=>e.status===404);
 assert.equal(x.s.allocationSnapshot(x.nextOwner,x.a,x.unit).allocations.length,1);
 assert.equal(x.s.allocationSnapshot(x.admin,x.a,x.unit).allocations.length,1);
});
test('valida enteros en unidades menores y no permite atributos ni IDs manipulados',t=>{
 const x=setup(t),c=charge(x),p=payment(x);
 const invalid=[
  {...request(x.unit,c,p,1000),bankReconciled:true},
  {...request(x.unit,c,p,1000),ownerUserId:x.owner},
  request(x.unit,c,p,0),
  request(x.unit,c,p,-1),
  request(x.unit,c,p,1000.5),
  request(x.unit,c,p,'1000')
 ];
 for(const data of invalid)assert.throws(()=>x.s.allocatePayment(x.admin,x.a,data),e=>e.status===400);
 assert.throws(()=>x.s.allocatePayment(x.admin,x.a,request(x.unit,'bad!',p,100)),e=>e.status===404);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM payment_allocations').get().n,0);
});
test('un fallo de auditoría revierte la imputación y permite reintentar correctamente',t=>{
 const x=setup(t),c=charge(x),p=payment(x);
 const audit=x.s.audit;x.s.audit=()=>{throw Error('Synthetic audit outage');};
 assert.throws(()=>x.s.allocatePayment(x.admin,x.a,request(x.unit,c,p,1000)),/Synthetic audit outage/);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM payment_allocations').get().n,0);
 x.s.audit=audit;
 assert.equal(x.s.allocatePayment(x.admin,x.a,request(x.unit,c,p,1000)).created,true);
});
test('trigger de base rechaza referencias cruzadas aunque se intente saltar la API',t=>{
 const x=setup(t),c=charge(x),p=payment(x),other=charge(x,x.other,'2026-10',5000);
 assert.throws(()=>x.s.db.prepare('INSERT INTO payment_allocations VALUES (?,?,?,?,?,?,?,?)')
  .run('invalid-1',x.a,x.unit,p,other,100,x.admin,new Date().toISOString()),/scope mismatch/);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM payment_allocations').get().n,0);
});
test('API HTTP aísla propietarios y solo admite escritura por administrador con referencias propias',async t=>{
 const x=setup(t),c=charge(x),p=payment(x);
 const app=createApp(x.s);app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(resolve=>app.close(resolve)));
 const host='http://127.0.0.1:'+app.address().port;
 const ask=async(path,method='GET',payload,token)=>{
  const res=await fetch(host+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
  return {status:res.status,body:await res.json(),cache:res.headers.get('cache-control')};
 };
 const tokens={};
 for(const [key,email] of [['admin','allocation-admin@example.test'],['owner','allocation-owner@example.test'],['foreign','allocation-foreign@example.test'],['committee','allocation-committee@example.test']]){
  tokens[key]=(await ask('/api/login','POST',{email,password:pwd})).body.token;
 }
 const path='/api/communities/'+x.a+'/units/'+x.unit+'/allocations';
 assert.equal((await ask(path)).status,401);
 assert.equal((await ask(path,'GET',null,tokens.committee)).status,403);
 assert.equal((await ask(path,'GET',null,tokens.foreign)).status,404);
 assert.equal((await ask(path,'POST',{chargeId:c,paymentId:p,amountMinor:1000},tokens.owner)).status,403);
 assert.equal((await ask(path,'POST',{chargeId:c,paymentId:p,amountMinor:1000,unitId:x.other},tokens.admin)).status,400);
 const result=await ask(path,'POST',{chargeId:c,paymentId:p,amountMinor:1000},tokens.admin);
 assert.equal(result.status,201);assert.equal(result.body.bankReconciled,false);assert.equal(result.cache,'no-store');
 assert.equal((await ask(path,'POST',{chargeId:c,paymentId:p,amountMinor:1000},tokens.admin)).status,409);
 const snap=await ask(path,'GET',null,tokens.owner);
 assert.equal(snap.status,200);assert.equal(snap.cache,'no-store');
 assert.equal(snap.body.charges[0].remainingMinor,4000);
 assert.equal(snap.body.payments[0].unallocatedMinor,4000);
 assert.equal(snap.body.bankReconciled,false);
});
