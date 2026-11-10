/** One-time provisioning from operator-supplied environment; never a public setup route. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { hostedConfig } from './hosted-config.js';
import { createMailer } from './mailer.js';
try{
  const config=hostedConfig();createMailer(); // Fail before initialization if hosting/mail are not configured.
  const store=new Store(config.location);const empty=store.countUsers()===0;store.close();
  if(empty){
    const result=spawnSync(process.execPath,[fileURLToPath(new URL('./bootstrap.js',import.meta.url))],{stdio:'inherit',env:process.env});
    if(result.status!==0)throw new Error('Inicialización privada incompleta; revise las variables del administrador');
  }
  delete process.env.DIGI_ADMIN_PASSWORD;
  await import('./hosted-start.js');
}catch(error){console.error(error.message);process.exitCode=1;}
