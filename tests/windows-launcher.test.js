import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { spawn, execFileSync } from 'node:child_process';

// The actual cmd wrapper and bundled node.exe need a real Windows runner.
test('Windows: doble clic equivalente desde carpeta con espacios y runtime incluido', {skip:process.platform!=='win32',timeout:30000},async t=>{
  const dir=mkdtempSync(join(tmpdir(),'Digi prueba con espacios '));
  let child,output='';
  t.after(()=>{
    if(child&&child.exitCode===null){try{execFileSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});}catch{}}
    rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:200});
  });
  const root=fileURLToPath(new URL('..',import.meta.url));
  for(const name of ['server','src','index.html','package.json','Iniciar Digi-Condominio.cmd'])cpSync(join(root,name),join(dir,name),{recursive:true});
  mkdirSync(join(dir,'runtime'));cpSync(process.execPath,join(dir,'runtime','node.exe'));
  const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
  const port=probe.address().port;await new Promise(r=>probe.close(r));
  child=spawn(process.env.ComSpec??'cmd.exe',['/d','/s','/c',`"call "${join(dir,'Iniciar Digi-Condominio.cmd')}""`],{
    windowsVerbatimArguments:true,cwd:tmpdir(),windowsHide:true,
    env:{...process.env,PORT:String(port),DIGI_DB_PATH:join(dir,'.data','test.sqlite'),DIGI_OPEN_BROWSER:'0',DIGI_NO_PAUSE:'1'},
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  const origin=`http://127.0.0.1:${port}`;
  let html;
  for(let n=0;n<100;n++){
    if(child.exitCode!==null)assert.fail(`El iniciador terminó antes de estar listo: ${output}`);
    try{const response=await fetch(origin,{signal:AbortSignal.timeout(300)});if(response.status===200){html=await response.text();break;}}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(html,`No inició el servidor: ${output}`);
  const token=/name="token" value="([a-f0-9]+)"/.exec(html)?.[1];assert.ok(token);
  const setup=await fetch(origin+'/setup',{method:'POST',redirect:'manual',headers:{Origin:origin},body:new URLSearchParams({token,community:'Prueba Windows',email:'admin@windows.test',password:'WindowsTestPassword123!',confirmation:'WindowsTestPassword123!'})});
  assert.equal(setup.status,303);
  const login=await fetch(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@windows.test',password:'WindowsTestPassword123!'})});
  assert.equal(login.status,200);
});
