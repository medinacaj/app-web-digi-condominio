import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../server/store.js';
import { createApp } from '../server/app.js';

const secret='SyntheticOnly_2026_NotProduction!';
function setup(t){
  const s=new Store();t.after(()=>s.close());
  const admin=s.createUser('admin@demo.test',secret,'Administración sintética');
  const owner=s.createUser('owner@demo.test',secret,'Titular de prueba');
  const outsider=s.createUser('other-admin@demo.test',secret);
  const committee=s.createUser('committee@demo.test',secret);
  const accountA=s.createAccount(admin,{name:'Empresa demo A',kind:'independent'}).id;
  const accountB=s.createAccount(outsider,{name:'Empresa demo B',kind:'independent'}).id;
  const a=s.createCommunity('Condominio demo A','',accountA),b=s.createCommunity('Condominio demo B','',accountB);
  for(const [u,c,role] of [[admin,a,'admin'],[owner,a,'owner'],[committee,a,'committee'],[outsider,b,'admin']])s.setMembership(u,c,role);
  const unit=s.addUnit(admin,a,{code:'T-B-504',kind:'Departamento',ownerUserId:owner}).id;
  const neighbor=s.addUnit(admin,a,{code:'T-B-505',kind:'Departamento'}).id;
  const external=s.addUnit(outsider,b,{code:'T-B-504',kind:'Departamento'}).id;
  return {s,admin,owner,outsider,committee,a,b,unit,neighbor,external};
}
const sample={
  fullName:'Arrendataria de demostración',relationship:'tenant',
  email:'tenant@example.test',phone:'+56912345678',
  paymentResponsible:true,contactPreference:'email'
};

test('directorio privado muestra propietario vinculado y ocupantes, sin conceder acceso a finanzas',t=>{
 const x=setup(t);
 const record=x.s.addUnitPerson(x.admin,x.a,x.unit,sample);
 assert.ok(record.id);
 const view=x.s.unitDirectory(x.admin,x.a,x.unit);
 assert.equal(view.owner.displayName,'Titular de prueba');
 assert.equal(view.owner.email,'owner@demo.test');
 assert.equal(view.contacts.length,1);
 assert.deepEqual(view.contacts[0].paymentResponsible,true);
 assert.equal(view.contacts[0].contactPreference,'email');
 assert.equal(view.contacts[0].email,'tenant@example.test');
 assert.equal(x.s.overview(x.owner,x.a).units[0].code,'T-B-504');
 assert.doesNotMatch(JSON.stringify(x.s.overview(x.owner,x.a)),/tenant@example.test|Arrendataria de demostración/);
 assert.doesNotMatch(JSON.stringify(x.s.overview(x.committee,x.a)),/tenant@example.test|Arrendataria de demostración/);
 assert.throws(()=>x.s.unitDirectory(x.owner,x.a,x.unit),e=>e.status===403);
 assert.throws(()=>x.s.unitDirectory(x.committee,x.a,x.unit),e=>e.status===403);
 assert.throws(()=>x.s.unitDirectory(x.admin,x.b,x.external),e=>e.status===404);
 assert.throws(()=>x.s.unitDirectory(x.outsider,x.b,x.unit),e=>e.status===404);
 assert.throws(()=>x.s.addUnitPerson(x.outsider,x.b,x.unit,sample),e=>e.status===404);
 assert.equal(x.s.notificationsFor(x.owner,x.a).length,0);
});

test('validación estricta: no permite roles de cuenta, pagos, teléfonos incorrectos ni preferencias sin canal',t=>{
 const x=setup(t);
 const invalid=[
  {...sample,role:'admin'},
  {...sample,ownerUserId:x.admin},
  {...sample,fullName:''},
  {...sample,relationship:'owner'},
  {...sample,relationship:'root'},
  {...sample,email:'not-an-email'},
  {...sample,phone:'1234'},
  {...sample,phone:'+001'},
  {...sample,paymentResponsible:'true'},
  {...sample,contactPreference:'invalid'},
  {...sample,email:'',contactPreference:'email'},
  {...sample,phone:'',contactPreference:'whatsapp'},
  {...sample,phone:'',contactPreference:'sms'},
  {...sample,contactPreference:'email',email:null},
  {...sample,fullName:'x'.repeat(101)}
 ];
 for(const row of invalid)assert.throws(()=>x.s.addUnitPerson(x.admin,x.a,x.unit,row),e=>e.status===400,JSON.stringify(row));
 assert.equal(x.s.unitDirectory(x.admin,x.a,x.unit).contacts.length,0);
});

