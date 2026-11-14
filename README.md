# Digi-Condominio

**Versión integrada:** v0.7.0 (25 de octubre de 2026). Aplicación web y backend local de gestión de condominios, con repositorio actualmente **público** para revisar avances en [GitHub](https://github.com/medinacaj/app-web-digi-condominio) y una demostración estática independiente en GitHub Pages.

**IMPORTANTE:** la demostración estática utiliza datos ficticios. El **backend/MVP SaaS no está habilitado como servicio productivo ni es apto para datos reales** de residentes. La conformidad legal, arquitectura productiva y mercado inicial siguen pendientes.

## Vista previa de avances

- [Abrir demostración estática en GitHub Pages](https://medinacaj.github.io/app-web-digi-condominio/).
- [Despliegue Pages #42809807459](https://github.com/medinacaj/app-web-digi-condominio/actions/runs/42809807459) completado correctamente y con URL registrada; la respuesta HTTP actual no está verificada desde esta revisión.
- La rama `demo/github-pages` contiene frontend y datos sintéticos, sin backend ni pagos reales. No confundir la demo publicada con el piloto SaaS del PR #24.

## Funcionalidades implementadas en `main`

- App web adaptable con panel administrativo, búsqueda, módulos por rol y sesiones autenticadas.
- Comunidades y unidades con aislamiento de acceso; asociación de propietarios desde la web e historial de asignaciones.
- Cuotas, pagos manuales, saldos, anulaciones auditables, proveedores, gastos, avisos y registros de documentos (solo metadatos, **sin adjuntos**).
- Incidencias residenciales por unidad/área común, estados, comentarios y seguimiento auditable.
- Importación de unidades desde CSV mediante CLI, exportación administrativa CSV protegida contra fórmulas.
- Copias locales SQLite cifradas con AES-256-GCM, restauración autenticada y control `user_version=3` del esquema conocido.
- Tests Node y navegador Playwright contra backend HTTP real en GitHub Actions.

## Iniciar la aplicación local

Requisitos: Node.js **22.16+** y navegador moderno. `node:sqlite` es experimental.

```bash
# Definir directamente en terminal:
# DIGI_ADMIN_EMAIL, DIGI_ADMIN_PASSWORD, DIGI_COMMUNITY_NAME
npm run bootstrap
npm start
# Visitar http://127.0.0.1:4173
npm run check
```

Alternativa de vista demostrativa sin base persistente: `npm run serve` (requiere Python 3). No ejecutar simultáneamente ambos servidores en el mismo puerto.

Respaldos cifrados: `npm run backup:secure`, `npm run restore:secure` después de consultar [docs/RESPALDOS_CIFRADOS.md](docs/RESPALDOS_CIFRADOS.md). No pegar secretos en GitHub.

## Fuentes de verdad y seguimiento

[ESTADO_ACTUAL.md](ESTADO_ACTUAL.md) · [CONTEXTO_MAESTRO.md](CONTEXTO_MAESTRO.md) · [README_INICIAR_AQUI.md](README_INICIAR_AQUI.md) · [DECISIONES_Y_CAMBIOS.md](DECISIONES_Y_CAMBIOS.md) · [SECURITY.md](SECURITY.md)

[Guía del MVP](docs/MVP_LOCAL.md) · [Incidencias](docs/INCIDENCIAS.md) · [Propietarios](docs/ASIGNACIONES.md) · [Respaldos](docs/RESPALDOS_CIFRADOS.md) · [Backlog](docs/BACKLOG_MVP.md).

## Validación y alcance

**40 pruebas Node** y el trabajo E2E de navegador aprobados en GitHub Actions de `main` (run [40231797604](https://github.com/medinacaj/app-web-digi-condominio/actions/runs/40231797604)). Esto **no** equivale a certificación de seguridad, legalidad, disponibilidad o producción.

Faltan validación de jurisdicción y datos, onboarding/MFA, archivos adjuntos privados, permisos normativos detallados, backend productivo estable, RPO/RTO, auditoría independiente, SEO y despliegue seguro. Repositorio `main` no tiene protección de rama nativa verificada: issue #8. No cambiar visibilidad ni otorgar acceso externo sin autorización.
