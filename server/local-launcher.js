/** Local first-run wizard and browser launcher. Never bind this server publicly. */
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { Store, Problem, requireText } from './store.js';
import { createApp } from './app.js';
import { escapeHtml } from '../src/domain.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const LIMIT=16_384;
function setupPage(token,error='',values={}) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurar Digi-Condominio</title><style>
  *{box-sizing:border-box}body{margin:0;background:#eff3f8;color:#17243c;font:16px system-ui,sans-serif;padding:24px}main{max-width:540px;margin:4vh auto;background:white;padding:32px;border-radius:18px;box-shadow:0 12px 40px #17243c18}h1{font-size:28px;margin:12px 0}p{line-height:1.5}select{display:block;width:100%;padding:12px;font:inherit;margin-top:6px}label{display:block;font-weight:600;margin:18px 0}input{display:block;width:100%;padding:12px;border:1px solid #8090a5;border-radius:7px;font:inherit;margin-top:6px}button{padding:14px;width:100%;background:#174c87;color:white;border:0;border-radius:8px;font:inherit;cursor:pointer}.error{background:#fff0ed;color:#8d231c;padding:12px;border-radius:8px}.note{color:#526078;font-size:14px}.brand{font-weight:700;color:#174c87}input:focus,button:focus{outline:3px solid #6ca9df;outline-offset:2px}@media(max-width:480px){body{padding:12px}main{padding:22px;margin:12px auto}}
  </style></head><body><main><div class="brand">DIGI-CONDOMINIO · EN TU PC</div><h1>Prepara tu espacio de prueba</h1><p>Este paso se realiza una sola vez. Crea tu cuenta para comenzar a probar las funcionalidades.</p>${error?`<p class="error" role="alert">${escapeHtml(error)}</p>`:''}<form method="post" action="/setup">
  <input type="hidden" name="token" value="${token}">
  <label>Tipo de cliente<select name="kind"><option value="independent">Condominio independiente</option><option value="management_company">Empresa administradora</option></select></label>
  <label>Nombre de la cuenta (opcional)<input name="accountName" maxlength="130" placeholder="Si lo dejas vacío se usará la comunidad"></label>
  <label>Nombre de la comunidad<input name="community" required maxlength="130" value="${escapeHtml(values.community??'')}" placeholder="Condominio de prueba"></label>
  <label>Correo electrónico<input type="email" name="email" required maxlength="254" autocomplete="username" value="${escapeHtml(values.email??'')}"></label>
  <label>Contraseña<input type="password" name="password" required minlength="12" maxlength="128" autocomplete="new-password"></label>
  <label>Repetir contraseña<input type="password" name="confirmation" required minlength="12" maxlength="128" autocomplete="new-password"></label>
  <p class="note">Usa entre 12 y 128 caracteres. Guarda tu contraseña: todavía no hay recuperación automática.</p><button type="submit">Crear mi cuenta y comenzar</button></form><p class="note">Solo datos ficticios. La aplicación es experimental. Los datos se guardan en esta carpeta, dentro de .data. El correo identifica tu cuenta; no se enviará ningún mensaje.</p></main></body></html>`;
}
function securityHeaders(res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  // Chromium sends Origin: null on native form POST with no-referrer.
  // Keep same-origin metadata so the strict origin check accepts our own form.
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
}
function send(res,status,text,type='text/plain; charset=utf-8') {
  res.writeHead(status,{'Content-Type':type});res.end(text);
}
async function readForm(req) {
  if(!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']??''))throw new Problem(415,'Formato de formulario no válido');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>LIMIT)throw new Problem(413,'Formulario demasiado grande');chunks.push(chunk);}
  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
}

export async function startLocal({location=resolve(root,'.data/condominio.sqlite'),port=4173}={}) {
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Puerto no válido');
  const store=new Store(location),app=createApp(store);
  const token=randomBytes(32).toString('hex');
  let configured=store.countUsers()>0;
  const server=createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${server.address().port}`;
    securityHeaders(res);
    if(req.headers.host!==`127.0.0.1:${server.address().port}`)return send(res,403,'Acceso local requerido');
    if(configured)return app.emit('request',req,res);
    let values={};
    try {
      if(req.method==='GET'&&req.url==='/')return send(res,200,setupPage(token),'text/html; charset=utf-8');
      if(req.method!=='POST'||req.url!=='/setup')return send(res,404,'Ruta no disponible');
      if(req.headers.origin!==origin)throw new Problem(403,'Origen no permitido');
      values=await readForm(req);
      if(typeof values.token!=='string'||!/^[a-f0-9]{64}$/.test(values.token)||!timingSafeEqual(Buffer.from(values.token),Buffer.from(token)))throw new Problem(403,'Formulario caducado; vuelve a abrir la aplicación');
      if(values.password!==values.confirmation)throw new Problem(400,'Las contraseñas no coinciden');
      const community=requireText(values.community,'Comunidad',130);
      store.db.exec('BEGIN IMMEDIATE');
      try {
        // Check again under the write lock: another local launcher may have initialized it.
        if(store.countUsers()>0)throw new Problem(409,'La cuenta inicial ya existe. Reinicia la aplicación.');
        const userId=store.createUser(values.email,values.password,'Administración inicial');
        const account=store.createAccount(userId,{name:values.accountName?.trim()||community,kind:values.kind??'independent'});
        const communityId=store.createCommunity(community,'',account.id);
        store.setMembership(userId,communityId,'admin');
        store.db.exec('COMMIT');
      }catch(error){store.db.exec('ROLLBACK');throw error;}
      configured=true;
      res.writeHead(303,{Location:'/'});res.end();
    }catch(error){
      const status=error instanceof Problem?error.status:500;
      send(res,status,setupPage(token,status===500?'No se pudo guardar la configuración. Revisa que la carpeta permita escribir.':error.message,values),'text/html; charset=utf-8');
    }
  });
  try {
    await new Promise((ready,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);ready();});});
  }catch(error){store.close();throw error;}
  server.requestTimeout=15_000;
  server.headersTimeout=10_000;
  return {server,store,location,url:`http://127.0.0.1:${server.address().port}`};
}

function openBrowser(url) {
  const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
  const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
  const child=spawn(command,args,{stdio:'ignore',windowsHide:true});
  const help=()=>console.log(`Si el navegador no se abre, escribe esta dirección: ${url}`);
  child.once('error',help);child.once('exit',code=>{if(code!==0)help();});child.unref();
}
async function main() {
  try {
    const port=Number(process.env.PORT??4173);
    if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT debe estar entre 1024 y 65535');
    const app=await startLocal({location:process.env.DIGI_DB_PATH?resolve(process.env.DIGI_DB_PATH):undefined,port});
    console.log(`\nDigi-Condominio está listo: ${app.url}\nMantén esta ventana abierta mientras lo usas.\nPara detenerlo, pulsa Ctrl+C o cierra esta ventana.\nTus datos se conservan para el próximo inicio.\n`);
    if(process.env.DIGI_OPEN_BROWSER!=='0')openBrowser(app.url);
    let closing=false;
    for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.on(signal,()=>{
      if(closing)return;closing=true;
      app.server.close(()=>{app.store.close();process.exit(0);});
      app.server.closeAllConnections();
    });
  }catch(error){
    console.error(error.code==='EADDRINUSE'?'El puerto está ocupado. Si Digi-Condominio ya está abierto, usa esa ventana. Si no, cierra la otra aplicación o pide ayuda.':`No se pudo iniciar Digi-Condominio: ${error.message}`);
    process.exitCode=1;
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