test('evita duplicados activos por unidad, permite correcciones, baja y nuevo contacto posteriormente',t=>{
 const x=setup(t);
 const a=x.s.addUnitPerson(x.admin,x.a,x.unit,sample);
 assert.throws(()=>x.s.addUnitPerson(x.admin,x.a,x.unit,{...sample,email:'TENANT@EXAMPLE.TEST'}),e=>e.status===409);
 // Reusing an address in a DIFFERENT unit is allowed; its details remain scoped.
 const neighbor=x.s.addUnitPerson(x.admin,x.a,x.neighbor,sample);
 assert.ok(neighbor.id!==a.id);
 x.s.changeUnitPerson(x.admin,x.a,x.unit,a.id,{fullName:'Arrendataria corregida',contactPreference:'whatsapp'});
 const updated=x.s.unitDirectory(x.admin,x.a,x.unit).contacts[0];
 assert.equal(updated.fullName,'Arrendataria corregida');
 assert.equal(updated.contactPreference,'whatsapp');
 assert.equal(updated.paymentResponsible,true);
 assert.equal(updated.phone,'+56912345678');
 assert.throws(()=>x.s.changeUnitPerson(x.admin,x.a,x.neighbor,a.id,{fullName:'Fuga'}),e=>e.status===404);
 assert.throws(()=>x.s.changeUnitPerson(x.owner,x.a,x.unit,a.id,{fullName:'Fuga'}),e=>e.status===403);
 assert.equal(x.s.deactivateUnitPerson(x.admin,x.a,x.unit,a.id).active,false);
 assert.ok(x.s.unitDirectory(x.admin,x.a,x.unit).contacts[0].inactiveAt);
 assert.throws(()=>x.s.changeUnitPerson(x.admin,x.a,x.unit,a.id,{fullName:'Fuga'}),e=>e.status===409);
 assert.throws(()=>x.s.deactivateUnitPerson(x.admin,x.a,x.unit,a.id),e=>e.status===409);
 x.s.addUnitPerson(x.admin,x.a,x.unit,sample);
 assert.equal(x.s.unitDirectory(x.admin,x.a,x.unit).contacts.length,2);
 assert.equal(x.s.db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action LIKE 'unit.person_%'").get().n,5);
});

test('rollback único: directorio y evento auditado se anulan juntos si falla auditoría',t=>{
 const x=setup(t),orig=x.s.audit;
 x.s.audit=()=>{throw new Error('Simulación de auditoría fallida');};
 assert.throws(()=>x.s.addUnitPerson(x.admin,x.a,x.unit,sample),/auditoría fallida/);
 assert.equal(x.s.db.prepare('SELECT COUNT(*) n FROM unit_people').get().n,0);
 x.s.audit=orig;
 const inserted=x.s.addUnitPerson(x.admin,x.a,x.unit,sample);
 x.s.audit=()=>{throw new Error('Simulación de auditoría fallida');};
 assert.throws(()=>x.s.deactivateUnitPerson(x.admin,x.a,x.unit,inserted.id),/auditoría fallida/);
 x.s.audit=orig;
 assert.equal(x.s.unitDirectory(x.admin,x.a,x.unit).contacts[0].inactiveAt,null);
});

test('API HTTP solo permite al administrador de esa comunidad gestionar contactos; no enumera datos de otras unidades',async t=>{
 const x=setup(t),app=createApp(x.s);
 app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(resolve=>app.close(resolve)));
 const root='http://127.0.0.1:'+app.address().port;
 const ask=async(path,method='GET',payload,token)=>{
   const res=await fetch(root+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
   return {status:res.status,headers:res.headers,result:await res.json()};
 };
 const tokens={};
 for(const [who,email] of [['admin','admin@demo.test'],['owner','owner@demo.test'],['outsider','other-admin@demo.test'],['committee','committee@demo.test']]){
   tokens[who]=(await ask('/api/login','POST',{email,password:secret})).result.token;
   assert.ok(tokens[who]);
 }
 const api='/api/communities/'+x.a+'/units/'+x.unit+'/directory';
 assert.equal((await ask(api)).status,401);
 assert.equal((await ask(api,'GET',null,tokens.owner)).status,403);
 assert.equal((await ask(api,'GET',null,tokens.committee)).status,403);
 assert.equal((await ask(api,'GET',null,tokens.outsider)).status,404);
 assert.equal((await ask(api,'POST',sample,tokens.owner)).status,403);
 const created=await ask(api,'POST',sample,tokens.admin);
 assert.equal(created.status,201);
 assert.equal(created.headers.get('cache-control'),'no-store');
 const id=created.result.id;
 assert.ok(id);
 const listing=await ask(api,'GET',null,tokens.admin);
 assert.equal(listing.result.directory.contacts[0].fullName,sample.fullName);
 assert.equal(listing.result.directory.owner.email,'owner@demo.test');
 assert.equal((await ask(api+'/'+id,'PATCH',{paymentResponsible:false},tokens.admin)).status,200);
 assert.equal((await ask(api,'GET',null,tokens.admin)).result.directory.contacts[0].paymentResponsible,false);
 assert.equal((await ask(api+'/'+id,'DELETE',null,tokens.owner)).status,403);
 assert.equal((await ask(api+'/'+id,'DELETE',null,tokens.admin)).status,200);
 assert.equal((await ask(api+'/'+id,'DELETE',null,tokens.admin)).status,409);
 assert.equal((await ask('/api/communities/'+x.b+'/units/'+x.external+'/directory','GET',null,tokens.admin)).status,404);
});
