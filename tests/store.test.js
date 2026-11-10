import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, Problem } from '../server/store.js';
function fixture(){
  const s=new Store();
  const admin=s.createUser('admin@example.test','VeryStrongPassword#2026','Administración');
  const other=s.createUser('other@example.test','VeryStrongPassword#2026','Otro admin');
  const owner=s.createUser('owner@example.test','VeryStrongPassword#2026','Propietaria');
  const committee=s.createUser('committee@example.test','VeryStrongPassword#2026','Comité');
  const a=s.createCommunity('Comunidad A','',s.createAccount(admin,{name:'Comunidad A',kind:'independent'}).id),b=s.createCommunity('Comunidad B','',s.createAccount(admin,{name:'Comunidad B',kind:'independent'}).id);
  s.setMembership(admin,a,'admin');s.setMembership(other,b,'admin');s.setMembership(owner,a,'owner');s.setMembership(committee,a,'committee');
  const unitA=s.addUnit(admin,a,{code:'A-01',kind:'Departamento',resident:'Residente demo',ownerUserId:owner}).id;
  const unitB=s.addUnit(other,b,{code:'B-01',kind:'Casa',resident:'Residente demo'}).id;
  const unitOther=s.addUnit(admin,a,{code:'A-02',kind:'Departamento',resident:'Vecino demo'}).id;
  return {s,admin,other,owner,committee,a,b,unitA,unitB,unitOther};
}
test('autenticación robusta y sesión revocable',t=>{
  const {s}=fixture();t.after(()=>s.close());
  assert.equal(s.authenticate('admin@example.test','incorrect'),null);
  assert.equal(s.authenticate('unknown@example.test','incorrect'),null);
  const login=s.authenticate('ADMIN@example.test','VeryStrongPassword#2026');
  assert.ok(login.token.match(/^[a-f0-9]{64}$/));
  assert.equal(s.session(login.token).email,'admin@example.test');
  assert.equal(s.session('0'.repeat(64)),null);
  s.logout(login.token);assert.equal(s.session(login.token),null);
});
test('no hay fuga de datos de otra comunidad y tampoco se puede escribir',t=>{
  const {s,admin,owner,a,b,unitB}=fixture();t.after(()=>s.close());
  assert.equal(s.communitiesFor(admin).length,1);
  assert.throws(()=>s.overview(admin,b),/Comunidad no disponible/);
  assert.throws(()=>s.addPayment(admin,a,{unitId:unitB,reference:'XX-1',concept:'Pago',amountMinor:100}),/Unidad no disponible/);
  assert.throws(()=>s.addCharge(admin,a,{unitId:unitB,period:'2026-10',concept:'Cuota',amountMinor:100}),/Unidad no disponible/);
  assert.throws(()=>s.addAnnouncement(owner,a,{title:'Interferencia',body:'Intento'}),/Acceso no autorizado/);
});
test('propietario accede solamente a sus unidades y no puede editar',t=>{
  const {s,owner,admin,a,unitA,unitOther}=fixture();t.after(()=>s.close());
  s.addCharge(admin,a,{unitId:unitA,period:'2026-10',concept:'Común',amountMinor:9000});
  s.addCharge(admin,a,{unitId:unitOther,period:'2026-10',concept:'Común',amountMinor:11000});
  const o=s.overview(owner,a);
  assert.equal(o.units.length,1);assert.equal(o.charges.length,1);assert.equal(o.units[0].id,unitA);
  assert.equal(o.units[0].balanceMinor,9000);
  assert.throws(()=>s.addCharge(owner,a,{unitId:unitA,period:'2026-11',concept:'Común',amountMinor:9000}),/Acceso no autorizado/);
});
test('comité no recibe saldos ni movimientos financieros',t=>{
  const {s,committee,admin,a,unitA}=fixture();t.after(()=>s.close());
  s.addCharge(admin,a,{unitId:unitA,period:'2026-10',concept:'Común',amountMinor:9000});
  const res=s.overview(committee,a);
  assert.equal(res.charges.length,0);assert.equal(res.payments.length,0);
  assert.equal(res.units[0].balanceMinor,null);
  assert.throws(()=>s.addUnit(committee,a,{code:'NO',kind:'Casa'}),/Acceso no autorizado/);
});
test('cuotas idempotentes y pagos con referencia única conservan integridad',t=>{
  const {s,admin,a,unitA}=fixture();t.after(()=>s.close());
  const charge={unitId:unitA,period:'2026-10',concept:'Gasto común',amountMinor:12345};
  s.addCharge(admin,a,charge);
  assert.throws(()=>s.addCharge(admin,a,charge),/Cuota duplicada/);
  const payment={unitId:unitA,reference:'ABC-123',concept:'Abono',amountMinor:345};
  s.addPayment(admin,a,payment);
  assert.throws(()=>s.addPayment(admin,a,payment),/Referencia de pago duplicada/);
  const o=s.overview(admin,a);
  assert.equal(o.units.find(x=>x.id===unitA).balanceMinor,12000);
  assert.equal(o.charges.length,1);assert.equal(o.payments.length,1);
  assert.equal(o.audit.filter(x=>x.action==='payment.created').length,1);
});
test('rechaza importes y periodos mal formados',t=>{
  const {s,admin,a,unitA}=fixture();t.after(()=>s.close());
  for(const amountMinor of [0,-1,1.2,NaN,'100',Number.MAX_SAFE_INTEGER])assert.throws(()=>s.addCharge(admin,a,{unitId:unitA,period:'2026-10',concept:'Cuota',amountMinor}),Problem);
  for(const period of ['2026-13','mañana','202610'])assert.throws(()=>s.addCharge(admin,a,{unitId:unitA,period,concept:'Cuota',amountMinor:100}),Problem);
});
test('documentos privados filtrados por rol y auditable',t=>{
  const {s,admin,owner,committee,a}=fixture();t.after(()=>s.close());
  for(const scope of ['community','committee','admin'])s.addDocument(admin,a,{title:'Documento '+scope,category:'Prueba',scope});
  assert.equal(s.overview(admin,a).documents.length,3);
  assert.deepEqual(s.overview(owner,a).documents.map(x=>x.scope),['community']);
  assert.equal(s.overview(committee,a).documents.length,2);
  assert.equal(s.overview(admin,a).audit.filter(x=>x.action==='document.metadata_created').length,3);
});
test('verificación de validaciones de propiedad y email',t=>{
  const {s,admin,a,b,unitA}=fixture();t.after(()=>s.close());
  assert.throws(()=>s.createUser('not-email','VeryStrongPassword#2026'),Problem);
  assert.throws(()=>s.createUser('new@example.test','123'),Problem);
  assert.throws(()=>s.addUnit(admin,a,{code:'A-01',kind:'Casa'}),/La unidad ya existe/);
  assert.throws(()=>s.addUnit(admin,a,{code:'A-03',kind:'Casa',ownerUserId:'abc'}),/Propietario inválido/);
});
test('los registros sobreviven al cierre y reapertura de SQLite',async t=>{
  const {mkdtempSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const path=mkdtempSync(join(tmpdir(),'digi-test-'));t.after(()=>rmSync(path,{recursive:true,force:true}));
  const file=join(path,'condominio.sqlite');
  let s=new Store(file);
  const admin=s.createUser('persist@example.test','VeryStrongPassword#2026');
  const community=s.createCommunity('Prueba de persistencia','',s.createAccount(admin,{name:'Prueba de persistencia',kind:'independent'}).id);
  s.setMembership(admin,community,'admin');
  const unit=s.addUnit(admin,community,{code:'T-101',kind:'Casa'}).id;
  s.addCharge(admin,community,{unitId:unit,period:'2026-10',concept:'Común',amountMinor:12300});
  s.close();
  s=new Store(file);t.after(()=>s.close());
  const login=s.authenticate('persist@example.test','VeryStrongPassword#2026');
  assert.ok(login);
  const data=s.overview(login.user.id,community);
  assert.equal(data.units.length,1);assert.equal(data.charges.length,1);assert.equal(data.units[0].balanceMinor,12300);
});
