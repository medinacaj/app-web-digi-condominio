import { resolve } from 'node:path';
import { Store, Problem, requireText } from './store.js';
const store=new Store(resolve(process.env.DIGI_DB_PATH??'.data/condominio.sqlite'));
try{
  if(store.countUsers()!==0)throw new Problem(409,'Inicialización cancelada: ya existe al menos un usuario');
  const email=process.env.DIGI_ADMIN_EMAIL;
  const password=process.env.DIGI_ADMIN_PASSWORD;
  const community=process.env.DIGI_COMMUNITY_NAME;
  if(!email||!password||!community)throw new Problem(400,'Defina DIGI_ADMIN_EMAIL, DIGI_ADMIN_PASSWORD (12+ caracteres) y DIGI_COMMUNITY_NAME');
  requireText(community,'Comunidad',130);
  store.db.exec('BEGIN IMMEDIATE');
  try {
    const userId=store.createUser(email,password,'Administración inicial');
    const communityId=store.createCommunity(community);
    store.setMembership(userId,communityId,'admin');
    store.db.exec('COMMIT');
  } catch(error) { store.db.exec('ROLLBACK'); throw error; }
  console.log('Inicialización local completada. Acceda mediante npm start; no se registraron credenciales en el repositorio.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{store.close();}
