# Backlog inicial propuesto — Digi-Condominio

**No aprobado como alcance definitivo.** Prioridades orientativas. País, marca y stack siguen por decidir.

## Fase 0 — Descubrimiento y definición

- P0 Definir lanzamiento inicial (Chile/Venezuela/otro), perfil de administrador y 3 procesos críticos.
- P0 Validar requisitos con administradores, comité y propietarios; priorizar decisiones contables/financieras.
- P0 Matriz legal y de privacidad por jurisdicción, retención de comprobantes y roles.
- P0 Aprobar MVP, exclusiones y criterios de éxito; registrar decisiones y tests de aceptación.
- P1 Seleccionar arquitectura, proveedor, costos y continuidad (ADR).

Criterio de salida: mapa de usuarios, flujos verificables, MVP acotado, modelo de permisos y decisiones aprobadas.

## Fase 1 — Base técnica y seguridad

- P0 Crear proyecto, lint, tests, CI, variables ejemplo sin secretos, ambientes separados.
- P0 Autenticación, invitaciones y autorización por operación.
- P0 Entidades `tenant/community/building/unit/user/membership` con aislamiento probado.
- P0 Registro auditable de acceso/cambio y pruebas negativas entre comunidades.
- P1 Políticas de copias, pruebas de restauración, errores y monitoreo.

Criterio de salida: pruebas automatizadas que demuestren que usuario A no accede a datos de comunidad B, mediante API/DB, sin privilegios de administrador.

## Fase 2 — Gestión operativa y financiera

- P1 Propietarios y residentes con relaciones históricas e invitación.
- P1 Cuotas/conceptos y generación de cargos idempotente.
- P1 Registro de pagos manual con comprobante privado, estado y reversos auditables.
- P1 Saldos, estados de cuenta, gastos/proveedores y reportes exportables.
- P1 Avisos/documentos privados y portal responsive.
- P1 Importación CSV/Excel con vista previa, validación, exportación de errores y registro de importaciones.

Criterio de salida: flujo de principio a fin repetible con datos sintéticos y pruebas de permisos, sumas y duplicados.

## Fase 3 — Piloto controlado

- P1 Guion de carga de datos ficticios primero; después validación de contratos/permisos antes de datos reales.
- P1 Pruebas de usabilidad, accesibilidad, móvil, seguridad, auditoría y respaldo.
- P1 KPI inicial: tiempo de cierre, tasa de activación, cuotas/pagos registrados, incidencias, adopción.
- P2 Confirmar disposición de pago y soporte, no publicar información privada.

Criterio de salida: piloto evaluado, pruebas registradas y decisión explícita de liberar.

## Fuera de alcance preliminar

Bancos/pasarela propia, custodia de fondos, contabilidad legal completa, IoT, acceso físico, votaciones, reservas y módulo avanzado de incidencias/propietario remoto.

## Reglas de cada issue

Objetivo, contexto, criterios de aceptación comprobables, seguridad/privacidad afectada, dependencias, evidencia de pruebas, enlace PR y estado `propuesto/aprobado/implementado/probado/publicado`.

## Estado de entrega (reconciliación 2026-10-25)

**Implementado y comprobado en entorno local:** unidades, roles y aislamiento básico, cargos y pagos manuales, estado de cuenta, anulaciones auditables, avisos, metadatos de documentos, proveedores y gastos, reportes CSV, importación CSV y respaldos de SQLite; 29 tests v0.4.1.

**No implementado o no aprobado:** carga/descarga segura de archivos, control de acceso de comité según normativa local, MFA, recuperación de cuentas, invitaciones autenticadas, XLSX, migraciones de esquema y auditoría independiente, integraciones bancarias/pagos, sistema de notificaciones, backups cifrados con restauración operacional, E2E navegador/backend, disponibilidad 24/7, despliegue y conformidad legal.

**Regla de calidad:** un requisito sólo cuenta como completado cuando exista código en `main`, test y evidencia verificable; las decisiones de negocio y normativas requieren aprobación explícita independiente. Este documento conserva el backlog propuesto para facilitar esa decisión.

## Incidencias residenciales (iteración en PR #17)

En desarrollo: alta de reportes por unidad/área común, categorías, prioridad, estados, comentarios y permisos por rol; 32 pruebas Node locales y prueba visual/API a través de puente; CI directo pendiente. **No** incluye fotografías, avisos externos, SLA, asignaciones ni mantenimiento preventivo. Estas extensiones se priorizarán después de la decisión de jurisdicción, privacidad y arquitectura de producción.
