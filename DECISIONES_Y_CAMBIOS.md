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
