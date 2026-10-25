import { backup } from 'node:sqlite';
import { Store } from './store.js';
import { resolve, dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const source=resolve(process.env.DIGI_DB_PATH??'.data/condominio.sqlite');
const destination=process.env.DIGI_BACKUP_PATH && resolve(process.env.DIGI_BACKUP_PATH);
if(!existsSync(source)) { console.error('La base de datos origen no existe.'); process.exit(1); }
if(!destination || destination===source || existsSync(destination)){
  console.error('Defina DIGI_BACKUP_PATH distinto de la base original y que no exista previamente.');
  process.exit(1);
}
mkdirSync(dirname(destination),{recursive:true,mode:0o700});
const store=new Store(source);
try{
  await backup(store.db,destination);
  const verify=new Store(destination);
  const integrity=verify.db.prepare('PRAGMA integrity_check').get().integrity_check;
  verify.close();
  if(integrity!=='ok')throw Error('El respaldo no superó integrity_check');
  console.log('Respaldo local creado y verificado. Cífrelo y consérvelo fuera del repositorio.');
}catch(error){console.error('No fue posible realizar el respaldo:',error.message);process.exitCode=1;}
finally{store.close();}
