# Decisiones y cambios

## 2026-10-25 — auditoría del repositorio (verificado)

- Existe `medinacaj/app-web-digi-condominio`, privado, rama `main`, un commit inicial, README de 25 bytes.
- No hay aplicación ni pruebas ni issues ni PRs previos.
- La rama `main` aparece sin protección.
- La consulta de rulesets devolvió 403 con aviso de plan de GitHub; **no se cambió la visibilidad**.
- Implicación: empezar con planificación y seguridad, sin afirmar capacidad funcional.

## 2026-10-25 — paquete documental (propuesto, no integrado)

- Crear documentación portable, auditoría, backlog, política de seguridad y manifiesto.
- Objetivo: que otro asistente o desarrollador pueda continuar desde GitHub sin depender del chat.
- Estado: rama/PR para revisión. Esta entrada **no acredita** integración, tests o publicación.

## Decisiones vigentes y restricciones

- **Repositorios privados y protección intelectual:** preferencia del propietario; no hacer público ni añadir terceros sin autorización.
- **Marca comercial:** no seleccionada; nombres candidatos se mantienen como «Posible», no como marca aprobada.
- **MVP, país y stack:** no aprobados; toda especificación del contexto es hipótesis hasta decisión expresa.
- **Método recomendado:** issues y PRs, con trazabilidad, pruebas y revisión antes de fusionar.
- **No hacer:** simular avances, cerrar tareas sin evidencia, exponer secretos o modificar visibilidad silenciosamente.

## Registro para decisiones futuras

Formato: fecha | identificador | propuesta o decisión | fuente | motivos | alternativas | impacto | issue/PR | validación.

## 2026-10-25 — seguimiento creado en GitHub (verificado)

- PR de documentación **#1** creado en estado borrador y no fusionado con `main`.
- Se crearon siete issues abiertos **#2–#8**: jurisdicción, privacidad, MVP, arquitectura, infraestructura y CI, integridad financiera, y protección de accesos.
- La rama contiene 12 archivos documentales; el manifiesto JSON fue leído y parseado correctamente. No se realizaron tests funcionales ni despliegues.
- Próxima acción: revisar documentos del PR, acordar qué propuestas se aprueban y trabajar issues por prioridad.

## 2026-10-25 — Prototipo web inicial, PR #9 (implementado en rama, no fusionado)

- Se inició interfaz navegable usando HTML, CSS y módulos JavaScript sin dependencias. **Decisión técnica reversible** para validación UX; backend y stack productivo no elegidos.
- Incluye menú responsive, filtro por comunidad, búsqueda, panel de indicadores de ejemplo, pagos y documentos ilustrativos y creación volátil de comunicados.
- Se añadieron pruebas `node --test`, pipeline de GitHub Actions de comprobación y documentación de limitaciones. Resultado local: 7/7 tests; archivos principales servidos HTTP 200.
- Las cifras y comunidades son sintéticas. Prohibido usar datos reales o anunciar esta versión como sistema productivo.
- PR #9 apunta a rama del PR #1; no se cambió `main`, visibilidad ni despliegues.

## 2026-10-25 — corrección responsive y comprobación visual

- El prototipo inicial generaba ancho adicional en vista móvil por columnas `1fr` con ancho mínimo implícito. Corregido usando `minmax(0,1fr)` en rejillas de dashboard y configuración.
- Captura offline con Chromium verificó anchura del documento igual al viewport a 360, 390, 768 y 1440 px; prueba de búsqueda, navegación y creación de comunicado sin errores JS.
- La navegación real mediante servidor HTTP en Chromium estuvo bloqueada por política del entorno; no se declara prueba end-to-end HTTP en navegador.

## 2026-10-25 — MVP local en PR #10 (implementación en rama)

- Se eligió **transitoriamente** Node.js 22 + SQLite integrado para backend local, sin dependencias externas. La API `node:sqlite` está marcada experimental; stack productivo **no aprobado**.
- Autenticación, roles y restricción por comunidad y unidad implementados del lado del servidor. Los datos de producción siguen prohibidos.
- Se implementaron altas auditables de unidades, cuotas, pagos manuales, comunicados y metadatos documentales; no hay eliminación, edición destructiva, conciliación ni pagos online.
- Se corrigió error de cantidad de parámetros en INSERT de pagos detectado en primera corrida de tests (15/16 → 16/16) y se añadió persistencia con reinicio (17/17).
- Chromium visual offline con API simulada validó interfaz y flujo básico; HTTP navegador está bloqueado por el entorno.
- PR #10 depende del PR #9 y conserva el repositorio privado; no se publica ni fusiona sin revisar.

