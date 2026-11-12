# Consentimiento de comunicaciones — Fase de autogestión de propietarios

**Estado:** mejora en PR independiente, apilada sobre [PR #34 — Recordatorios](https://github.com/medinacaj/app-web-digi-condominio/pull/34), aún no desplegada.

## Implementado

- Los propietarios **autenticados** pueden aceptar o retirar por separado comunicaciones futuras por correo para dos finalidades: `billing_updates` (cuotas/pagos) y `community_news` (comunicados).
- Por defecto **sin autorización**, y las preferencias solo las modifica el propio propietario desde «Notificaciones»; la administración no puede consentir por él.
- Base SQLite esquema **v9**, `communication_consent` y `communication_consent_events`. Cada cambio queda en auditoría con identidad de usuario autenticado, fecha, finalidad, canal y estado (sin contraseña/token). La retirada no borra los eventos históricos de auditoría.
- API privada: `GET /api/communities/:id/communication-consent` y `PUT /api/communities/:id/communication-consent`, ambas con sesión y aislamiento por comunidad; el `PUT` exige exclusivamente `{purpose,channel:'email',enabled:boolean}` y control CSRF ya existente en modo hosted.
- La página «Notificaciones» muestra botones para autorizar y retirar. Los avisos internos in-app continúan disponibles independientemente de la autorización para correos.
- Las preferencias `contactPreference` del directorio del [PR #33](https://github.com/medinacaj/app-web-digi-condominio/pull/33) **no se convierten en consentimientos**. Los residentes no autenticados todavía no pueden otorgar consentimiento verificado.

## Límites de seguridad

- La evidencia confirma **la acción del usuario autenticado**, pero **no la titularidad del email**: aún no existe un proceso de verificación de dirección para este módulo. Por ello `verifiedChannel:false` y `externalDeliveryEnabled:false` se mantienen en todas las respuestas. No se envía correo, SMS ni WhatsApp.
- Antes de enviar mensajes: verificar dirección, registrar versión y texto legal de consentimiento aplicable, políticas de retención y finalidad, derecho de retirada, usuario que realiza la acción, integración de un proveedor de mensajes, supresión y prueba de identidad. Revisar normativa del país donde opere cada condominio.
- Los avisos esenciales dentro de la plataforma, necesarios para gestionar las cuotas ya aceptadas, son independientes de la autorización comercial/de entrega por correo. No usar este campo como justificación automática para campañas de marketing.
- **No recopilar datos personales reales** mientras sea un piloto/demo sin la infraestructura aprobada.

## Comprobaciones

`tests/communication-consent.test.js` valida denegación por defecto, permisos, finalidad, revocación independiente, datos ajenos, intentos de autoatribución de identidad, auditoría y rollback, aislamiento y API HTTP sin caché. `tests/browser-e2e.py` comprueba botones de aceptación/retirada. Las pruebas de migración pasan de v8 a v9, conservando información financiera y de contactos.

**Pendiente:** verificar identidad del correo (doble opt-in), identidad real de los residentes, política legal local y servicio de envío con outbox auditable. Sin emails enviados ni tareas programadas.

Relacionado con [Issue #31](https://github.com/medinacaj/app-web-digi-condominio/issues/31).