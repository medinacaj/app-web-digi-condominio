# Digi-Condominio

Proyecto privado para diseñar y desarrollar una plataforma web de administración de condominios, comunidades y unidades inmobiliarias.

> Estado al 25-10-2026: **MVP local persistente implementado en PR #10 (borrador)**, sin despliegue de producción ni datos reales. País, marca y stack productivo pendientes.

## Inicio y continuidad

1. [README_INICIAR_AQUI.md](README_INICIAR_AQUI.md): instrucciones para retomar.
2. [CONTEXTO_MAESTRO.md](CONTEXTO_MAESTRO.md): visión, alcance y requisitos preliminares.
3. [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md): estado real y siguiente acción.
4. [DECISIONES_Y_CAMBIOS.md](DECISIONES_Y_CAMBIOS.md): decisiones, propuestas y registro de cambios.
5. [docs/AUDITORIA_INICIAL.md](docs/AUDITORIA_INICIAL.md): hallazgos verificables de la inspección.
6. [docs/BACKLOG_MVP.md](docs/BACKLOG_MVP.md): alcance y fases **propuestas**.
7. [SECURITY.md](SECURITY.md): criterios de seguridad iniciales.

## Prototipo local (tras integrar el PR #9)

```bash
npm run serve   # abrir http://localhost:4173
npm run check   # sintaxis + 7 pruebas unitarias
```

HTML, CSS y JavaScript sin dependencias; requiere Node.js 20+ para pruebas y Python 3 para el comando de servidor. Ver [docs/PROTOTIPO_WEB.md](docs/PROTOTIPO_WEB.md). El prototipo no almacena ni procesa datos reales.

## Desarrollo

**Dos modos de desarrollo**: prototipo estático demostrativo (PR #9) y MVP local con autenticación y SQLite (PR #10). Antes de producción: validar país, usuarios, MVP, arquitectura, privacidad, respaldos y criterios de aceptación.

El trabajo debe hacerse mediante ramas y pull requests, con issues, pruebas verificables y actualización de `ESTADO_ACTUAL.md`. Evitar cambios directos en `main`.

## Propiedad intelectual

Repositorio privado. No se autoriza la redistribución del código, los diseños o documentación sin permiso del titular. No se ha concedido una licencia de código abierto.

## MVP local persistente · PR #10

Se implementó autenticación, sesión revocable, aislamiento por comunidad, roles administrador/comité/propietario, unidades, cuotas, pagos manuales, comunicados, fichas documentales y auditoría de altas. **No apto para datos reales ni producción**.

Instrucciones completas: [docs/MVP_LOCAL.md](docs/MVP_LOCAL.md). Requiere Node.js 22.16+ con `node:sqlite` experimental.

```bash
# Configurar DIGI_ADMIN_EMAIL, DIGI_ADMIN_PASSWORD y DIGI_COMMUNITY_NAME sin versionarlos.
npm run bootstrap
npm start
npm run check
```

No se han configurado usuarios ni contraseñas reales. Los tests usan identidades ficticias y bases de datos temporales.
