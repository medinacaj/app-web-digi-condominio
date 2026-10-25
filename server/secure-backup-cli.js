import { Store } from './store.js';
import { createEncryptedBackup } from './secure-backup.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const source=resolve(process.env.DIGI_DB_PATH??'.data/condominio.sqlite');
const target=process.env.DIGI_BACKUP_PATH;
const passphrase=process.env.DIGI_BACKUP_PASSPHRASE;
if(!target||!passphrase||!existsSync(source)){
  console.error('Defina DIGI_BACKUP_PATH, DIGI_BACKUP_PASSPHRASE y una base local existente.');process.exit(1);
}
if(resolve(target)===source){console.error('El destino no puede ser la base original.');process.exit(1);}
const store=new Store(source);
try{const result=await createEncryptedBackup(store,target,passphrase);console.log(`Respaldo cifrado AES-GCM creado y verificado (${result.bytes} bytes). Guarde la contraseña aparte.`);}
catch(error){console.error(error.message);process.exitCode=1;}
finally{store.close();}
