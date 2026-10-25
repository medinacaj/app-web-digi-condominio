# Digi-Condominio

**Estado al 25-10-2026:** Aplicación web y backend local privado **v0.6.0 integrados en main**. Versión **0.7.0 en revisión** en [PR #21](https://github.com/medinacaj/app-web-digi-condominio/pull/21): respaldo SQLite cifrado y control del esquema. **No es un SaaS publicado ni apto para datos reales.**

## Funcionalidades desarrolladas y fusionadas
- App web responsive con navegación, formularios y consultas por rol; login scrypt y sesiones revocables.
- Comunidades aisladas, unidades, propietarios vinculados desde la web, cuotas, pagos manuales, anulaciones auditables y saldos.
- Proveedores, gastos, reportes CSV, avisos, metadatos documentales e importación CSV local.
- Incidencias residenciales por área común/unidad, seguimiento con comentarios y estados, controles por rol y comunidad.
- CI GitHub Actions con pruebas Node y Playwright de navegador contra API HTTP real. Las versiones 0.5 y 0.6 se integraron en PR #17 y #19.

## Requisitos para ejecutar localmente
Node.js 22.16+ y navegador moderno. `node:sqlite` **experimental**.

```bash
# Establezca en su terminal: DIGI_ADMIN_EMAIL, DIGI_ADMIN_PASSWORD, DIGI_COMMUNITY_NAME
npm run bootstrap
npm start                  # http://127.0.0.1:4173
npm run check              # tests Node y sintaxis
```

Para prueba visual sin servidor persistente: `npm run serve` (Python 3) usa solo datos sintéticos. No ejecute ambos servidores en el mismo puerto.

En v0.7.0 propuesta: `npm run backup:secure` y `npm run restore:secure` requieren frase secreta privada y rutas nuevas. Consulte [docs/RESPALDOS_CIFRADOS.md](docs/RESPALDOS_CIFRADOS.md) antes de usarlos.

## Documentación permanente
- [Estado de implementación](ESTADO_ACTUAL.md) · [Inicio y reanudación](README_INICIAR_AQUI.md) · [Contexto](CONTEXTO_MAESTRO.md).
- [Manual de desarrollo local](docs/MVP_LOCAL.md) · [Incidencias](docs/INCIDENCIAS.md) · [Asignación de propietarios](docs/ASIGNACIONES.md).
- [Backlog](docs/BACKLOG_MVP.md) · [Seguridad](SECURITY.md) · [Decisiones](DECISIONES_Y_CAMBIOS.md).

## Límites
Repositorio privado, sin licencia abierta. No exponer el servidor local a Internet, no publicar bases SQLite, secretos ni datos de residentes. Faltan selección y validación de jurisdicción, gestión de identidad/invitaciones/MFA, adjuntos, despliegue con infraestructura segura, revisión de protección de datos, pagos integrados, retención y auditoría independiente.
