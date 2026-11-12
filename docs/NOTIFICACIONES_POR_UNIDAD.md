# Bandeja privada de notificaciones por departamento · Primera etapa

**Implementación en PR, no publicada ni productiva.** Se basa en el piloto SaaS de [PR #24](https://github.com/medinacaj/app-web-digi-condominio/pull/24) (rama `feat/saas-online-pilot`). No modifica las páginas estáticas de GitHub Pages ni habilita envíos externos.

## Comportamiento implementado

- La creación de una **cuota** para una unidad con propietario vinculado genera una entrada `charge_created` en su bandeja.
- Registrar un **pago manual** genera `payment_recorded`. Su texto **no** dice «transferencia recibida» ni «pago bancario confirmado»: solo refleja una operación registrada por el administrador.
- Una **anulación de cuota o pago** genera un aviso correctivo para el propietario asignado, sin publicar el motivo administrativo o referencias bancarias.
- La administración puede dirigir un **mensaje exclusivo** (`unit_message`) a una unidad que tenga propietario asignado; el mensaje se guarda solamente en la bandeja del propietario.
- El propietario consulta «Notificaciones», puede marcar cada aviso como leído y mantiene la lectura entre sesiones. El sistema registra en auditoría la primera lectura.
- Si la unidad cambia de propietario, el dueño anterior **pierde acceso** a los avisos de esa unidad. El nuevo titular no hereda mensajes privados anteriores; recibe los que se generen después de su vinculación.
- Si la unidad carece de propietario, los eventos de cuota/pago siguen registrándose sin inventar destinatarios; enviar un mensaje explícito devuelve 409.
- Nunca se incluyen contraseñas, referencias de transferencia, importes o direcciones de correo dentro de las notificaciones automáticas.
- La persistencia usa la tabla `unit_notifications` (esquema SQLite v6), con claves externas a comunidad/unidad, restricción única para no duplicar por evento y destinatario y escrituras transaccionales junto a la auditoría.

## API local/piloto

| Método y ruta | Permisos | Resultado |
|---|---|---|
| `GET /api/communities/:id/notifications` | Sesión con membresía; solo `owner` recibe su bandeja | Hasta 100 avisos propios, sin saldos ni datos ajenos |
| `PATCH /api/communities/:id/notifications/:noticeId/read` | Propietario destinatario **todavía vinculado a la unidad** | Marca lectura idempotente con auditoría |
| `POST /api/communities/:id/units/:unitId/messages` | Administrador de esa comunidad | Guarda aviso interno para propietario actual, sin email/WhatsApp |
| `GET /api/communities/:id/overview` | Roles existentes | Añade campo `notifications`, filtrado por usuario y unidad |

El piloto HTTPS conserva cookies HttpOnly y protección CSRF para solicitudes que escriben. **No se deben usar datos personales reales** en el MVP ni abrir su servidor local al público.

## Pruebas de aceptación

`tests/unit-notifications.test.js` valida: anulaciones con aviso correctivo e idempotencia, propietario y unidad correctos, límites entre comunidades, rechazo a comité y usuarios externos, ausencia de importes/referencias en avisos automáticos, deduplicación, transacción cuota+notificación+auditoría, revocación al cambiar dueño, lectura de destinatario y métodos API. `tests/schema-version.test.js` verifica la migración de esquema v5→v6.

## Pendientes explícitos

1. Directorio normalizado de **propietarios, arrendatarios y ocupantes autorizados**, preferencias y consentimiento por canal. El campo `resident` actual es solo texto libre, no un perfil de mensajería.
2. Segmentación por piso, torre, comunidad, grupos autorizados y responsables de pagos. Las notificaciones implementadas se limitan al **propietario vinculado a una unidad**.
3. Outbox de entrega externo con idempotencia/reintentos, proveedor de email autorizado, estados de entrega y revocación de consentimiento. No hay emails/SMS/WhatsApp/push enviados.
4. Estados financieros `informado/en_revision/confirmado/rechazado/reversado`, conciliación bancaria fiable y recibos digitales privados; no enviar «pago recibido» definitivo sin evidencia.
5. Política de privacidad y normativa según país, plazos de retención, retención de datos antiguos, seguridad de datos, escalado a BD SaaS multiempresa productiva y pruebas de concurrencia.
6. Revisar migración + respaldos de bases reales con v5, QA de interfaz, accesibilidad y aprobación antes de publicar.

Referencias: [Issue #31](https://github.com/medinacaj/app-web-digi-condominio/issues/31), [Issue #7](https://github.com/medinacaj/app-web-digi-condominio/issues/7) (pagos), [Issue #15](https://github.com/medinacaj/app-web-digi-condominio/issues/15) (comunicaciones), [PR #24](https://github.com/medinacaj/app-web-digi-condominio/pull/24) (piloto SaaS).

**No equivalente a sistema de notificación automatizada externo ni a recepción bancaria certificada.**