## 2026-10-25 — Más avances funcionales en PR #10

- Implementados proveedores/gastos, CSV UTF-8 protegido de inyección de fórmulas, respaldo online SQLite con validación, importación CSV de unidades con previsualización y rollback, y aprovisionamiento de usuarios por CLI con rol por comunidad.
- Se mantuvo la restricción a acceso local `127.0.0.1`, sin servicios externos, permisos reales, ni publicación. El sistema continúa como MVP experimental, no liberación productiva.
- Al 25-10-2026 `npm run check` pasó **23 de 23 tests**. No se certifica seguridad con ello.
- El PR #10 es dependiente del #9 y del #1. Las decisiones de país, cumplimiento legal, credenciales productivas, infraestructura y marca permanecen pendientes.

## 2026-10-25 — Anulación auditada de movimientos (v0.4.0)

- Se evita corregir importes eliminando registros: las anulaciones son entradas independientes por tipo y movimiento, únicas por comunidad, con motivo y usuario responsable.
- Saldos y totales consideran solo movimientos activos. La visibilidad del motivo está restringida a administradores, aunque propietarios ven estado de anulación.
- 24/24 pruebas locales correctas y CI del código v0.4.0 confirmado verde. Función implementada en PR #10, no necesariamente integrada a `main` hasta merge.

## 2026-10-25 — Integración confirmada y seguridad v0.4.1

- Fusionados PR #1 (contexto), #9 (UI) y #10 (MVP local) con commits de merge respectivamente `2d8c1430`, `5b1e54ec` y `547e4b19`.
- Verificado CI de `main` v0.4.0: run **40227481519**, **success**.
- Auditoría posterior detectó regresión en `.gitignore`: se habían perdido patrones para archivos `.env`, certificados, directorios privados. Se restauraron y añadieron pruebas de regresión; no se encontraron tales archivos en el inventario del repositorio.
- Se vinculan altas financieras, documentales y reversos con el evento de auditoría usando `SAVEPOINT` SQLite para permitir importaciones por lotes y rollback completo; nueva prueba simula fallos de auditoría y confirma ausencia de datos huérfanos.
- Corrección v0.4.1 comprobada localmente: **29/29 tests**. No asumir integración hasta comprobar último PR/CI.
- Proyecto sigue privado, sin despliegue ni datos reales; país, marca, regulación y arquitectura productiva no aprobados.

## 2026-10-25 — Incidencias y pruebas de la app web, versión candidata 0.5.0

- Se implementó módulo de tickets residenciales dentro del mismo repositorio, en lugar de crear otra aplicación desconectada. Se conserva aislamiento y auditoría por comunidad.
- Las incidencias de unidad son visibles al propietario autorizado; comité accede al seguimiento sin permisos de cambio de estado; administrador registra cambios con explicación.
- Se añadieron 3 pruebas Node (32 total) y prueba de navegador con datos sintéticos. El recorrido local usa puente hacia la API real por bloqueo de HTTP desde Chromium; GitHub CI probará HTTP directo.
- Se corrigió fallo del job E2E inicial provocado por runner Ubuntu 26.04 no soportado: se fijó Ubuntu 24.04 en PR #17. No confundir fallo de entorno con aprobación del test remoto.
- La versión 0.5.0 es propuesta hasta integración del PR. No cambia privacidad ni ejecuta despliegues.

## 2026-10-25 — Asignación web de propietarios, v0.6.0 candidata

- Se implementó `GET /members` exclusivamente administrativo y `PATCH /units/:id/owner`, validando pertenencia a la misma comunidad y rol `owner`.
- Se almacena historia de cambios anterior/nuevo/actor/unidad con atomicidad de auditoría. Cambiar la asignación modifica acceso del propietario desde la siguiente consulta, sin modificar cargos y pagos históricos.
- La nueva sesión ya no conserva sección, comunidad o filtros de la cuenta anterior; se detectó en el E2E de cambio de usuario.
- 35 pruebas Node locales y E2E web con backend real por puente; CI previo del PR #19 pasó. No validar identidad/propiedad documental ni utilizar datos de residentes reales.
