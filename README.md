# Digi-Condominio

Aplicación web privada para la gestión operativa de comunidades y condominios. **Versión local experimental 0.4.1.** El código está desarrollado y versionado en GitHub; **no** hay un servicio SaaS publicado, no debe procesar datos reales de residentes y no constituye contabilidad regulada.

**Repositorio:** `medinacaj/app-web-digi-condominio` · **Rama oficial:** `main` · **Licencia:** código privativo; no hay licencia de código abierto.

## Funciones implementadas en el MVP local
- Panel web adaptable, autenticación por contraseña scrypt, sesiones revocables y vistas por administrador, comité y propietario.
- Aislamiento entre comunidades en API y consultas. Unidades con propietario asignado, cuotas por periodo, pagos **registrados manualmente** y estado de cuenta.
- Anulaciones auditables, proveedores, gastos, avisos, metadatos de documentos y reportes CSV protegidos frente a fórmulas.
- Importación CSV con vista previa y transacción, provisión de usuarios por CLI, respaldo SQLite y verificación de integridad.
- Operaciones y auditoría guardadas atómicamente (v0.4.1). **No existen pagos online, adjuntos documentales, invitaciones por email, MFA ni despliegue productivo.**

## Iniciar localmente

Requisitos: Node.js **22.16 o posterior**, navegador moderno, máquina privada. SQLite vía `node:sqlite` **experimental**.

```bash
# Configure localmente variables de entorno SIN escribir contraseñas en el repositorio:
# DIGI_ADMIN_EMAIL, DIGI_ADMIN_PASSWORD, DIGI_COMMUNITY_NAME
npm run bootstrap
npm start
# http://127.0.0.1:4173

npm run check
```

Alternativa sin backend, con datos únicamente ficticios: `npm run serve` (Python 3) y abrir `http://127.0.0.1:4173`. **No** abra ambos servidores en el mismo puerto.

La aplicación requiere configurar las credenciales y la comunidad inicial desde la terminal; no hay credenciales predeterminadas. Las bases SQLite locales se guardan en `.data/` y deben permanecer fuera de Git.

## Fuente de verdad y continuidad
- [README_INICIAR_AQUI.md](README_INICIAR_AQUI.md): cómo retomar.
- [CONTEXTO_MAESTRO.md](CONTEXTO_MAESTRO.md): visión, alcance, supuestos.
- [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md): qué está integrado, pruebas, bloqueos y siguientes acciones.
- [DECISIONES_Y_CAMBIOS.md](DECISIONES_Y_CAMBIOS.md): historial de decisiones y PR.
- [docs/MVP_LOCAL.md](docs/MVP_LOCAL.md): comandos, seguridad y limitaciones de la implementación.
- [docs/BACKLOG_MVP.md](docs/BACKLOG_MVP.md): criterios iniciales y prioridades restantes.
- [SECURITY.md](SECURITY.md): advertencias y controles.

## Estado y límites

La versión 0.4.0 se incorporó a `main` por PR [#10](https://github.com/medinacaj/app-web-digi-condominio/pull/10), después de #1 y #9. Los controles adicionales de la v0.4.1 se desarrollaron y comprobaron como mejora posterior. El conjunto local tiene **29 pruebas**, pero falta validar normativas, consentimiento, restauraciones operativas, seguridad independiente y arquitectura productiva. El repositorio sigue privado; ningún cambio de visibilidad o despliegue puede hacerse sin autorización.
