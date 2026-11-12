# Pagos informados y revisión administrativa — Fase incremental

**Estado:** implementación de piloto en rama/PR sobre [PR #35](https://github.com/medinacaj/app-web-digi-condominio/pull/35) (consentimiento), [PR #34](https://github.com/medinacaj/app-web-digi-condominio/pull/34) (vencimientos), [PR #33](https://github.com/medinacaj/app-web-digi-condominio/pull/33) (directorio), [PR #32](https://github.com/medinacaj/app-web-digi-condominio/pull/32) (bandeja) y [PR #24](https://github.com/medinacaj/app-web-digi-condominio/pull/24) (SaaS). **No publicado ni conectado a entidades bancarias**.

## Estados y efectos

El propietario autenticado de una unidad puede declarar **`informado`**, enviando únicamente unidad vinculada, referencia única por condominio, concepto y monto. Es un reporte, **no un abono**: no reduce el saldo ni aparece como pago del libro.

| Transición | Actor | Efecto financiero |
|---|---|---|
| Nuevo → `informado` | Propietario actualmente vinculado | Ninguno; declaración en tabla independiente |
| `informado` → `en_revision` | Administrador | Ninguno; aviso interno al propietario |
| `en_revision` → `rechazado` | Administrador con justificación | Ninguno; aviso interno de rechazo |
| `en_revision` → `confirmado` | Administrador con justificación tras revisión de constancia externa | **Registra un pago administrativo** en el libro existente, con referencia única; emite aviso interno de abono. NO es conciliación bancaria automática |
| `confirmado` → `reversado` | Administrador con justificación | Revierte el abono en libro mediante mecanismo de reversos auditados |

No se admiten saltos de estados arbitrarios, confirmaciones repetidas ni doble reverso. Si falla la escritura del libro, la auditoría o la transición, se revierte la operación completa.

**Advertencia financiera:** el estado `confirmado` expresa confirmación **administrativa**, no certificación de banco, pasarela de pago ni transferencia irrevocable. Las respuestas incluyen siempre `bankReconciled:false`; no existen conectores bancarios ni verificación documental automática. La confirmación exige revisión humana y evidencia fuera del sistema.

## Persistencia y privacidad

SQLite **v10** añade `payment_reports` (condominio, unidad, propietario declarante, referencia, concepto, monto, estado y vínculo a abono administrativo opcional) y `payment_report_events` (actor, transición, justificación y fecha). Los informes **no** reescriben historial ni alteran los saldos hasta `confirmado`.

- El propietario solo ve informes **que él presentó mientras sigue siendo propietario de la unidad**. El administrador con permisos ve informes del condominio. El comité no tiene acceso.
- Al cambiar el propietario de la unidad, su acceso a reportes antiguos se revoca automáticamente; el historial queda para administración.
- El propietario no puede elegir otro usuario, declarar un estado, modificar montos existentes ni confirmar su propio reporte.
- La justificación interna de revisión no se expone al propietario en la lista ni dentro de las notificaciones.
- Rechazar, confirmar, revisar y reversar solo es posible con sesión de administración; en modo hosted se mantiene CSRF y cookies `HttpOnly`.
- No se adjuntan capturas ni datos bancarios (podrían contener PII); antes de operar sobre pagos reales se necesita un sistema privado de comprobantes, antimalware, retención y revisión legal.

## API (solo piloto)

- `GET /api/communities/:id/payment-reports`: listado según el rol y propietario asignado.
- `POST /api/communities/:id/payment-reports`: propietario declara pago `{unitId,reference,concept,amountMinor}`, respuesta `{id,status:'informado',ledgerPosted:false,bankReconciled:false}`.
- `POST /api/communities/:id/payment-reports/:reportId/decision`: solo admin `{action:'review'|'confirm'|'reject'|'reverse',note}` con justificación de al menos 10 caracteres. La transición aprobada se registra en auditoría y en `payment_report_events`.

## Pruebas

`tests/payment-report-review.test.js`: bloqueo de doble registro, elegibilidad por comunidad/unidad, permisos, rechazo, validación de entrada, transición completa, duplicados, reversos, auditoría y rollback. `tests/browser-e2e.py`: propietario informa pago y ve `informado` en el panel, sin registro financiero automático. `tests/schema-version.test.js` y `tests/account-migration.test.js` migran a v10 y preservan cuotas/pagos previos.

## Pendiente para operación real

1. Verificar documentación, identidad y autorización de usuarios; integrar estados `evidencia_recibida` y adjuntos privados controlados si procede.
2. Conciliación bancaria a través de proveedor aprobado, idempotencia por transacción y moneda; aplicar pagos a cuotas específicas. **No se ha implementado**.
3. Notificaciones por correo y WhatsApp exclusivamente después de verificar email, capturar consentimiento legal versionado y aprobar un sistema de colas/entrega seguro.
4. Política de disputas, reembolsos, contracargos, retención financiera y respaldo.
5. Revisión de seguridad, accesibilidad y pruebas E2E de red, antes de producción.

Referencia: [Issue #31](https://github.com/medinacaj/app-web-digi-condominio/issues/31) y [Issue #7](https://github.com/medinacaj/app-web-digi-condominio/issues/7). Ningún pago real fue ejecutado ni reconciliado en esta fase.