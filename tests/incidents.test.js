import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store, Problem } from '../server/store.js';
import { createApp } from '../server/app.js';

function fixture(t){
  const s=new Store(); t.after(()=>s.close());
  const admin=s.createUser('admin@incidencias.test','Secret0MuyLargo!2026');
  const committee=s.createUser('committee@incidencias.test','Secret0MuyLargo!2026');
  const ownerA=s.createUser('ownera@incidencias.test','Secret0MuyLargo!2026');
  const ownerB=s.createUser('ownerb@incidencias.test','Secret0MuyLargo!2026');
  const outsider=s.createUser('outsider@incidencias.test','Secret0MuyLargo!2026');
  const community=s.createCommunity('Edificio Alameda');const another=s.createCommunity('Edificio Arauco');
  s.setMembership(admin,community,'admin');s.setMembership(committee,community,'committee');
  s.setMembership(ownerA,community,'owner');s.setMembership(ownerB,community,'owner');s.setMembership(outsider,another,'admin');
  const ua=s.addUnit(admin,community,{code:'101',kind:'Departamento',ownerUserId:ownerA}).id;
  const ub=s.addUnit(admin,community,{code:'102',kind:'Departamento',ownerUserId:ownerB}).id;
  return {s,admin,committee,ownerA,ownerB,outsider,community,another,ua,ub};
}
const report=(unitId='')=>({unitId,category:'maintenance',priority:'high',title:'Fuga de agua en válvula',detail:'La válvula del cuarto de bombas necesita mantenimiento.'});

test('incidencias: creación, privacidad por unidad/comunidad y seguimiento autorizado',t=>{
  const f=fixture(t);const {s,admin,committee,ownerA,ownerB,outsider,community,another,ua,ub}=f;
  const a=s.addIncident(ownerA,community,report(ua)).id;
  const b=s.addIncident(ownerB,community,report(ub)).id;
  const common=s.addIncident(committee,community,report()).id;
  assert.deepEqual(s.incidentsFor(ownerA,community).map(x=>x.id),[a]);
  assert.deepEqual(s.incidentsFor(ownerB,community).map(x=>x.id),[b]);
  assert.equal(s.incidentsFor(committee,community).length,3);
  assert.equal(s.incidentsFor(admin,community).length,3);
  assert.throws(()=>s.addIncident(ownerA,community,report(ub)),x=>x instanceof Problem&&x.status===404);
  assert.throws(()=>s.addIncident(committee,community,report(ua)),x=>x.status===403);
  assert.throws(()=>s.addIncident(outsider,community,report()),x=>x.status===404);
  assert.throws(()=>s.commentIncident(ownerA,community,b,'Intento no autorizado'),x=>x.status===404);
  assert.throws(()=>s.changeIncidentStatus(ownerA,community,a,'resolved','Finalizado por mi'),x=>x.status===403);
  assert.throws(()=>s.commentIncident(outsider,another,a,'No corresponde'),x=>x.status===404);
  s.commentIncident(ownerA,community,a,'Se mantiene la filtración, por favor revisar.');
  s.commentIncident(committee,community,a,'Se coordinó una visita del técnico.');
  s.changeIncidentStatus(admin,community,a,'in_progress','Técnico asignado para revisar la reparación');
  const item=s.incidentsFor(ownerA,community)[0];
  assert.equal(item.status,'in_progress');
  assert.equal(item.updates.length,4);
  assert.deepEqual(item.updates.map(x=>x.kind),['created','comment','comment','status']);
  assert.ok(item.updates.every(x=>x.author && x.createdAt));
  assert.throws(()=>s.changeIncidentStatus(admin,community,a,'in_progress','Se vuelve a registrar'),x=>x.status===409);
  assert.throws(()=>s.changeIncidentStatus(admin,community,a,'bad','Nuevo estado inválido'),x=>x.status===400);
  assert.equal(s.overview(ownerB,community).incidents.length,1);
  assert.equal(s.overview(committee,community).incidents.length,3);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action LIKE 'incident.%'").get().n,6);
  assert.throws(()=>s.incidentsFor(admin,another),x=>x.status===404);
});

test('incidencias: operación y auditoría revierten atómicamente ante falla',t=>{
  const {s,admin,community}=fixture(t);
  const existing=s.addIncident(admin,community,report()).id;
  const original=s.audit;s.audit=()=>{throw new Error('Auditoría indisponible');};
  assert.throws(()=>s.addIncident(admin,community,report()),/Auditoría indisponible/);
  assert.throws(()=>s.commentIncident(admin,community,existing,'Comentario con error'),/Auditoría indisponible/);
  assert.throws(()=>s.changeIncidentStatus(admin,community,existing,'closed','Cierre fallido por auditoría'),/Auditoría indisponible/);
  s.audit=original;
  assert.equal(s.incidentsFor(admin,community).length,1);
  assert.equal(s.incidentsFor(admin,community)[0].status,'open');
  assert.equal(s.incidentsFor(admin,community)[0].updates.length,1);
});

test('incidencias: API real valida token, roles, campos, errores y estado',async t=>{
  const {s,admin,ownerA,ownerB,community,another,ua,ub}=fixture(t);
  const app=createApp(s);app.listen(0,'127.0.0.1');await once(app,'listening');
  t.after(()=>new Promise(resolve=>app.close(resolve)));
  const root=`http://127.0.0.1:${app.address().port}`;
  async function call(path,method='GET',obj,token){
    const resp=await fetch(root+path,{method,headers:{...(obj?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:obj?JSON.stringify(obj):undefined});
    return {status:resp.status,body:await resp.json()};
  }
  const auth=async email=>(await call('/api/login','POST',{email,password:'Secret0MuyLargo!2026'})).body.token;
  const tokenA=await auth('ownera@incidencias.test'),tokenB=await auth('ownerb@incidencias.test');
  const tokenAdmin=await auth('admin@incidencias.test');
  const path=`/api/communities/${community}/incidents`;
  assert.equal((await call(path)).status,401);
  assert.equal((await call(path,'POST',report(ub),tokenA)).status,404);
  assert.equal((await call(path,'POST',{...report(ua),priority:'impossible'},tokenA)).status,400);
  const created=await call(path,'POST',report(ua),tokenA);
  assert.equal(created.status,201);const id=created.body.id;
  assert.equal((await call(path,'GET',undefined,tokenA)).body.incidents.length,1);
  assert.equal((await call(path,'GET',undefined,tokenB)).body.incidents.length,0);
  assert.equal((await call(`/api/communities/${another}/incidents`,'GET',undefined,tokenA)).status,404);
  assert.equal((await call(`${path}/${id}/comments`,'POST',{note:'No autorizado'},tokenB)).status,404);
  assert.equal((await call(`${path}/${id}/comments`,'POST',{note:'Filtración continua'},tokenA)).status,201);
  assert.equal((await call(`${path}/${id}/status`,'PATCH',{status:'resolved',note:'Personal autorizado'},tokenA)).status,403);
  assert.equal((await call(`${path}/${id}/status`,'PATCH',{status:'resolved',note:'Reparación verificada'},tokenAdmin)).status,200);
  const row=(await call(path,'GET',undefined,tokenA)).body.incidents[0];
  assert.equal(row.status,'resolved');assert.equal(row.updates.length,3);
  assert.equal((await call(`${path}/${id}/status`,'POST',{status:'closed',note:'No permitido'},tokenAdmin)).status,405);
});
