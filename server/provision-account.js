/** Assisted local provisioning, not a public sign-up API. */
import { resolve } from 'node:path';
import { Store, Problem } from './store.js';
const s=new Store(resolve(process.env.DIGI_DB_PATH??'.data/condominio.sqlite'));
try{
  const email=process.env.DIGI_ACCOUNT_ADMIN_EMAIL?.trim().toLowerCase();
  if(!email||!process.env.DIGI_ACCOUNT_NAME||!process.env.DIGI_ACCOUNT_KIND)throw new Problem(400,'Defina DIGI_ACCOUNT_ADMIN_EMAIL, DIGI_ACCOUNT_NAME y DIGI_ACCOUNT_KIND');
  s.db.exec('BEGIN IMMEDIATE');
  try{
    let user=s.db.prepare('SELECT id FROM users WHERE email=?').get(email)?.id;
    if(!user){
      if(!process.env.DIGI_ACCOUNT_ADMIN_PASSWORD)throw new Problem(400,'Para un nuevo administrador, defina DIGI_ACCOUNT_ADMIN_PASSWORD');
      user=s.createUser(email,process.env.DIGI_ACCOUNT_ADMIN_PASSWORD,'Administración de cuenta');
    }
    const account=s.createAccount(user,{name:process.env.DIGI_ACCOUNT_NAME,kind:process.env.DIGI_ACCOUNT_KIND});
    s.db.exec('COMMIT');
    console.log(`Cuenta creada: ${account.id}. El administrador puede crear condominios y conceder asignaciones explícitas desde la aplicación.`);
  }catch(error){s.db.exec('ROLLBACK');throw error;}
}catch(error){console.error(error.message);process.exitCode=1;}finally{s.close();}
