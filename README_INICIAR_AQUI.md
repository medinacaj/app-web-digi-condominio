# Reanudar Digi-Condominio

**Proyecto GitHub:** [medinacaj/app-web-digi-condominio](https://github.com/medinacaj/app-web-digi-condominio) — repositorio privado, `main`.

## Fuente de verdad
El historial **fusionado en `main`**, issues, código y pruebas son los registros verificables. El estado de otros PR o conversaciones no sustituye una comprobación de GitHub en tiempo real.

## Leer en este orden
1. `README.md` y `ESTADO_ACTUAL.md`.
2. `CONTEXTO_MAESTRO.md` y `DECISIONES_Y_CAMBIOS.md`.
3. `docs/MVP_LOCAL.md`, `SECURITY.md` y `docs/BACKLOG_MVP.md`.
4. `INVENTARIO_ARCHIVOS.json` y `PROMPT_REANUDACION.md`.
5. Últimos commits, PRs, issues y comprobaciones CI en GitHub.

## Estado ya integrado
Los PR [#1](https://github.com/medinacaj/app-web-digi-condominio/pull/1), [#9](https://github.com/medinacaj/app-web-digi-condominio/pull/9) y [#10](https://github.com/medinacaj/app-web-digi-condominio/pull/10) se fusionaron a `main` el 25-10-2026, último de los tres en `547e4b193d999994e4ed2f1cce8289d8f86c6926`. La versión 0.4.1 agrega endurecimiento de `.gitignore` y transacciones que vinculan los cambios con su auditoría; comprobar su propio merge y CI vigente.

## Ejecutar y verificar
Con Node 22.16+, `npm run check` ejecuta sintaxis y pruebas; última comprobación local del desarrollo v0.4.1: 29/29. Para uso de **demostración local** leer primero `docs/MVP_LOCAL.md`, establecer variables de entorno con credenciales propias, usar `npm run bootstrap` y `npm start`. Escucha solo `127.0.0.1:4173`; no hay despliegue de producción.

## Reglas innegociables
- **No** usar datos personales reales, **no** subir .env, SQLite ni documentos de residentes a Git.
- **No** cambiar la visibilidad privada, permisos, integraciones o despliegues sin autorización.
- Distinguir implementación, tests locales, CI, aprobación legal y publicación.
- No declarar país, marca o modelo contable aprobados mientras los issues de definición sigan abiertos.
- En cada PR actualizar pruebas, documentación, riesgos y decisión de integración.

## Rama de incidencias v0.5.0

Inspeccionar [PR #17](https://github.com/medinacaj/app-web-digi-condominio/pull/17) contra `main` y [issue #16](https://github.com/medinacaj/app-web-digi-condominio/issues/16). Leer `docs/INCIDENCIAS.md`; pruebas `npm run check` (32 casos locales) y `python3 tests/browser-e2e.py`. La prueba local de navegador usa un puente por política de acceso a localhost; el modo directo en GitHub CI se activa con `DIGI_E2E_MODE=direct`. Solo declarar éxito tras revisar el job remoto y el merge.
