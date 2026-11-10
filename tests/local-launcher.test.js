import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, get } from 'node:http';
import { once } from 'node:events';

async function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'digi launcher '));
  const instances=[];
  t.after(async()=>{
    for(const item of instances){if(item.server.listening)await new Promise(r=>item.server.close(r));item.store.close();}
    rmSync(dir,{recursive:true,force:true});
  });
  const {startLocal}=await import('../server/local-launcher.js');
  const app=await startLocal({location:join(dir,'test.sqlite'),port:0});
  instances.push(app);
  app.instances=instances;
  return app;
}
async function setupForm(app) {
  const response=await fetch(app.url);
  assert.equal(response.status,200);
  const html=await response.text();
  const token=/name="token" value="([a-f0-9]+)"/.exec(html)?.[1];
  assert.ok(token,'Se muestra el formulario inicial');
  return token;
}
function submit(app,token,changes={},origin=app.url) {
  return fetch(app.url+'/setup',{method:'POST',redirect:'manual',headers:{Origin:origin},body:new URLSearchParams({token,community:'Comunidad de prueba',email:'admin@local.test',password:'PasswordDePrueba123!',confirmation:'PasswordDePrueba123!',...changes})});
}

test('primer inicio permite crear cuenta, iniciar sesión y persiste al reiniciar',async t=>{
  const app=await fixture(t),token=await setupForm(app);
  const response=await submit(app,token);
  assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/');
  const login=await fetch(app.url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@local.test',password:'PasswordDePrueba123!'})});
  assert.equal(login.status,200);
  const {token:session}=await login.json();
  const communities=await fetch(app.url+'/api/communities',{headers:{Authorization:`Bearer ${session}`}}).then(r=>r.json());
  assert.equal(communities.communities[0].name,'Comunidad de prueba');
  const community=communities.communities[0].id;
  app.store.addUnit(app.store.session(session).id,community,{code:'A-101',kind:'Departamento'});
  assert.equal((await submit(app,token)).status,404);
  const location=app.location;
  await new Promise(r=>app.server.close(r));
  // The first fixture owns its Store; close it only through its registered teardown.
  const {startLocal}=await import('../server/local-launcher.js');
  const restarted=await startLocal({location,port:0});
  app.instances.push(restarted);
  assert.equal(restarted.store.countUsers(),1);
  assert.equal(restarted.store.db.prepare('SELECT code FROM units').get().code,'A-101');
  assert.doesNotMatch(await fetch(restarted.url).then(r=>r.text()),/name="confirmation"/);
  assert.equal((await submit(restarted,token)).status,404);
});

test('rechaza configuración inválida sin crear cuentas ni reflejar contraseñas',async t=>{
  const app=await fixture(t),token=await setupForm(app);
  for(const changes of [{confirmation:'otra'}, {email:'invalido'}, {community:''}, {password:'corta',confirmation:'corta'}]) {
    const res=await submit(app,token,changes);
    assert.equal(res.status,400);
    assert.doesNotMatch(await res.text(),/PasswordDePrueba123!/);
    assert.equal(app.store.countUsers(),0);
    assert.equal(app.store.db.prepare('SELECT count(*) n FROM communities').get().n,0);
  }
  assert.equal((await submit(app,token)).status,303);
});

test('bloquea alta de otro origen y tokens incorrectos',async t=>{
  const app=await fixture(t),token=await setupForm(app);
  assert.equal((await submit(app,token,{},'https://externo.test')).status,403);
  assert.equal((await submit(app,'0'.repeat(64))).status,403);
  // Fetch normalizes Host; use a raw HTTP request to exercise DNS-rebinding protection.
  const status=await new Promise((resolve,reject)=>{
    get(app.url,{headers:{Host:'externo.test'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);
  });
  assert.equal(status,403);
  assert.equal(app.store.countUsers(),0);
});

test('limita cuerpos de alta y no expone archivos del proyecto',async t=>{
  const app=await fixture(t),token=await setupForm(app);
  assert.equal((await submit(app,token,{community:'x'.repeat(20000)})).status,413);
  assert.equal((await fetch(app.url+'/server/store.js')).status,404);
  assert.equal(app.store.countUsers(),0);
});

test('un puerto ocupado no detiene el servidor existente',async t=>{
  const server=createServer((req,res)=>res.end('servicio existente'));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(r=>server.close(r)));
  const {startLocal}=await import('../server/local-launcher.js');
  await assert.rejects(startLocal({location:':memory:',port:server.address().port}),{code:'EADDRINUSE'});
  assert.equal(await fetch(`http://127.0.0.1:${server.address().port}`).then(r=>r.text()),'servicio existente');
});
