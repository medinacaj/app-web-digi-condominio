# Iniciar o reanudar Digi-Condominio

**Fecha de inspección:** 2026-10-25. **Repositorio:** `medinacaj/app-web-digi-condominio`, privado. **Rama base:** `main`.

## Fuente de verdad

El código, los issues, las decisiones y el estado **integrados en `main`** constituyen el registro oficial. Una rama o PR describe trabajo propuesto hasta su integración. Las conversaciones y documentos externos son antecedentes, no sustituyen el estado verificado del repositorio.

## Orden de lectura

1. `README.md`
2. `CONTEXTO_MAESTRO.md`
3. `ESTADO_ACTUAL.md`
4. `DECISIONES_Y_CAMBIOS.md`
5. `docs/AUDITORIA_INICIAL.md` y `docs/BACKLOG_MVP.md`
6. Issues abiertos, PRs pendientes, últimos commits y resultados reales de CI

Leer también `INVENTARIO_ARCHIVOS.json`, `INFORME_TRANSFERENCIA.md` y `PROMPT_REANUDACION.md` en traspasos.

## Lo verificado al inicio

- `main` tenía únicamente un README de 25 bytes y un commit inicial (SHA `3dfb07c76fcdbf52c2c0938a238255f36174db4e`).
- No había código, tests, workflows, issues ni PRs en la inspección inicial.
- La rama `main` no tenía protección de rama. GitHub devolvió HTTP 403 para consulta de rulesets privados indicando que requiere GitHub Pro o repositorio público.
- La privacidad es una restricción: **no hacer público el repositorio ni cambiar configuración que afecte despliegues sin autorización**.

## Arranque mínimo

1. Verificar GitHub y revisar PR #1 (documentación) y PR #9 (interfaz, dependiente de #1), sin asumir que ya están fusionados.
2. Confirmar/validar jurisdicción inicial, usuarios objetivo y núcleo de negocio; no asumir que una referencia a «CondoTech Venezuela» define el lanzamiento.
3. Cerrar el MVP propuesto con criterios de aceptación por flujo.
4. Seleccionar arquitectura con decisión registrada; crear primer esqueleto mediante PR.
5. Añadir pruebas, controles de seguridad, despliegue no público y documentación reproducible.
6. Actualizar estado y decisiones tras cada tarea; conservar enlaces a PR, pruebas y releases.

## Restricciones

No incorporar datos reales de residentes, comprobantes o credenciales al repositorio. No inventar despliegues, integraciones ni pruebas. Mantener propietario y acceso exclusivo; revisar permisos de aplicaciones conectadas periódicamente.

## Primer prototipo (PR #9)

Interfaz web local propuesta en `feat/prototipo-web-2026-10-25`. Documentación en `docs/PROTOTIPO_WEB.md`. Para verificar: `npm run check`; para abrir desde un servidor HTTP: `npm run serve`. No usar datos reales: no existe autenticación ni backend. Resultado comprobado localmente: 7/7 tests y rutas básicas HTTP 200; validación visual/CI pendiente.

## Rama del MVP local

Tras PR #1 y #9, evaluar [PR #10](https://github.com/medinacaj/app-web-digi-condominio/pull/10), que agrega persistencia y control de acceso. Ejecutar `npm run check` y leer `docs/MVP_LOCAL.md` antes de probar localmente. Configurar las credenciales iniciales con variables de entorno no versionadas. **No** cargar datos de residentes reales ni publicar el servidor.

### Actualización v0.3.0

En [PR #10](https://github.com/medinacaj/app-web-digi-condominio/pull/10) hay 23 pruebas, módulo local de proveedores/gastos, exportaciones CSV, respaldo/restore testado, importación de unidades y provisión de roles por CLI. Estos cambios no implican disponibilidad en `main` hasta fusionar. Usar `docs/MVP_LOCAL.md` para reproducir sin datos reales.

### Verificación técnica de v0.4.0

Pruebas locales **24/24**; la rama contiene backend local, UI conectada, importación CSV, reportes, backups y anulaciones. Consultar `docs/MVP_LOCAL.md`. Ninguna función bancaria, correo o procesamiento de documentos adjuntos está habilitada; no debe utilizarse con datos de residentes reales.
