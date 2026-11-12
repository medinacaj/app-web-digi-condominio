# Directorio privado de personas por departamento — Fase inicial

**Estado:** implementación en rama de revisión, sin fusionar ni publicar, ligada a [PR #32 (notificaciones internas)](https://github.com/medinacaj/app-web-digi-condominio/pull/32) y [PR #24 (piloto SaaS)](https://github.com/medinacaj/app-web-digi-condominio/pull/24). Solo pruebas sintéticas. **No cargar datos personales reales** antes de una revisión de protección de datos, acceso y retención.

## Alcance implementado (SQLite v7)

- La relación del **propietario autenticado** sigue determinada únicamente por `units.owner_user_id`; el directorio lo muestra solo a administración. Nunca se otorgan permisos de usuario por registrar un contacto.
- Nueva tabla `unit_people` para residentes, arrendatarios, personas autorizadas y contactos de emergencia, asociada a una unidad y su condominio. Guarda nombre, email y teléfono opcionales, relación y un indicador **informativo** de contacto para gestiones de pago.
- Preferencias posibles: `none`, `email`, `sms`, `whatsapp`. Son datos declarados por el administrador y **NO constituyen consentimiento, identidad verificada ni habilitan entrega externa**. No existen proveedores de envío conectados ni colas de salida.
- El administrador puede **crear, corregir y desactivar** registros con eventos de auditoría y transacción; los inactivos siguen visibles **solo para administración** hasta que se defina retención y eliminación segura.
- Correo opcional normalizado a minúsculas; no se permite duplicar un mismo correo activo dentro de la misma unidad. Un mismo contacto puede pertenecer a dos unidades, pero las relaciones nunca se infieren entre condominios.
- Teléfono opcional solo con formato internacional E.164. Si se selecciona un canal sin la correspondiente dirección o número, el servidor rechaza el registro.
- Todos los campos de entrada están en allowlist; se rechazan `ownerUserId`, `role` y demás campos que intenten atribuir permisos. Todos los cambios se registran en `audit_events`.
- La bandeja de notificaciones de [PR #32](https://github.com/medinacaj/app-web-digi-condominio/pull/32) **no se envía a estos contactos**: se entrega únicamente dentro de la app al propietario autenticado de la unidad. El nuevo campo `paymentResponsible` no autoriza mostrar saldos ni recibir automáticamente avisos de deuda.

## API del piloto privado

| Ruta | Permisos |
|---|---|
| `GET /api/communities/:id/units/:unitId/directory` | Exclusivamente administrador del condominio; muestra propietario autenticado y contactos de esa unidad |
| `POST /api/communities/:id/units/:unitId/directory` | Exclusivamente administrador: crea contacto validado |
| `PATCH /api/communities/:id/units/:unitId/directory/:contactId` | Exclusivamente administrador: corrige campos permitidos de un contacto activo |
| `DELETE /api/communities/:id/units/:unitId/directory/:contactId` | Exclusivamente administrador: **baja lógica**, no borrado físico |

La aplicación web añade «Directorio» **solo** al menú administrador, con selector de departamento, datos de propietario, listado de contactos, formularios y baja. Las respuestas API llevan `Cache-Control: no-store`; para la modalidad hosted se mantienen cookies `HttpOnly` y token CSRF existentes.

## Pruebas

`tests/unit-directory.test.js` verifica permisos, separación por comunidad/unidad, que propietarios/comité no reciben correos ni registros privados en `overview`, creación y corrección, validación de teléfonos y preferencia, duplicados, bajas, auditoría y rollback ante fallo, y métodos HTTP. `tests/schema-version.test.js` y `tests/account-migration.test.js` esperan ahora esquema v7 sin pérdida de registros financieros. Requiere CI Linux, Windows, browser y contenedor antes de revisión.

## Dependencias siguientes

1. Validación jurídica de propiedad y de ocupación; contactos nuevos **no son miembros verificados**.
2. Consentimiento verificable por canal y finalidad, revocación, actualización por el interesado, políticas de retención, borrado/exportación GDPR/ley local según jurisdicción y protección de teléfonos/correos (cifrado y copias de seguridad).
3. Contactos múltiples de responsabilidad compartida, historial de ocupación y políticas de facturación por unidad.
4. Recordatorios de vencimiento mediante reglas y saldo real confirmado, con separación entre deudas, pagos informados y pagos bancarios conciliados.
5. Revisión de accesibilidad y de migración restaurable v6→v7 antes de producción.

**No enviar correos, WhatsApp, SMS ni push automáticamente. Ningún pago se confirma por esta función.**