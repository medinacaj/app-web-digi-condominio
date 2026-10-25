# Incidencias residenciales — módulo v0.5.0

**Estado:** desarrollo en rama, sujeto a integración y pruebas remotas. **No producción**.

## Funcionalidad
- Usuarios de una comunidad registran reportes de mantenimiento, seguridad, limpieza, ruido u otros, asociados a una unidad o área común.
- Prioridades: baja, normal, alta y urgente. Estados: abierta, en atención, resuelta y cerrada.
- Administración cambia el estado indicando una explicación de al menos ocho caracteres. No se permite repetir el mismo estado.
- Administración, comité y propietarios autorizados pueden comentar; cada entrada registra autor, hora y contenido sin sobrescritura.
- Historial y evento de auditoría de cada alta, comentario o cambio de estado se guardan en una misma transacción SQLite; un error revierte la operación completa.

## Matriz de permisos verificada

| Operación | Admin | Comité | Propietario |
|---|---|---|---|
| Crear reporte de área común | Sí | Sí | Sí |
| Crear reporte de unidad | Sí, cualquier unidad propia de la comunidad | No | Solo unidad asignada |
| Leer reportes | Comunidad completa | Comunidad completa | Propios o de su unidad |
| Comentar | Reportes de la comunidad | Reportes de la comunidad | Solo reportes visibles |
| Cambiar estado | Sí | No | No |

Un usuario sin membresía recibe 404 al acceder a otra comunidad; los reportes de unidad ajena también se ocultan al propietario.

## API
- `GET /api/communities/:id/incidents`: lista filtrada por rol.
- `POST /api/communities/:id/incidents`: reporta. `unitId` vacío para área común; `category`, `title`, `detail`, `priority` obligatorios salvo prioridad con defecto normal.
- `POST /api/communities/:id/incidents/:incidentId/comments`: `{ "note": "..." }`.
- `PATCH /api/communities/:id/incidents/:incidentId/status`: `{ "status": "in_progress", "note": "..." }`.
- `GET /api/communities/:id/overview`: incluye `incidents` filtrado.

Todos los endpoints excepto `/api/health` requieren sesión Bearer. No se aceptan rutas de lectura de un incidente sin validación de membresía y visibilidad.

## Persistencia
`incidents` y `incident_updates` con claves compuestas `(id,community_id)` y FK de unidad por comunidad. El esquema se crea automáticamente al abrir una base existente. **Quedan pendientes migraciones versionadas, retención, paginación y archivado.** Para evitar consultas ilimitadas se devuelve un máximo de 100 reportes y 100 eventos por reporte en este MVP local; el escalado necesita paginación server-side.

## Calidad
- `npm run check`: 32 pruebas Node en versión v0.5.0, incluidas tres específicas (roles, aislamiento, rollback y HTTP real).
- `python3 tests/browser-e2e.py`: el modo de entorno alojado utiliza puente explícito al backend Node por bloqueo de navegador a localhost. Valida interfaz real y backend real, pero no la pila de red del navegador.
- `DIGI_E2E_MODE=direct python3 tests/browser-e2e.py`: modo para CI que debe navegar directamente a localhost; requiere Python Playwright y Chromium instalados. No afirmar éxito remoto hasta que GitHub Actions lo confirme.
- Pruebas de 360/390/768/1440 px, no desbordamiento y payload XSS representado como texto.

## Fuera de alcance
Adjuntar fotos, enviar correos, SMS/push, asignar proveedores con SLA, órdenes de trabajo y métricas operacionales; su implementación requiere decisión de privacidad, permisos e infraestructura.
