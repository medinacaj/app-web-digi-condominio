# Digi-Condominio

**Versión integrada:** v0.7.0 (25 de octubre de 2026). Aplicación web y backend local de gestión de condominios. El [repositorio GitHub](https://github.com/medinacaj/app-web-digi-condominio) es **público** por la decisión posterior de conservar una demo en GitHub Pages; consultar [issue de gobernanza #8](https://github.com/medinacaj/app-web-digi-condominio/issues/8).

**IMPORTANTE:** existe una **demo pública sintética en GitHub Pages** para revisión del propietario, pero el **backend local y el MVP transaccional no están desplegados como servicio productivo** ni son aptos para datos reales de residentes. La conformidad legal, arquitectura productiva y mercado inicial siguen pendientes. No introducir datos de personas reales en la demo. [Vista de demostración](https://medinacaj.github.io/app-web-digi-condominio/).

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


## Continuidad y estado verificable · 21/11/2026

**Propósito:** Aplicación web para gestión de comunidades, unidades, cuotas e incidencias; backend transaccional local y demo sintética separada.

**Límite de alcance:** El backend productivo no está desplegado; faltan controles legales, de seguridad y de operación.

- **Código:** consultar la rama predeterminada y el historial de commits antes de afirmar una implementación reciente; el contenido anterior de este README conserva sus salvedades y evidencia histórica.
- **Pruebas y CI:** consultar la ejecución de GitHub Actions asociada al SHA que se pretende entregar. Esta revisión documental no ejecuta pruebas de aplicación.
- **Despliegue:** verificar directamente el entorno y la versión servida; ni un commit ni una demo ni CI satisfactoria acreditan por sí solos un despliegue productivo.
- **Trabajo siguiente:** revisar los issues y PR abiertos, resolver el último bloqueo concreto y registrar cambio, rama, SHA, pruebas, entorno efectivamente comprobado y pendientes.
- **Seguridad:** no introducir secretos, información personal ni datos reales en demos; conservar fixtures sintéticos y separar los entornos.

**Fuente de verdad:** este repositorio y sus decisiones propias; no importar reglas de otro producto. Revisar la documentación técnica y operativa propia antes de implementar cambios. 
