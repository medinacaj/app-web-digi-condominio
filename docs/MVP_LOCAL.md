# Digi-Condominio · MVP local 0.4.0

**Estado:** implementación local en fase de validación; **NO apto para producción**.

## Arquitectura de esta iteración

- Cliente: HTML, CSS y módulos JavaScript, sin dependencias externas.
- API: Node.js 22+ `node:http`, accesible solo en `127.0.0.1`.
- Datos: SQLite con `node:sqlite` integrado en Node 22, **experimental**; el API aún puede cambiar. No desplegar esta arquitectura sin evaluación y pruebas de respaldo/migración.
- Autenticación: usuarios creados por CLI, scrypt con salt individual, tokens aleatorios de 256 bits guardados **hasheados** en SQLite, caducidad de 8 horas; token en memoria de la pestaña, se pierde al recargar y puede revocarse con logout.
- Autorización: membresía por comunidad; roles `admin`, `committee`, `owner`. Administrador escribe; comité solo lee unidades sin saldo, anuncios y documentos compartidos; propietario solo ve unidades vinculadas a su usuario, sus cargos/pagos, avisos y documentos comunitarios. Control en el servidor; esconder botones en el cliente no es la seguridad.
- Integridad: cuotas únicas por unidad, período y concepto; pagos con referencia única por comunidad; importes enteros en **centésimas de unidades monetarias ficticias (UM)**; saldo calculado desde movimientos. Auditoría de altas (sin ediciones/destrucción). Es solo **libro operativo**, no contabilidad regulada.
- Documentos: registro de metadatos con visibilidad; **no** admite adjuntos ni descarga.
- Aislamiento: no exposición entre comunidades en listados, operaciones y consultas, con tests automáticos negativos.

## Primer arranque privado

**Requisitos:** Node.js 22.16+ (con `node:sqlite`), sistema con SQLite integrado en Node, navegador moderno. **No** publicar el puerto ni ejecutarlo desde un dominio externo.

Desde la raíz:

```bash
# Configura estas tres variables de entorno de forma segura EN TU TERMINAL.
# Nunca las copies en archivos del repositorio, chats ni issues.
export DIGI_ADMIN_EMAIL='correo-privado@ejemplo.test'
export DIGI_ADMIN_PASSWORD='frase-larga-unica-de-mas-de-12-caracteres'
export DIGI_COMMUNITY_NAME='Comunidad de prueba'

npm run bootstrap
npm start
# Abrir manualmente http://127.0.0.1:4173
```

El bootstrap **solo funciona si la base no tiene usuarios**. Los nombres y credenciales del ejemplo no existen ni son cuentas operativas. El archivo local se crea en `.data/condominio.sqlite`, ignorado por Git; protege permisos del directorio y realiza respaldos cifrados fuera del repositorio. Si ejecutas `npm run serve` (servidor estático), permanece disponible el **prototipo de datos ficticios**, sin persistencia.

Opcional: `DIGI_DB_PATH=/ruta/privada/otra.sqlite` para la ruta de base de datos. `PORT=4174` usa otro puerto de loopback (1024–65535).

## Pruebas

```bash
npm run check
```

Pruebas de lógica de demo, backend, aislamiento entre tenants, sesiones, roles, integridad de cuotas/pagos, privacidad documental y rutas HTTP. El pipeline de PR verifica sintaxis y tests en Node 22. Las pruebas no sustituyen auditoría de seguridad, revisión legal ni pruebas de estrés.

## Limitaciones conocidas / ruta a producción

- Todavía no hay registro, verificación por correo, restablecimiento de contraseña, MFA, flujo de invitaciones, conciliación bancaria, soporte multiempresa real ni permisos granulares negociados por jurisdicción.
- Todavía no hay interfaz para asignar un propietario a una unidad, ni migración CSV/Excel, proveedores/gastos, cobro electrónico o gestión de documentos adjuntos.
- El token se mantiene solo en RAM y se pierde tras recargar, lo que implica iniciar sesión de nuevo. Para producción, diseñar cookies `HttpOnly` seguras con CSRF y HTTPS cuando exista infraestructura.
- El sistema local está expresamente bloqueado a `127.0.0.1`; **NO** publicar ni agregar proxy sin revisar TLS, cookies/tokens, monitoreo, backups/restauración y aspectos legales.
- `node:sqlite` es experimental en el entorno probado; antes de producción elegir backend estable, probar migraciones y restauración y revisar compliance.
- Todavía no hay pruebas E2E automatizadas reales de navegadores integradas en CI; pueden agregarse cuando se cierre el diseño.

