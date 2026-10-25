# ESTADO_ACTUAL — Digi-Condominio

**Última revisión documental:** 2026-10-25  
**Repositorio:** `medinacaj/app-web-digi-condominio` (privado)  
**Producto:** MVP **local experimental v0.4.1**, no publicado.

## Verificación de integración en GitHub

- PR [#1](https://github.com/medinacaj/app-web-digi-condominio/pull/1) — auditoría y contexto — **fusionado**.
- PR [#9](https://github.com/medinacaj/app-web-digi-condominio/pull/9) — prototipo visual — **fusionado**.
- PR [#10](https://github.com/medinacaj/app-web-digi-condominio/pull/10) — backend y frontend del MVP v0.4.0 — **fusionado**.
- Commit de integración original: `547e4b193d999994e4ed2f1cce8289d8f86c6926`. El workflow de `main` de ese commit, run **40227481519**, terminó **success**. Este commit es referencia histórica, no necesariamente el HEAD futuro.
- La corrección v0.4.1 agrega transacciones atómicas y política `.gitignore` reforzada. Validación local: **29/29** pruebas correctas. Revisar el CI del commit de integración de esta corrección en GitHub antes de afirmar que está publicado en `main`.
- `main` aparecía `protected: false`; quedó [issue #8](https://github.com/medinacaj/app-web-digi-condominio/issues/8) pendiente de evaluar restricciones de plan y accesos. **No** hacer público el repositorio para resolverlo.

## Alcance técnico implementado

| Módulo | Estado real |
|---|---|
| UI adaptable y prototipo sintético | Implementados |
| Login con scrypt, token de sesión revocable | Implementado, solo local |
| Comunidades, membresías, roles y aislamiento | Implementados; pruebas negativas básicas |
| Unidades, propietario, cuotas y pagos manuales | Implementados |
| Estado de cuenta y anulaciones con motivo | Implementados |
| Proveedores y gastos operativos | Implementados |
| Avisos y metadatos de documentos | Implementados; archivos adjuntos **no** |
| Reportes CSV y mitigación de fórmulas | Implementados |
| Importación CSV, provisión de usuarios por CLI | Implementados en terminal local |
| Backup de SQLite e integrity_check | Implementados; cifrado/recuperación operativa pendientes |
| Escrituras y auditoría en transacción | Mejorados v0.4.1, 29 pruebas locales |
| Integraciones de pago, bancos, notificaciones, MFA | **No implementadas** |
| Servicio productivo y dominio público | **No desplegados** |

## Verificaciones realizadas

- Comprobaciones de sintaxis y `node --test`: 29/29 correctas en Node 22.16 (SQLite experimental) para la corrección v0.4.1.
- Casos de éxito/error de autenticación, roles, aislamiento entre comunidades, propietario, importes y duplicados, reversos, CSV, restauración, importación por lotes y rollback de auditoría.
- Pruebas previas en Chromium offline con API simulada: navegación, formularios, escape HTML, modal de anulación y anchuras 360/390/1440 px sin overflow. **No** prueba integrada de navegador con API real.
- GitHub Actions de v0.4.0 en `main`: run **40227481519**, resultado **success**.
- La conexión Vercel consultada no mostró un proyecto vinculado al repositorio; no prueba ausencia de otros proveedores.

## Riesgos / bloqueos

**Producto:** país inicial (Chile/Venezuela/otro), nombre comercial, modelo de cuota/cobro, representantes legales y condiciones de operación no aprobados.

**Seguridad y privacidad:** `main` sin protección efectiva verificada, MFA, recuperación de usuarios, TLS y cookies productivas, retención y cifrado de respaldos, controles de archivos adjuntos, monitoreo, auditoría de accesos y revisión legal pendientes. Los tests no equivalen a auditoría de seguridad independiente.

**Tecnología:** `node:sqlite` experimental, servidor solo `127.0.0.1`, sin arquitectura productiva confirmada. **No usar datos reales ni habilitar puertos externos**.

## Siguiente acción ejecutable

1. Comprobar HEAD y CI de `main`, con versión `package.json` 0.4.1 y 29 pruebas; no asumir merge de otra rama.
2. Revisar y completar seguridad / protección de repositorio (#8); comprobar acceso de colaboradores y aplicaciones conectadas con permisos autorizados.
3. Resolver alcance y país con issues [#2](https://github.com/medinacaj/app-web-digi-condominio/issues/2), [#3](https://github.com/medinacaj/app-web-digi-condominio/issues/3), [#4](https://github.com/medinacaj/app-web-digi-condominio/issues/4), [#5](https://github.com/medinacaj/app-web-digi-condominio/issues/5).
4. Planificar modelo de datos estable, pruebas E2E reales, migraciones, restauración cifrada, recuperación de cuentas y documentación legal. No iniciar despliegue público sin evaluación y autorización expresa.
5. Mantener un issue y PR por cambio; registrar exactamente el código/probar/CI de cada avance.

## 2026-10-25 — Iteración v0.5.0 (PR #17; estado sujeto a merge)

- Se agregó al backend SQLite un módulo `incidents` / `incident_updates` con reportes por unidad o área común, categorías/prioridades, historial de comentarios y estados. Operaciones + auditoría en una misma transacción.
- La **app web** incorpora navegación «Incidencias», formulario de reporte, comentarios, cambio de estado para administración y contador de incidencias abiertas.
- Permisos: admin gestiona comunidad, comité comenta todos los reportes y reporta áreas comunes, propietario solo ve reportes propios/de unidades asignadas. Se niega acceso cruzado por comunidad y a unidades ajenas.
- Pruebas **locales** verificadas: `npm run check` 32/32, 3 tests nuevos; Playwright ejecutó UI real con backend Node real a través de puente de test Python por restricción de red de Chromium en este entorno. Validó login, creación, comentario, estado, escape XSS, sin errores JS y 360/390/768/1440 px sin overflow.
- Primer CI de navegador del PR: fallo de infraestructura con Ubuntu 26.04 no soportado por Playwright 1.56.0, job de sintaxis/Node pasó. Se fijó runner `ubuntu-24.04` en commit posterior, pendiente de éxito remoto; no declarar verde hasta confirmarlo.
- PR: https://github.com/medinacaj/app-web-digi-condominio/pull/17. Issue: https://github.com/medinacaj/app-web-digi-condominio/issues/16.
- **Pendientes**: fotografías/adjuntos, avisos por correo, SLA, asignación de responsable, paginación, retención legal; E2E directo y release aún no acreditados.
