import {readFileSync} from 'node:fs';
import {migrateAccounts} from './account-migration.js';
try {
  const {DIGI_DB_PATH,DIGI_ACCOUNT_MAPPING,DIGI_MIGRATION_BACKUP}=process.env;
  if(!DIGI_DB_PATH||!DIGI_ACCOUNT_MAPPING||!DIGI_MIGRATION_BACKUP)throw new Error('Defina DIGI_DB_PATH, DIGI_ACCOUNT_MAPPING (archivo JSON) y DIGI_MIGRATION_BACKUP (archivo nuevo)');
  const mapping=JSON.parse(readFileSync(DIGI_ACCOUNT_MAPPING,'utf8'));
  await migrateAccounts(DIGI_DB_PATH,mapping,DIGI_MIGRATION_BACKUP);
  console.log('Migración de cuentas completada; respaldo e integridad verificados.');
}catch(error){console.error('No fue posible migrar las cuentas:',error.message);process.exitCode=1;}
