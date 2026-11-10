import { Store } from './store.js';
import { createApp } from './app.js';
import { IdentityService } from './identity.js';
import { Subscriptions } from './subscriptions.js';
import { hostedConfig } from './hosted-config.js';
import { createMailer } from './mailer.js';
let store;
try{
  const config=hostedConfig();
  const mail=createMailer();
  store=new Store(config.location);
  if(store.countUsers()===0)throw new Error('Inicialice una cuenta privada mediante bootstrap antes de iniciar el servidor alojado');
  const identity=new IdentityService(store,{publicOrigin:config.publicOrigin,sendMail:mail});
  const server=createApp(store,{hosted:true,publicOrigin:config.publicOrigin,trustProxy:config.trustProxy,identity,subscriptions:new Subscriptions(store)});
  server.once('error',error=>{console.error('No se pudo iniciar el servidor:',error.code??'error');store.close();process.exitCode=1;});
  server.listen(config.port,config.host,()=>console.log(`Digi-Condominio: piloto configurado para ${config.publicOrigin}. Correo externo requiere credenciales y dominio verificados.`));
  let closing=false;
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
    if(closing)return;closing=true;
    server.close(async()=>{await identity.drain();store.close();process.exit(0);});
    const force=setTimeout(()=>server.closeAllConnections(),5000);force.unref();
  });
}catch(error){console.error(error.message);if(store)store.close();process.exitCode=1;}
