# Imputación administrativa de pagos a cuotas — fase del piloto

**Estado:** implementación preparada para revisión, basada en [PR #36 (pagos informados y revisión)](https://github.com/medinacaj/app-web-digi-condominio/pull/36), y por tanto dependiente de PR #35, #34, #33, #32 y #24. **No merge, no deploy, sin dinero real ni integraciones bancarias.**

## Propósito

La administración puede señalar qué parte de un **abono ya registrado en el libro interno** corresponde a una cuota de la misma unidad. No se vuelve a sumar ni descontar el pago: **la imputación no cambia el saldo neto de la unidad**, solo distribuye el valor entre cuotas.

La base SQLite v11 añade `payment_allocations`: identificador, comunidad, unidad, pago y cuota, importe en unidades menores, autor administrativo, fecha y una restricción única por pareja pago/cuota. Un trigger SQLite comprueba que ambos movimientos pertenecen a **la misma unidad y condominio**, incluso ante escritura directa en SQL.

### Reglas

- Solo un **administrador** de la comunidad puede realizar la imputación; el propietario autenticado y actualmente vinculado a la unidad **solo la consulta**. El comité y administradores de otros condominios no pueden hacerlo.
- Un pago puede cubrir **varias cuotas** y una cuota puede acumular varios pagos. Se permite un importe parcial positivo en enteros (unidades menores), nunca superior al importe **sin imputar del pago** ni al saldo **pendiente de imputación de la cuota**.
- No se crea una segunda imputación para la misma pareja pago/cuota; la API responde conflicto para impedir dobles escrituras. Tampoco se aceptan campos como `bankReconciled`, `ownerUserId` ni IDs de unidades manipulados.
- La operación se verifica dentro de una transacción SQLite con `BEGIN IMMEDIATE`, inserta el vínculo y su auditoría, y confirma conjuntamente. Si falla la escritura o auditoría, todo se revierte.
- Una **cuota anulada** deja de contar sus imputaciones: el pago recupera disponibilidad para ser imputado a otra cuota. Un **pago reversado** deja de cubrir cualquier cuota. Los vínculos históricos se conservan para auditoría, sin borrarlos o reescribirlos.
- La consulta devuelve solo cuotas/pagos **activos**, el total imputado y libre, más pares de imputación vigentes; limita temporalmente los resultados a 500 cuotas, 500 pagos y 5.000 imputaciones por unidad. Si se supera ese tamaño responde conflicto y exige paginación antes de uso masivo.
- La suma de cuotas sin imputar y los pagos sin imputar **no deben confundirse con la deuda legal o financiera**; si existían abonos sin asignar, el saldo global del departamento podía ser cero aunque una cuota aparezca «sin imputar».

## API y pantalla

- `GET /api/communities/:communityId/units/:unitId/allocations`: administrador o propietario autenticado actualmente vinculado, exclusivamente de esa unidad. Devuelve `charges`, `payments`, `allocations`, `openChargesMinor`, `unallocatedPaymentsMinor`, `bankReconciled:false`.
- `POST /api/communities/:communityId/units/:unitId/allocations`: exclusivamente administrador, requiere `{chargeId,paymentId,amountMinor}`. La unidad se fija en la ruta, no se acepta del cliente; autenticación/CSRF de piloto y respuesta sin caché.
- Nueva pantalla privada **«Imputaciones»**: selector de unidad, tablas de cuotas/pagos activos, importes asignados y pendientes, y formulario de imputación para administración. El propietario dispone de vista informativa sin posibilidad de escribir.

## Pruebas

`tests/payment-allocations.test.js`: pagos parciales, múltiples cuotas, límites, prevención de duplicados, permisos, privacidad por comunidad y unidad, cambio de propietario, reversos, disparador SQLite de integridad, rechazo de payload arbitrario, rollback por fallo de auditoría y solicitudes HTTP autenticadas.

`tests/browser-e2e.py`: administrador registra pago informado por propietario, lo revisa y registra como abono, luego imputa un importe a la cuota y comprueba la tabla. Genera capturas sintéticas en escritorio y móvil. La migración a SQLite v11 se comprueba en `tests/schema-version.test.js` y `tests/account-migration.test.js`.

## Límites obligatorios

**No existe conciliación de banco, pasarela, tarjeta ni recibo fiscal verificado.** El pago debe estar previamente registrado y revisado; tampoco se han implementado documentos de comprobante ni transferencias reales. La imputación refleja decisiones de contabilidad administrativa y está sujeta a rectificación/auditoría.

La producción requiere: reglas aprobadas de asignación, cargos de intereses y pagos anticipados, comprobantes privados, protección de PII, procedimientos de disputa y reverso, reportes contables, concurrencia y pruebas con un proveedor de pagos autorizado. No cargar datos reales en el sitio de demostración.

Relacionado con [Issue #7](https://github.com/medinacaj/app-web-digi-condominio/issues/7) y [Issue #31](https://github.com/medinacaj/app-web-digi-condominio/issues/31).