import { resolve } from 'node:path';
import { Store } from './store.js';
import { Subscriptions } from './subscriptions.js';
const s=new Store(resolve(process.env.DIGI_DB_PATH??'.data/condominio.sqlite'));
try{
  if(!process.env.DIGI_SUBSCRIPTION_ACCOUNT||!process.env.DIGI_SUBSCRIPTION_PLAN||!process.env.DIGI_SUBSCRIPTION_STATUS)throw new Error('Defina DIGI_SUBSCRIPTION_ACCOUNT, DIGI_SUBSCRIPTION_PLAN y DIGI_SUBSCRIPTION_STATUS');
  new Subscriptions(s).set(process.env.DIGI_SUBSCRIPTION_ACCOUNT,{plan:process.env.DIGI_SUBSCRIPTION_PLAN,status:process.env.DIGI_SUBSCRIPTION_STATUS,expiresAt:process.env.DIGI_SUBSCRIPTION_EXPIRES??null});
  console.log('Estado de suscripción guardado y auditado. No se realizó ningún cobro.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{s.close();}