## Privacidad y estado de GitHub

Conservar repo privado. Ningún archivo de `.data/`, credencial o comprobante de residentes debe versionarse. La implementación vive en rama de trabajo y su PR no equivale a despliegue. No se ha seleccionado país ni marca comercial definitivos.

## Gastos, proveedores e informes CSV (iteración posterior)

Los administradores pueden crear proveedores, registrar gastos operativos y descargar informes CSV de unidades, cuotas, pagos, gastos y proveedores. Los informes usan UTF-8 con BOM y neutralizan cadenas que empiezan por operadores de hoja de cálculo para limitar la ejecución de fórmulas al importarlos. Las exportaciones requieren token y rol admin. Todo gasto se registra sin modificaciones destructivas; aún no constituye contabilidad regulada.

## Respaldo y verificación

Configura una ruta de destino **nueva** fuera del repositorio y ejecuta:

```bash
export DIGI_BACKUP_PATH='/ruta-privada/respaldo-2026-10-25.sqlite'
npm run backup
```

El comando usa el backup online de SQLite y verifica `PRAGMA integrity_check` sobre la copia. No sobrescribe destinos existentes. **No cifra el respaldo**: la responsabilidad de cifrarlo y guardarlo en un lugar seguro sigue siendo del operador. La restauración se realiza con la aplicación detenida, copiando cuidadosamente el respaldo y verificándolo antes de volver a iniciar. Prueba automatizada de recuperación incluida; no es un plan de desastre homologado.

## Alta local de usuarios (sin invitación por correo)

Para pruebas con roles individuales, el administrador puede crear usuarios **por CLI** y asignarlos a una comunidad. Configurar: `DIGI_ADMIN_EMAIL` (administrador existente), `DIGI_TARGET_COMMUNITY_ID`, `DIGI_NEW_USER_EMAIL`, `DIGI_NEW_USER_PASSWORD`, `DIGI_NEW_USER_ROLE` (`admin`, `committee` o `owner`) y, opcionalmente, `DIGI_NEW_USER_NAME`. Cuando el rol es `owner`, `DIGI_ASSIGN_UNIT_CODE` asigna a una unidad existente sin propietario. Se rechaza la reasignación silenciosa.

```bash
# Las variables deben configurarse de forma segura, evitando registrar contraseñas.
npm run add-user
```

La operación es transaccional y deja registro de auditoría. **No proporciona verificación de correo, contraseña temporal, MFA ni enlaces de invitación**. Compartir credenciales por canales autorizados, nunca en GitHub. No es un flujo final de alta de residentes.

## Importación CSV inicial de unidades

CSV UTF-8 con cabecera exacta: `code,kind,resident`. Se aceptan comillas escapadas, separadores y saltos de línea RFC4180; hasta 500 registros y 1 MB por importación. Valida duplicados, tipos, tamaño y aislamiento de la comunidad.

```bash
export DIGI_IMPORT_FILE='/ruta-privada/unidades-demo.csv'
export DIGI_TARGET_COMMUNITY_ID='id-comunidad-obtenido-de-la-base'
export DIGI_ADMIN_EMAIL='admin@ejemplo.test'
npm run import-units              # validación, NO escribe
export DIGI_IMPORT_APPLY=yes
npm run import-units              # escribe de forma atómica
```

Esta es una **herramienta local experimental**. No importar datos personales reales hasta validar permisos, jurisdicción, legalidad y procedimiento de migración. Nunca subir CSV con residentes a issues o commits.

## Anulación auditable de cuotas y pagos (iteración posterior)

El administrador puede **anular** una cuota o un pago erróneo aportando un motivo de 10 a 500 caracteres. La API guarda un reverso independiente, no elimina el movimiento original y solo admite un reverso por movimiento. Los saldos e indicadores excluyen movimientos anulados; la vista administrativa y el CSV muestran el estado y motivo del reverso. Los propietarios ven el estado anulado pero no el motivo administrativo. Los comprobantes bancarios, asientos contables formales y los reembolsos reales permanecen fuera de esta implementación.
