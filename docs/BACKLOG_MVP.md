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
