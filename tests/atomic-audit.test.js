import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../server/store.js';

test('si falla la auditoría, cargo y pago se revierten automáticamente', t => {
  const store = new Store(); t.after(() => store.close());
  const admin = store.createUser('admin@atomic.test','Segura-Longitud-2026-Excelente');
  const community = store.createCommunity('Comunidad prueba','',store.createAccount(admin,{name:'Comunidad prueba',kind:'independent'}).id);
  store.setMembership(admin, community, 'admin');
  const unit = store.addUnit(admin, community, {code:'A1',kind:'Departamento'}).id;
  const realAudit=store.audit;
  store.audit=()=>{throw new Error('Simulación de falla de auditoría');};
  assert.throws(()=>store.addCharge(admin,community,{unitId:unit,period:'2026-10',concept:'Cuota',amountMinor:10000}),/Simulación/);
  assert.throws(()=>store.addPayment(admin,community,{unitId:unit,reference:'Pago-1',concept:'Cuota',amountMinor:4000}),/Simulación/);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM charges').get().n,0);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM payments').get().n,0);
  store.audit=realAudit;
  const charge=store.addCharge(admin,community,{unitId:unit,period:'2026-10',concept:'Cuota',amountMinor:10000});
  const payment=store.addPayment(admin,community,{unitId:unit,reference:'Pago-1',concept:'Cuota',amountMinor:4000});
  assert.ok(charge.id && payment.id);
  assert.equal(store.overview(admin,community).units[0].balanceMinor,6000);
});

test('si falla la auditoría de anulación, el movimiento permanece activo', t => {
  const store=new Store();t.after(()=>store.close());
  const admin=store.createUser('admin2@atomic.test','Segura-Longitud-2026-Excelente');
  const community=store.createCommunity('Comunidad B','',store.createAccount(admin,{name:'Comunidad B',kind:'independent'}).id);store.setMembership(admin,community,'admin');
  const unit=store.addUnit(admin,community,{code:'B1',kind:'Casa'}).id;
  const charge=store.addCharge(admin,community,{unitId:unit,period:'2026-10',concept:'Cuota',amountMinor:3000}).id;
  const old=store.audit;store.audit=()=>{throw new Error('Error de auditoría simulado');};
  assert.throws(()=>store.reverseEntry(admin,community,'charge',charge,'Reversión administrativa'),/Error de auditoría/);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM reversals').get().n,0);
  assert.equal(store.overview(admin,community).units[0].balanceMinor,3000);
  store.audit=old;
  store.reverseEntry(admin,community,'charge',charge,'Reversión administrativa');
  assert.equal(store.overview(admin,community).units[0].balanceMinor,0);
});

test('importación por lotes puede revertir escrituras y auditorías juntas', t => {
  const s = new Store(); t.after(()=>s.close());
  const admin=s.createUser('admin3@atomic.test','Segura-Longitud-2026-Excelente');
  const community=s.createCommunity('Comunidad C','',s.createAccount(admin,{name:'Comunidad C',kind:'independent'}).id);s.setMembership(admin,community,'admin');
  s.db.exec('BEGIN IMMEDIATE');
  try {
    s.addUnit(admin,community,{code:'C-101',kind:'Casa'});
    s.addUnit(admin,community,{code:'C-102',kind:'Casa'});
    throw new Error('Simulación de fallo de importación');
  } catch (error) {
    assert.match(error.message,/Simulación/);
    s.db.exec('ROLLBACK');
  }
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM units WHERE community_id=?').get(community).n,0);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM audit_events WHERE community_id=?').get(community).n,0);
});
