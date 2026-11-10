import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../server/store.js';

test('suscripción se configura por operador; estado y auditoría se guardan juntos',async t=>{
  const s=new Store();t.after(()=>s.close());
  const admin=s.createUser('admin@billing.test','BillingTestPassword123!');
  const account=s.createAccount(admin,{name:'Cliente',kind:'independent'}).id;
  const {Subscriptions}=await import('../server/subscriptions.js');
  const billing=new Subscriptions(s);
  assert.deepEqual(billing.get(account),{status:'unconfigured',plan:null,expiresAt:null});
  billing.set(account,{plan:'piloto',status:'trial',expiresAt:'2027-01-01T00:00:00.000Z'});
  assert.equal(billing.get(account).status,'trial');
  assert.equal(billing.get(account).plan,'piloto');
  assert.equal(s.db.prepare('SELECT count(*) n FROM subscription_events').get().n,1);
  s.db.exec("CREATE TRIGGER fail_subscription_audit BEFORE INSERT ON subscription_events BEGIN SELECT RAISE(ABORT,'audit failure'); END");
  assert.throws(()=>billing.set(account,{plan:'otro',status:'active'}),/audit failure/);
  assert.equal(billing.get(account).status,'trial');
  assert.equal(billing.get(account).plan,'piloto');
});
test('suscripción no inventa pagos ni permite estados o fechas inválidas',async t=>{
  const s=new Store();t.after(()=>s.close());
  const admin=s.createUser('admin@billing.test','BillingTestPassword123!');
  const account=s.createAccount(admin,{name:'Cliente',kind:'independent'}).id;
  const {Subscriptions}=await import('../server/subscriptions.js');const billing=new Subscriptions(s);
  for(const config of [{plan:'',status:'active'},{plan:'test',status:'paid'},{plan:'test',status:'active',expiresAt:'not a date'}])assert.throws(()=>billing.set(account,config));
  assert.throws(()=>billing.get('missing'));
  assert.equal(billing.get(account).status,'unconfigured');
});
