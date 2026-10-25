# Estado actual de Digi-Condominio

**Revisión:** 25-10-2026 · **Repositorio privado:** `medinacaj/app-web-digi-condominio`

## Integrado en `main` y verificado

| Fase | PR | Estado |
|---|---|---|
| Contexto y auditoría | [#1](https://github.com/medinacaj/app-web-digi-condominio/pull/1) | Fusionado |
| Prototipo visual | [#9](https://github.com/medinacaj/app-web-digi-condominio/pull/9) | Fusionado |
| Backend local y operaciones | [#10](https://github.com/medinacaj/app-web-digi-condominio/pull/10) | Fusionado |
| Integridad y privacidad | [#11](https://github.com/medinacaj/app-web-digi-condominio/pull/11) | Fusionado |
| Incidencias web + E2E | [#17](https://github.com/medinacaj/app-web-digi-condominio/pull/17) | Fusionado, 32 pruebas Node |
| Asignaciones de propietarios | [#19](https://github.com/medinacaj/app-web-digi-condominio/pull/19) | Fusionado, 35 pruebas Node |

**Último commit oficial de referencia al iniciar esta propuesta:** `9bc7509467db54fe22ef755ff29f2f725d01d696` (integración de v0.6.0). La CI del PR #19 incluyó jobs `verify` y `browser-e2e` en **success** (run `40230838865`). El commit de `main` v0.6.0 también terminó con run `40231050904` **success**. El repositorio permaneció privado, `main` sin protección nativa (issue #8).

## En revisión, NO integrado hasta el merge

[PR #21](https://github.com/medinacaj/app-web-digi-condominio/pull/21) v0.7.0: copia cifrada AES-GCM, restauración a ruta nueva, validación SQLite, control `PRAGMA user_version=3`. Pruebas Node **40/40 locales**; Playwright de la app con puente de este entorno pasó, pero requiere confirmar CI directo sobre último SHA y luego CI de `main`. Issue [#20](https://github.com/medinacaj/app-web-digi-condominio/issues/20).

## Aplicación web implementada

Panel, comunidades, unidades, asociación de propietarios, cuotas, pagos, anulaciones, comunicados, fichas de documentos, proveedores, gastos, auditoría e incidencias. Backend Node HTTP solo en `127.0.0.1`, SQLite local; no hay despliegue ni operaciones bancarias. El frontend adapta permisos y el backend los aplica. Los archivos de documentos siguen siendo **metadatos**, no adjuntos.

## Validación y limitaciones

- Tests Node locales v0.7 candidato: 40/40, incluyendo cifrado, recuperación, versión futura, permisos y reportes.
- E2E Playwright real contra API HTTP en GitHub Actions verificado en v0.5 y v0.6. En el entorno actual de Chromium, `localhost` es bloqueado por política: las pruebas visuales locales ejecutaron la interfaz con un puente explícito al backend.
- **No** hay auditoría de seguridad independiente, stress tests, HA, TLS productivo, MFA, manejo de adjuntos privados o notificaciones externas.
- Jurisdicción de negocio/leyes, marca, alcance comercial, nube y reglas contables no aprobados.

## Siguiente acción exacta

1. Confirmar los jobs `verify` y `browser-e2e` en el HEAD del PR #21. Corregir cualquier fallo y, si está verde, fusionar y comprobar `main`.
2. Mantener abiertos [#2](https://github.com/medinacaj/app-web-digi-condominio/issues/2), [#3](https://github.com/medinacaj/app-web-digi-condominio/issues/3), [#4](https://github.com/medinacaj/app-web-digi-condominio/issues/4), [#5](https://github.com/medinacaj/app-web-digi-condominio/issues/5), [#8](https://github.com/medinacaj/app-web-digi-condominio/issues/8), [#12](https://github.com/medinacaj/app-web-digi-condominio/issues/12), [#13](https://github.com/medinacaj/app-web-digi-condominio/issues/13), [#14](https://github.com/medinacaj/app-web-digi-condominio/issues/14), [#15](https://github.com/medinacaj/app-web-digi-condominio/issues/15) en lo no concluido.
3. Decidir país, roles legales, datos, arquitectura productiva y continuidad; avanzar invitaciones/MFA, archivos privados, migraciones, pruebas de seguridad y accesibilidad.
4. No operar con datos de residentes reales ni abrir puertos remotos hasta aprobación de privacidad y controles de producción. Conservar seguimiento en PR y documentos, no solo en el chat.
