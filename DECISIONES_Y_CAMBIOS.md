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
