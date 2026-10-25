# Respaldos cifrados y versión del esquema — v0.7.0

**Implementación experimental local**, con datos sintéticos. No constituye estrategia de recuperación de desastres ni autorización para tratar información personal real.

## Crear un respaldo confidencial

1. Con la base SQLite local existente y el servidor detenido preferiblemente, defina en una terminal privada:
   - `DIGI_DB_PATH`: ruta de la base local (por defecto `.data/condominio.sqlite`).
   - `DIGI_BACKUP_PATH`: **nuevo** archivo terminado en `.dcb` en un directorio privado fuera del repositorio.
   - `DIGI_BACKUP_PASSPHRASE`: frase única y aleatoria de al menos **20 caracteres**. No pegarla en chats, scripts compartidos ni GitHub.
2. Ejecute `npm run backup:secure`. El programa crea un snapshot consistente con `node:sqlite backup()`, comprueba `PRAGMA integrity_check`, cifra el contenido con AES-256-GCM y clave derivada por scrypt (`N=32768,r=8,p=1`). Incluye salt aleatorio de 16 bytes y nonce de 12 bytes por archivo; graba sin sobrescribir destinos existentes y con permisos `0600` en sistemas compatibles.
3. Conserve el archivo cifrado y la frase de cifrado en lugares independientes bajo su control. Sin ella la recuperación no será viable.

## Restaurar sin sobrescribir

1. Defina `DIGI_RESTORE_SOURCE` como el `.dcb`, `DIGI_RESTORE_PATH` como **base SQLite nueva** y `DIGI_BACKUP_PASSPHRASE` correcta.
2. Ejecute `npm run restore:secure`. Verifica el tag criptográfico del archivo, reconoce la cabecera SQLite, crea un archivo privado temporal junto al destino, comprueba `integrity_check` y solo después enlaza el archivo como la ruta final. Un destino existente se rechaza.
3. Compruebe manualmente el contenido en una sesión local de pruebas. No dirija usuarios reales al archivo restaurado sin revisar permisos, consistencia, integraciones y el plan operativo.

## Límites explícitos

- Se admite un máximo de **100 MB de SQLite**; por diseño se lee completo en RAM durante cifrado y descifrado. Esta implementación no escala a grandes bases sin cifrado en flujo.
- Durante la operación se utiliza un archivo temporal SQLite legible por el proceso dentro de un directorio privado. La eliminación posterior **no garantiza borrado físico irrecuperable** en SSD, journaling ni snapshots del sistema.
- El formato `.dcb` empieza por cabecera binaria `DGCB1` con salt, nonce, tag y ciphertext. No confundir con exportación de datos; no hay compresión.
- No existen rotación, automatización, monitoreo, replicación, recuperación de puntos en el tiempo, custodia/rotación de claves ni métricas RPO/RTO. No se configura ninguna copia o acceso en la nube.
- No use el archivo histórico generado por `npm run backup` (SQLite sin cifrar) con datos sensibles. Ese comando se conserva solo por compatibilidad de desarrollo y pruebas.

## Esquema SQLite

Al abrir la base, `Store` consulta `PRAGMA user_version`. Una versión superior a `3` se rechaza sin intentar escribir. Los esquemas conocidos y creados por el propio proyecto que aún tienen versión `0` se completan mediante definiciones `CREATE TABLE/INDEX IF NOT EXISTS` dentro de una transacción y se anotan como `3` sin borrar filas.

**Esto es una protección y compatibilidad del esquema conocido, no un motor de migraciones general**. Cambios estructurales futuros deben requerir migraciones explícitas, respaldos, pruebas de transformación y rollback. No se garantiza poder importar SQLite de terceros ni versiones desconocidas.

## Verificaciones

- Pruebas de contraseña errónea, archivo alterado, formato inválido, entrada no SQLite, destino existente, backup/restore de cuotas e incidencias, además de CLI real.
- Prueba de actualización desde versión `0` conservando datos, y rechazo de esquema de versión futura `99`.
- La CI puede comprobar código y pruebas, pero **no** mide recuperación real en otro dispositivo, seguridad operacional o cumplimiento normativo.
