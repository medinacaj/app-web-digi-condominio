import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';

function setup(t){
  const s=new Store();t.after(()=>s.close());
  const admin=s.createUser('admin@owners.test','VeryStrongPassword#2026');
  const owner1=s.createUser('owner1@owners.test','VeryStrongPassword#2026','Uno');
  const owner2=s.createUser('owner2@owners.test','VeryStrongPassword#2026','Dos');
  const outsider=s.createUser('outside@owners.test','VeryStrongPassword#2026');
  const committee=s.createUser('committee@owners.test','VeryStrongPassword#2026');
  const a=s.createCommunity('Residencial A'),b=s.createCommunity('Residencial B');
  for(const [user,community,role] of [[admin,a,'admin'],[owner1,a,'owner'],[owner2,a,'owner'],[outsider,b,'owner'],[committee,a,'committee']])s.setMembership(user,community,role);
  const unit=s.addUnit(admin,a,{code:'A101',kind:'Departamento'}).id;
  return {s,admin,owner1,owner2,outsider,committee,a,b,unit};
}

test('vinculación de propietario permite asignar, cambiar y revocar sin perder trazabilidad',t=>{
  const {s,admin,owner1,owner2,outsider,committee,a,b,unit}=setup(t);
  assert.deepEqual(s.membersFor(admin,a).filter(x=>x.role==='owner').map(x=>x.displayName),['Dos','Uno']);
  assert.throws(()=>s.membersFor(owner1,a),x=>x.status===403);
  assert.throws(()=>s.assignUnitOwner(committee,a,unit,owner1),x=>x.status===403);
  assert.throws(()=>s.assignUnitOwner(admin,a,unit,outsider),x=>x.status===400);
  assert.throws(()=>s.assignUnitOwner(admin,b,unit,owner1),x=>x.status===404);
  assert.throws(()=>s.assignUnitOwner(admin,a,'bad-uuid',owner1),x=>x.status===404);
  s.assignUnitOwner(admin,a,unit,owner1);
  assert.deepEqual(s.overview(owner1,a).units.map(x=>x.id),[unit]);
  assert.equal(s.overview(owner2,a).units.length,0);
  assert.throws(()=>s.assignUnitOwner(admin,a,unit,owner1),x=>x.status===409);
  s.assignUnitOwner(admin,a,unit,owner2);
  assert.equal(s.overview(owner1,a).units.length,0);
  assert.deepEqual(s.overview(owner2,a).units.map(x=>x.id),[unit]);
  s.assignUnitOwner(admin,a,unit,null);
  assert.equal(s.overview(owner2,a).units.length,0);
  const events=s.overview(admin,a).ownerChanges;
  assert.equal(events.length,3);assert.equal(events[0].previousOwner,'Dos');assert.equal(events[0].newOwner,null);
  assert.equal(s.overview(owner1,a).ownerChanges.length,0);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='unit.owner_changed'").get().n,3);
});

test('asignación y evento se revierten juntos si la auditoría falla',t=>{
  const {s,admin,owner1,a,unit}=setup(t);
  const orig=s.audit;s.audit=()=>{throw new Error('Simulación de falla');};
  assert.throws(()=>s.assignUnitOwner(admin,a,unit,owner1),/Simulación/);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM unit_owner_events').get().n,0);
  assert.equal(s.db.prepare('SELECT owner_user_id FROM units WHERE id=?').get(unit).owner_user_id,null);
  s.audit=orig;s.assignUnitOwner(admin,a,unit,owner1);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM unit_owner_events').get().n,1);
});

test('API solo permite administrador ver miembros y cambiar propietario',async t=>{
  const {s,admin,owner1,committee,a,b,unit}=setup(t);
  const app=createApp(s);app.listen(0,'127.0.0.1');await once(app,'listening');
  t.after(()=>new Promise(done=>app.close(done)));
  const origin=`http://127.0.0.1:${app.address().port}`;
  const ask=async(path,method='GET',body,token)=>{
    const r=await fetch(origin+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:r.status,data:await r.json()};
  };
  const adminToken=(await ask('/api/login','POST',{email:'admin@owners.test',password:'VeryStrongPassword#2026'})).data.token;
  const ownerToken=(await ask('/api/login','POST',{email:'owner1@owners.test',password:'VeryStrongPassword#2026'})).data.token;
  const path=`/api/communities/${a}/members`;
  assert.equal((await ask(path)).status,401);
  assert.equal((await ask(path,'GET',null,ownerToken)).status,403);
  assert.equal((await ask(path,'GET',null,adminToken)).data.members.length,4);
  const ownerPath=`/api/communities/${a}/units/${unit}/owner`;
  assert.equal((await ask(ownerPath,'PATCH',{ownerUserId:owner1},ownerToken)).status,403);
  assert.equal((await ask(ownerPath,'PATCH',{ownerUserId:owner1},adminToken)).status,200);
  assert.equal((await ask(ownerPath,'PATCH',{ownerUserId:owner1},adminToken)).status,409);
  assert.equal((await ask(ownerPath,'PATCH',{ownerUserId:null},adminToken)).status,200);
  assert.equal((await ask(`/api/communities/${b}/members`,'GET',null,adminToken)).status,404);
});
