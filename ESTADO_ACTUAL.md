# Estado actual — Digi-Condominio

**Fecha de corte:** 2026-10-25. **Último estado verificado antes de esta propuesta:** `main` con README mínimo y commit inicial `3dfb07c76fcdbf52c2c0938a238255f36174db4e`.

| Frente | Estado | Evidencia |
|---|---|---|
| Repositorio GitHub | Existente, privado | Metadatos de GitHub |
| Código fuente | No iniciado | Inventario inicial de `main` |
| Producto/MVP | Hipótesis documentadas, sin aprobación definitiva | Contexto de referencia y esta propuesta |
| Arquitectura/stack | No seleccionado | Sin archivos de proyecto |
| CI/pruebas | No implementados | Sin workflows ni tests |
| Despliegue | No configurado | Sin evidencia de hosting o release |
| Protección de rama | `main` sin protección | API GitHub `protected: false` |
| Documentación de inicio | **Propuesta en rama de trabajo** | No contar como integrada hasta merge |
| Backlog e issues | Preparación inicial | Consultar GitHub para el estado vigente |

## Riesgos inmediatos (orden sugerido)

P0: proteger propiedad intelectual y secretos; delimitar roles y aislamiento tenant; confirmar país antes de codificar reglas sensibles.
P1: especificar MVP y criterios de aceptación; seleccionar arquitectura; definir modelo de datos.
P2: UI responsive, importación y piloto planificado.

## Siguiente acción exacta

1. Revisar e integrar el PR de documentación inicial, si corresponde.
2. Revisar issues de descubrimiento, seguridad, arquitectura y MVP.
3. Decidir país inicial, alcance y stack; documentar la decisión.
4. Abrir rama de implementación para autenticación, comunidades/unidades y prueba automatizada de aislamiento tenant.
5. Evaluar el resultado en PR, sin desplegar datos reales ni anunciar funcionalidad inexistente.

## Convención de actualización

Después de cada cambio: fecha/hora, issue, PR/commit, alcance, archivos, estado real, pruebas **ejecutadas** con resultado, bloqueos y siguiente acción. La fecha de inspección no debe convertirse en «fecha de despliegue».
