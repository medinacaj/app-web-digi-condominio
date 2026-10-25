import { resolve } from 'node:path';
import { Store, Problem, roles } from './store.js';
const e=process.env;
const store=new Store(resolve(e.DIGI_DB_PATH??'.data/condominio.sqlite'));
try{
  const actorEmail=e.DIGI_ADMIN_EMAIL?.toLowerCase().trim(),communityId=e.DIGI_TARGET_COMMUNITY_ID;
  const email=e.DIGI_NEW_USER_EMAIL,password=e.DIGI_NEW_USER_PASSWORD,role=e.DIGI_NEW_USER_ROLE;
  if(!actorEmail||!communityId||!email||!password||!role)throw new Problem(400,'Faltan variables DIGI_ADMIN_EMAIL, DIGI_TARGET_COMMUNITY_ID, DIGI_NEW_USER_EMAIL, DIGI_NEW_USER_PASSWORD o DIGI_NEW_USER_ROLE');
  if(!roles.has(role))throw new Problem(400,'Rol inválido');
  const actor=store.db.prepare('SELECT id FROM users WHERE email=?').get(actorEmail);
  if(!actor)throw new Problem(403,'Administración no autorizada');
  store.requireAdmin(actor.id,communityId);
  const unitCode=e.DIGI_ASSIGN_UNIT_CODE?.trim();
  const unit=unitCode?store.db.prepare('SELECT id,owner_user_id FROM units WHERE community_id=? AND code=?').get(communityId,unitCode):null;
  if(unitCode&&role!=='owner')throw new Problem(400,'Solo propietarios pueden asignarse a unidad mediante esta herramienta');
  if(unitCode&&(!unit||unit.owner_user_id))throw new Problem(409,'Unidad inexistente o con propietario ya asignado');
  store.db.exec('BEGIN IMMEDIATE');
  try{
    const userId=store.createUser(email,password,e.DIGI_NEW_USER_NAME??'Usuario de comunidad');
    store.setMembership(userId,communityId,role);
    store.audit(actor.id,communityId,'membership.created',userId);
    if(unit){store.db.prepare('UPDATE units SET owner_user_id=? WHERE id=? AND community_id=?').run(userId,unit.id,communityId);store.audit(actor.id,communityId,'unit.owner_assigned',unit.id);}
    store.db.exec('COMMIT');
  }catch(error){store.db.exec('ROLLBACK');throw error;}
  console.log('Usuario creado con rol de comunidad y auditoría. Proporcione acceso mediante un canal seguro, nunca por repositorio.');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{store.close();}
