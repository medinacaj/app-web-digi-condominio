# Base de cuentas SaaS — entrega local

## Alcance implementado

Una aplicación para dos tipos de cliente: condominio independiente (`independent`) y empresa administradora (`management_company`). Cada cuenta contiene condominios y cada condominio contiene unidades. Una identidad puede trabajar en varias cuentas con permisos diferentes.

Esta entrega implementa el modelo y su administración **en el entorno de desarrollo**. El servidor sigue escuchando solo en loopback. No hay todavía servicio SaaS alojado, registro público, facturación, invitaciones por correo, recuperación de cuentas ni infraestructura productiva.

## Cuentas y permisos

- `account_admin`: administra metadatos de su cuenta, crea condominios y concede o revoca asignaciones explícitas. No ve movimientos financieros por el solo hecho de administrar la cuenta.
- `member`: pertenece a la cuenta sin administrarla.
- `admin`, `committee`, `owner`: roles operacionales existentes, asignados por condominio. Siempre requieren además membresía vigente de cuenta.

La sección **Gestión de cuenta** muestra condominios, miembros, asignaciones y auditoría. Permite crear condominios, cambiar permisos de miembros existentes y conceder/quitar acceso operacional. Los propietarios y comités no pueden acceder a esta sección.

La revocación de cuenta se aplica incluso a sesiones ya abiertas y corta todos los condominios de esa cuenta. La revocación por condominio solo corta ese alcance. Se conserva el historial y las asignaciones operacionales dormidas: **reincorporar una membresía de cuenta restaura sus asignaciones anteriores**. Revisarlas antes de reincorporar. No se puede revocar ni degradar al último administrador de cuenta.

Los cambios de cuenta/condominio vacían formularios, búsquedas y datos anteriores y descartan respuestas obsoletas. Los permisos reales se comprueban en el servidor; modificar IDs o el selector no autoriza accesos adicionales.

## Primer arranque y alta asistida

En una base nueva, `npm run bootstrap` o el asistente local crean cuenta, condominio y administrador operacional explícitos. `DIGI_ACCOUNT_KIND` permite `independent` (predeterminado) o `management_company`; `DIGI_ACCOUNT_NAME` permite nombrar la cuenta separadamente. El asistente web ofrece ambos tipos.

Para crear otro cliente de prueba, un operador local configura de forma segura estas variables y ejecuta `npm run provision:account`:

- `DIGI_DB_PATH`: ubicación de la base.
- `DIGI_ACCOUNT_NAME`: nombre del cliente.
- `DIGI_ACCOUNT_KIND`: uno de los dos tipos.
- `DIGI_ACCOUNT_ADMIN_EMAIL`: identidad responsable; se reutiliza si ya existe.
- `DIGI_ACCOUNT_ADMIN_PASSWORD`: solo necesaria al crear una identidad nueva, de 12 a 128 caracteres.

El operador local tiene acceso administrativo a los archivos: estas CLI no son APIs públicas de registro ni deben exponerse como endpoints. No almacenar contraseñas en archivos del repositorio, comandos registrados, chats o issues. Para dar acceso a personas nuevas se mantiene `npm run add-user`, que crea la identidad y membresía ordinaria de cuenta junto con su asignación operacional; después el administrador de cuenta puede gestionar sus permisos desde la web. Todavía no hay invitaciones verificadas.

Un administrador de cuenta sin condominios asignados puede entrar a Gestión de cuenta, crear un condominio y asignarse explícitamente el rol operacional correspondiente.

## Migrar una base local anterior

Las bases nuevas usan esquema **4**. Una base anterior con comunidades no se convierte automáticamente. La migración admite **versión 3** y exige detener la aplicación, un mapeo explícito y un archivo de respaldo nuevo. No ejecutar sobre datos reales sin revisión y recuperación ensayada.

El operador debe identificar los UUID existentes de comunidades y usuarios y preparar un JSON privado como este (los identificadores son solo ejemplos):

```json
{
  "accounts": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "Administradora de prueba",
      "kind": "management_company",
      "adminUserIds": ["22222222-2222-4222-8222-222222222222"]
    }
  ],
  "communities": [
    {
      "communityId": "33333333-3333-4333-8333-333333333333",
      "accountId": "11111111-1111-4111-8111-111111111111"
    }
  ]
}
```

Cada comunidad existente debe aparecer exactamente una vez. Cada cuenta debe tener al menos una comunidad y responsables existentes explícitos; no se deducen por coincidencia de nombres, email o antiguos roles operacionales.

Configurar `DIGI_DB_PATH`, `DIGI_ACCOUNT_MAPPING` (ruta del JSON) y `DIGI_MIGRATION_BACKUP` (ruta de archivo nuevo) y ejecutar `npm run migrate:accounts`. El procedimiento:

1. Comprueba versión, integridad y mapeo completo bajo bloqueo de escritura.
2. Crea y verifica un snapshot SQLite sin sobrescribir archivos existentes.
3. Migra dentro de una transacción e incorpora las membresías ordinarias necesarias para conservar asignaciones.
4. Verifica relaciones e integridad y confirma esquema 4; revierte los cambios de esquema si falla.

El respaldo previo **no está cifrado**. Guardarlo en ubicación privada fuera del repositorio y protegerlo. No reemplazar bases a mano mientras hay procesos abiertos. No eliminar el original ni el respaldo hasta comprobar login, saldos, permisos e incidencias. La migración no agrupa clientes por heurísticas ni asciende automáticamente a todos los administradores de condominio. Las versiones distintas de 3 requieren diagnóstico independiente.

## Validación y límites

Las pruebas cubren ambos modelos, aislamiento de cuentas, revocación con sesión existente, protección del último administrador, auditoría atómica, migración real v3 y respaldo, conservación de saldos y permisos, rechazo de mapeos inválidos y recorrido web con respuestas demoradas. Los resultados de esta entrega se registran en el informe de trabajo; configurar CI no afirma que el job remoto haya corrido.

Sigue pendiente resolver los hallazgos históricos de incidencias de más de 100 eventos, auditoría de exportaciones y política de privacidad de propietarios anteriores. Esta entrega no los da por corregidos.

Antes de acceso externo: elegir hosting y base de datos productiva, HTTPS, sesiones web seguras, identidad/recuperación, servicio de correo, almacenamiento privado, operación de backups, monitoreo y marco legal. Planes y cobros del SaaS se diseñarán aparte.
