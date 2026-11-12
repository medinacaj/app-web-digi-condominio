# Seguridad y privacidad — políticas iniciales

Esta es una **política de trabajo**, no una afirmación de cumplimiento ni certificación.

- Repositorio actualmente **público** para mantener la vista previa de GitHub Pages. No alterar visibilidad, dominios, publicación ni otorgar acceso a terceros sin autorización. **GitHub Pages y el código de frontend son públicos; los datos reales, credenciales y cualquier backend productivo deben mantenerse fuera de estos artefactos.**
- La demo debe utilizar exclusivamente datos sintéticos. Si se decide separar código sensible en un repositorio privado, primero garantizar continuidad de la vista previa y aprobar el procedimiento.
- No subir `.env` reales, llaves, tokens, certificados, datos bancarios ni PII de residentes a GitHub.
- Usar datos sintéticos para pruebas y demostraciones. Mantener entornos separados.
- Requerir autorización por tenant y unidad en servidor/base de datos, denegando acceso no autorizado por defecto.
- Guardar comprobantes de modo privado; comprobar permisos antes de descargar archivos y usar URLs temporales.
- Registrar modificaciones de importes, pagos, permisos y exports, sin volcar secretos ni datos sensibles en logs.
- Diseñar respaldos y probar restauración; cifrado en tránsito y reposo según proveedor.
- Revisar dependencias y CI una vez definido el stack. No confiar en controles de seguridad no verificados.
- Antes de datos reales, completar evaluación de privacidad y marco legal del país de lanzamiento.

Para reportar riesgos: crear un issue privado únicamente si **no** revela secretos o exploits reproducibles. Si la vulnerabilidad incluye datos o instrucciones sensibles, utilizar un canal privado autorizado por el propietario; no publicar detalles en issues abiertos.

## Controles del MVP local (PR #10, no producción)

Se implementan hash scrypt de contraseñas con salt, tokens de sesión aleatorios hasheados con expiración, autorización por comunidad y rol del lado del servidor, control de acceso por unidad, SQL parametrizado, rutas públicas estáticas enumeradas, límites de cuerpos HTTP, HTTP de escucha exclusivamente en loopback, encabezados de seguridad, CSV protegido de fórmulas, saldos derivados y auditoría de altas. Se usan importes enteros en unidades menores.

**Pendiente crítico antes de operar:** revisión de seguridad independiente, HTTPS/cookies seguras/MFA según arquitectura final, recuperación de cuentas, licenciamiento y retención de datos, auditoría de accesos, respaldo cifrado y restauración supervisada, gestión de adjuntos con análisis antivirus, protección ante abuso y monitoreo, controles legales locales. No adjuntar datos reales en GitHub.

### Anulación de movimientos v0.4.0

La administración anula registros financieros con motivo obligatorio y registro inmutable; la base de datos impide segunda anulación del mismo movimiento. Los saldos excluyen anulaciones. Se requiere revisión legal antes de atribuir efectos contables o jurídicos a estas anotaciones.

## Auditoría correctiva v0.4.1 (2026-10-25)

Se reforzó `.gitignore` para incluir `.env`, certificados, llaves, bases SQLite, journals, copias locales y directorios privados. **Ignorar archivos no evita comprometer un secreto ya rastreado**: además se debe evitar crearlos en el árbol de trabajo y revisar historial/configuración de acceso con permisos correspondientes.

Las escrituras de unidades, cuotas, pagos, anulaciones, avisos, proveedores, gastos y documentos ahora usan `SAVEPOINT` para persistir o revertir **junto con su auditoría**. La importación CSV usa una transacción exterior y no pierde atomicidad. Se añadieron pruebas de fallo inducido y configuración, para un total local de **29 tests**. Estos controles son parciales y no autorizan uso productivo, procesar datos personales reales ni habilitar acceso remoto.

## Incidencias v0.5.0, PR #17

Los reportes se autorizan por comunidad y unidad **en servidor**, con contenido mostrado mediante escape HTML. Admin cambia estado con nota obligatoria; propietario no obtiene incidencias ajenas. El historial, comentario y auditoría se escriben atómicamente; se limitan las respuestas de listados a 100 elementos y 100 eventos por reporte. No se admiten archivos binarios ni fotografías. La retención, permisos legales y control de abuso requieren revisión antes de usar con datos reales.

## Seguridad v0.6.0 — Gestión de propietarios

Los datos de miembros y emails se exponen solo a admins autenticados de cada comunidad. Asignar/revocar dueño de unidad requiere rol admin y pertenencia del nuevo dueño con rol owner en la misma comunidad. Cada cambio guarda evento histórico y auditoría de forma atómica; no elimina asientos de cuota/pago. Cerrar sesión elimina estado de interfaz y token en memoria. **Pendiente:** validación legal de títulos, comprobación de identidad, revocación de membresías, invitaciones, MFA, permisos de datos históricos y retención. No usar con datos reales.

## Resguardo local experimental v0.7.0

Se añade `backup:secure` / `restore:secure` con AES-256-GCM, clave derivada con scrypt, salt y nonce aleatorios y validación de integridad. Se impide sobrescritura del destino y `.gitignore` excluye `*.dcb`. El módulo no conserva claves y no envia datos a la nube. Requiere operador autorizado y gestión externa de frase de cifrado. Limitado a 100 MB de SQLite y archivos temporales privados que no garantizan borrado forense. Prohibido considerar esto una estrategia RPO/RTO, alta disponibilidad o conformidad legal. Ver `docs/RESPALDOS_CIFRADOS.md`.
