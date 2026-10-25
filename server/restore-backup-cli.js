import { restoreEncryptedBackup } from './secure-backup.js';
const source=process.env.DIGI_RESTORE_SOURCE,target=process.env.DIGI_RESTORE_PATH,passphrase=process.env.DIGI_BACKUP_PASSPHRASE;
if(!source||!target||!passphrase){console.error('Defina DIGI_RESTORE_SOURCE, DIGI_RESTORE_PATH y DIGI_BACKUP_PASSPHRASE.');process.exit(1);}
try{const result=restoreEncryptedBackup(source,target,passphrase);console.log(`Base SQLite recuperada y verificada (${result.bytes} bytes). No use este archivo sin revisar permisos y consistencia.`);}
catch(error){console.error(error.message);process.exitCode=1;}
