# Recordatorios privados de vencimiento de cuotas — Fase manual in-app

**Estado:** implementación de piloto en un PR dependiente de [PR #33: directorio](https://github.com/medinacaj/app-web-digi-condominio/pull/33), [PR #32: notificaciones](https://github.com/medinacaj/app-web-digi-condominio/pull/32) y [PR #24: SaaS](https://github.com/medinacaj/app-web-digi-condominio/pull/24). **No fusionado, no desplegado, no hay envíos externos.**

## Regla funcional

La administración puede asignar **una fecha de vencimiento explícita** (opcional, `AAAA-MM-DD`) al emitir una cuota. Las cuotas históricas sin fecha siguen sin vencimiento definido para este flujo; el sistema **no inventa fechas a partir del período**.

Desde el menú privado «Cuotas», un administrador utiliza:

1. **Previsualizar recordatorios:** muestra unidades autorizadas con saldo neto positivo, propietario con membresía activa, y al menos una cuota activa con vencimiento próximo (en 0–5 días UTC) o una fecha ya transcurrida.
2. **Guardar avisos internos:** requiere una segunda acción humana. Crea una entrada en la bandeja privada del **propietario actualmente vinculado**; no envía emails, SMS, WhatsApp ni push.
3. Si vuelve a ejecutar el lote, no duplica avisos con el mismo propietario, fecha y estado. Un mismo vencimiento admite como máximo un recordatorio próximo; si pasa a vencido admite uno de esa fase **por mes UTC**. El estado y saldo se recalculan antes del envío interno.
4. Si se revierte una cuota o un pago, la elegibilidad se vuelve a calcular mediante sumas de movimientos activos. Si la unidad no tiene saldo neto positivo o propietario con acceso, no genera avisos.

### Precisión contable importante

El piloto registra abonos **por unidad, no imputados a una cuota concreta**; por lo tanto, los recordatorios no afirman que una factura particular esté impaga. Informan que, según el libro administrativo local, **la unidad presenta un saldo neto positivo y existe una fecha de vencimiento cercana o transcurrida**. Esto no equivale a una deuda legal validada, a conciliación bancaria, a intereses por mora ni a confirmación de un pago.

La fecha de ejecución es **UTC** hasta implementar una zona horaria y política por condominio, evitando cálculos silenciosos con la zona local del navegador.

## Persistencia y API

- Nueva tabla aditiva `charge_deadlines` (SQLite esquema **v8**) con FK a `charges`, comunidad y fecha. No altera estructuras previas ni asigna fechas históricas.
- La fila de vencimiento, la cuota, la auditoría y el aviso inicial de cuota se escriben en la misma transacción.
- Usa la bandeja existente `unit_notifications` de la fase anterior. Los avisos de recordatorio se etiquetan mediante título y fuente idempotente `reminder:...` con el tipo compatible `unit_message`; no introduce mensajes de nuevos canales.
- `GET /api/communities/:id/reminders/preview`: rol **admin**, solo resumen privado de unidades, plazo, balance y estado; no expone correos de propietarios ni contactos.
- `POST /api/communities/:id/reminders/prepare`: rol **admin**, protegido por autenticación y CSRF del piloto, preparación auditada y transaccional. La respuesta distingue `created` y `externalMessagesSent:0`. La fecha efectiva se calcula **en servidor**, nunca por un parámetro de la API pública.
- Límite de **1000 unidades por lote**; no realiza procesamiento parcial silencioso. Volúmenes mayores requieren diseño de colas, paginación, transacciones por lotes y gobernanza operativa.
- La bandeja del dueño anterior continúa inaccesible tras cambio de titular, según [PR #32](https://github.com/medinacaj/app-web-digi-condominio/pull/32).

## Tests incluidos

`tests/due-reminders.test.js`: fechas inexistentes, años bisiestos, ventana UTC, saldo neto, cuotas sin vencimiento, reversos, owner sin cuenta, permisos por condominio, cadencia de recordatorios, batch idempotente, rollback ante fallo de auditoría, respuesta HTTP y ausencia de envíos externos.

`tests/browser-e2e.py`: el administrador emite una cuota con fecha próxima, previsualiza, prepara el aviso interno y comprueba la recepción en la bandeja del propietario; los contactos del directorio no lo reciben.

`tests/schema-version.test.js` y `tests/account-migration.test.js`: actualización al esquema v8 y conservación de datos anteriores.

## Trabajos pendientes

- Aplicación de una política de vencimiento validada por la asamblea/reglamento y zona horaria de cada condominio, con revisión de mora, períodos de gracia y feriados.
- Asignación **transaccional y verificable** de pagos a cuotas, confirmación bancaria/conciliación, recibos PDF privados y estado de pagos. No conectar medios de pago sin autorización.
- Consentimiento verificable por canal y finalidad, mecanismos de baja/rectificación y revisión de privacidad para email/WhatsApp/SMS. Las preferencias de contactos del [PR #33](https://github.com/medinacaj/app-web-digi-condominio/pull/33) son **informativas**, no habilitan entrega.
- Outbox durable, reintentos seguros, backoff, alertas y proveedor de correo/sms después de aprobación. **Este PR no incorpora ni activa un scheduler automático**, por lo que no hará recordatorios sin que el administrador pulse «Guardar avisos internos».
- Políticas de retención/anonimización, accesibilidad, restauración de backups y pruebas de concurrencia en despliegue multiempresa.

[Seguimiento funcional #31](https://github.com/medinacaj/app-web-digi-condominio/issues/31). No introducir datos reales en la demo ni convertir las preferencias de residentes en una lista de envío sin consentimiento.
