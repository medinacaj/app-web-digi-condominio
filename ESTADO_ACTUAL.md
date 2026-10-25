# Estado actual — Digi-Condominio v0.7.0

**Corte verificado:** 25-10-2026 · [Repositorio privado](https://github.com/medinacaj/app-web-digi-condominio)

## Integraciones verificadas

| Versión/fase | Pull request | Resultado |
|---|---|---|
| Auditoría y contexto | [#1](https://github.com/medinacaj/app-web-digi-condominio/pull/1) | Fusionado |
| Prototipo de interfaz | [#9](https://github.com/medinacaj/app-web-digi-condominio/pull/9) | Fusionado |
| MVP local | [#10](https://github.com/medinacaj/app-web-digi-condominio/pull/10) | Fusionado |
| Atomicidad y seguridad | [#11](https://github.com/medinacaj/app-web-digi-condominio/pull/11) | Fusionado |
| Incidencias y E2E directo | [#17](https://github.com/medinacaj/app-web-digi-condominio/pull/17) | Fusionado |
| Propietarios desde web | [#19](https://github.com/medinacaj/app-web-digi-condominio/pull/19) | Fusionado |
| Respaldo cifrado/esquema | [#21](https://github.com/medinacaj/app-web-digi-condominio/pull/21) | Fusionado |

- **HEAD de `main` verificado:** `5e81640f1a570d1ecb957de8c871adbda9a77480`, commit de integración de v0.7.0.
- **CI de `main`:** run [40231797604](https://github.com/medinacaj/app-web-digi-condominio/actions/runs/40231797604), jobs Node y Playwright **completed/success**.
- **40/40 tests Node** y recorrido E2E web directo desde GitHub Actions. Chromium local en este entorno precisó puente de red, limitación registrada.
- **Inventario**: 55 archivos de código, pruebas, workflows y documentación. `package.json` versión **0.7.0**.
- **Privacidad**: repositorio `private`. `main` `protected:false`; revisión de accesos y branch protection pendiente (issue #8).
- **Despliegue**: ninguno realizado. Node `127.0.0.1`, SQLite experimental, no datos reales.

## Funciones disponibles

Panel web responsive; login; comunidades/roles; unidades y asignación de propietarios; cuotas y cargos; pagos manuales; reversos e historial; gastos/proveedores; avisos; fichas documentales; CSV; incidencias; backups cifrados/restauración y control del esquema local. La autorización efectiva está en el servidor, no en botones de UI.

## Funciones pendientes o que requieren autorización/decisiones

**Producto/legal:** país objetivo, marca definitiva, obligaciones de copropiedad/privacidad, permisos de comité, contratos, tratamiento de datos y reglas monetarias.

**Tecnología:** arquitectura productiva estable, migraciones reales posteriores, servicio con HTTPS y cookies seguras, invitaciones/MFA/recuperación, adjuntos privados, notificaciones, conciliación, pagos autorizados, backup operacional, observabilidad, rate limits, pruebas de carga, seguridad independiente y revisión de accesibilidad.

**Seguimiento abierto:** #2, #3, #4, #5, #6 (lint/typecheck aún pendiente), #8, #12 (a11y y regresión visual), #13, #14 y #15. Cerrar #16, #18 y #20 únicamente con su evidencia de integración.

## Siguiente acción

1. Revisar issues de producto, país, privacidad y arquitectura para definir una versión operable con criterios de aceptación.
2. Mejorar identidad, recuperación, MFA, políticas de permisos y carga segura de documentos con tests negativos.
3. Acordar proveedor y estrategia de continuidad antes de despliegues y datos reales.
4. Actualizar este documento al fusionar cada cambio, con SHA, CI real y bloqueos.

**No** declarar software de producción, cumplimiento jurídico o pruebas realizadas sin evidencia.
