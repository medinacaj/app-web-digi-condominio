# Estado actual — Digi-Condominio

**Fecha de corte:** 2026-10-25. **Último estado verificado antes de esta propuesta:** `main` con README mínimo y commit inicial `3dfb07c76fcdbf52c2c0938a238255f36174db4e`.

| Frente | Estado | Evidencia |
|---|---|---|
| Repositorio GitHub | Existente, privado | Metadatos de GitHub |
| Código fuente | Interfaz web 0.1.0 propuesta en PR #9 | Rama `feat/prototipo-web-2026-10-25`; `main` aún sin código |
| Producto/MVP | Hipótesis documentadas, sin aprobación definitiva | Contexto de referencia y esta propuesta |
| Arquitectura/stack | HTML/CSS/JS nativo para prototipo; producción pendiente | PR #9 y `docs/PROTOTIPO_WEB.md` |
| CI/pruebas | Workflow y 7 tests creados en rama; 7/7 ejecutados localmente | `npm run check`; CI remoto pendiente de verificar |
| Despliegue | No configurado | Sin evidencia de hosting o release |
| Protección de rama | `main` sin protección | API GitHub `protected: false` |
| Documentación de inicio | **Propuesta en rama de trabajo** | No contar como integrada hasta merge |
| Backlog e issues | 7 issues abiertos creados (#2–#8) | Ver enlaces en la sección siguiente |

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

## Trazabilidad GitHub verificada al 25-10-2026

- [PR #1 — Documentación de inicio (borrador)](https://github.com/medinacaj/app-web-digi-condominio/pull/1). No fusionado.
- [Issue #2 — Jurisdicción y usuarios](https://github.com/medinacaj/app-web-digi-condominio/issues/2).
- [Issue #3 — Privacidad/legal](https://github.com/medinacaj/app-web-digi-condominio/issues/3).
- [Issue #4 — Alcance MVP](https://github.com/medinacaj/app-web-digi-condominio/issues/4).
- [Issue #5 — Arquitectura multi-tenant](https://github.com/medinacaj/app-web-digi-condominio/issues/5).
- [Issue #6 — Base técnica/CI](https://github.com/medinacaj/app-web-digi-condominio/issues/6).
- [Issue #7 — Integridad financiera](https://github.com/medinacaj/app-web-digi-condominio/issues/7).
- [Issue #8 — Acceso y protección intelectual](https://github.com/medinacaj/app-web-digi-condominio/issues/8).

**Validación documental:** se comprobó por API que la rama contiene 12 archivos y que `INVENTARIO_ARCHIVOS.json` es JSON válido. No equivale a pruebas de software.

## 2026-10-25 — Primer prototipo web, fase 0 (verificado en rama)

- [PR #9 — Prototipo web (borrador)](https://github.com/medinacaj/app-web-digi-condominio/pull/9). **Base:** rama de documentación del PR #1. No fusionado con `main` ni desplegado.
- Commit inicial de UI: `35277bfaa7ef226e5d93efeabac28aa1212974ef`.
- Módulos visibles: resumen, comunidades, unidades, finanzas, comunicados, documentos y configuración. Todos con datos ficticios; acciones demostrativas no persisten.
- **Pruebas realmente ejecutadas:** `npm run check` en Node.js 22.16.0; 7 pruebas superadas y sintaxis válida. Servidor Python respondió HTTP 200 para index.html, main.js, ui.js y styles.css.
- **No verificado aún:** renderizado manual en navegadores reales, accesibilidad exhaustiva, CI remoto, backend, autenticación, integridad financiera de producción y despliegues.
- **Siguiente acción:** revisar PR #1 y luego PR #9; registrar validación visual en escritorio/móvil; acordar jurisdicción y alcance MVP; preparar backend sólo cuando se apruebe modelo de roles/seguridad.

## Verificación visual adicional (2026-10-25)

- Chromium sin acceso directo a direcciones HTTP por política del entorno; se construyó una versión temporal de inspección **offline** con los mismos scripts y CSS, inyectados en una página sin red.
- En esa inspección: panel con cuatro KPI; navegación, búsqueda de unidades, creación temporal de comunicado y menú móvil respondieron correctamente, sin errores JS.
- Se detectó y corrigió desbordamiento horizontal de CSS en pantallas pequeñas. Anchos de documento confirmados iguales al viewport a **360, 390, 768 y 1440 px** en el entorno offline.
- Limitación: esto **no** valida el despliegue real, carga de módulos ES desde HTTP, integración externa ni accesibilidad integral. El servidor estático respondió 200 para rutas básicas en comprobación aparte.

## CI remoto GitHub Actions (2026-10-25)

La ejecución `40224344777` del workflow **Comprobaciones del prototipo**, asociada al PR #9, terminó con estado `completed` y conclusión **success**. Esto valida los pasos automatizados configurados de sintaxis y pruebas unitarias, no despliegue ni seguridad productiva.

## 2026-10-25 — Segunda fase: MVP local (PR #10)

- Rama `feat/mvp-local-seguro-2026-10-25`, dependiente de PR #9, que a su vez depende de PR #1. **Ninguno de estos PR está fusionado en `main` a este corte.**
- PR #10: https://github.com/medinacaj/app-web-digi-condominio/pull/10.
- Backend local Node 22 `node:http`, SQLite `node:sqlite` experimental; REST limitado al host 127.0.0.1.
- Autenticación con scrypt/sal, tokens aleatorios hasheados, caducidad 8h y logout.
- Datos persistentes: comunidades, membresías, unidades, cuotas, pagos manuales, avisos y fichas documentales. Roles admin/comité/propietario aplicados en servidor; saldos de comité suprimidos; propietarios limitados a sus unidades.
- Prevención de cargos duplicados por unidad/período/concepto, pagos duplicados por referencia y auditoría de altas. La gestión de archivos adjuntos, bancos e invitaciones no está implementada.
- **Pruebas ejecutadas localmente:** `npm run check` 17/17 correctas, incluye HTTP real, permisos negativos entre tenants y SQLite reabierto. En Chromium offline con mock API: login, unidades, cuotas, pagos, XSS escapado y sin overflow a 360/390/1440; sin errores JS.
- **Limitación de QA:** Chromium bloqueó navegación HTTP local por política del entorno; no se declara E2E navegador+backend. GitHub Actions remoto requiere comprobación de conclusión final tras cada commit.
- **Siguiente acción concreta:** revisar PR #10, validar reglas del negocio y país; pruebas E2E reales, migraciones/backup, onboarding de usuarios y funciones financieras/documentales pendientes antes de operar con datos reales.
