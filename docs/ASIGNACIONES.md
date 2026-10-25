# Vinculación de propietarios en la app web — v0.6.0

**Estado:** implementación local, sin verificación de identidad jurídica. No apta para producción.

## Funciones

- La administración consulta los miembros de su comunidad desde el servidor y puede vincular, reemplazar o desvincular al propietario de una unidad desde **Unidades → Cambiar**.
- Los miembros candidatos deben pertenecer a esa comunidad y tener rol `owner`. Un usuario de otra comunidad o con rol comité es rechazado.
- Cada modificación conserva propietario anterior, nuevo propietario, administrador que la hizo, fecha y unidad en `unit_owner_events`; el evento de auditoría `unit.owner_changed` se confirma en la misma transacción.
- La asignación actual determina qué unidades, saldos y documentos de unidad son visibles al usuario que inicia sesión. Las altas no eliminan movimientos financieros existentes.
- La lista de miembros con direcciones de correo solo se proporciona a administradores autenticados de esa comunidad.
- Al salir, la app web borra la sesión en memoria, la comunidad activa, la navegación, filtros y estados de formularios antes de mostrar la entrada de otra cuenta.

## API

- `GET /api/communities/:communityId/members`: administrador; devuelve usuarios y roles de esa comunidad.
- `PATCH /api/communities/:communityId/units/:unitId/owner`: administrador, cuerpo `{ "ownerUserId": "UUID o null" }`.
- El `GET /overview` existente incluye `ownerChanges` **solo para administrador**, hasta los 50 cambios más recientes.

## Pruebas

- Pruebas Node específicas: asignación/revocación, aislamiento de comunidades, rechazo de roles, cambio en visibilidad de las unidades, eventos y reversión ante error de auditoría; 35 pruebas Node totales en v0.6.0.
- Prueba Playwright: login administrador, alta de una unidad, asignación de propietario, reportes, comentarios y estados de incidencias, cierre de sesión, login de propietario y verificación de acceso a unidad; además de XSS y viewport 360/390/768/1440. El recorrido de desarrollo en entorno bloqueado usa puente hacia API real; CI debe ejecutarlo por HTTP directo.

## Límites

El proceso de **validar legalmente** la propiedad, solicitar delegaciones y revocar las membresías no existe todavía. Crear usuarios sigue requiriendo la CLI privada `npm run add-user`; no se han habilitado invitaciones por email, recuperación de cuentas ni MFA. No usar con datos personales de residentes reales.
