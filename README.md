# Digi-Condominio

Proyecto privado para diseñar y desarrollar una plataforma web de administración de condominios, comunidades y unidades inmobiliarias.

> Estado al 25-10-2026: **prototipo web de interfaz en PR #9 (borrador)**, sin backend ni datos reales. El nombre comercial, jurisdicción inicial y stack de producción siguen pendientes.

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

**Interfaz de demostración navegable** (no software productivo), propuesta en [PR #9](https://github.com/medinacaj/app-web-digi-condominio/pull/9). Antes del backend: validar país, usuarios objetivo, MVP, arquitectura y criterios de aceptación.

El trabajo debe hacerse mediante ramas y pull requests, con issues, pruebas verificables y actualización de `ESTADO_ACTUAL.md`. Evitar cambios directos en `main`.

## Propiedad intelectual

Repositorio privado. No se autoriza la redistribución del código, los diseños o documentación sin permiso del titular. No se ha concedido una licencia de código abierto.
