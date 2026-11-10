# Requisitos de evolución a SaaS — URBIORA — Gestión residencial

> Decisión del propietario confirmada en mediOS, 2026-11-09. Guía de producto y lista de aceptación; **no** asegura que estén implementados los puntos.

**Estado técnico de referencia (según README revisado):** MVP local v0.7.0 con backend SQLite, sesiones, aislamiento de acceso por comunidades, incidencias, cuotas y respaldos locales; NO publicado, NO apto para datos reales.

## Decisión de producto (aprobada)
El producto debe evolucionar hacia **Software as a Service (SaaS) comercializable** por clientes independientes. Esta es una **exigencia de desarrollo**, NO una afirmación de que ya existe o funciona. Se mantiene el estado técnico real documentado en el README y el resto de fuentes de verdad.

## Requisitos comunes obligatorios
1. **Multiempresa / multicliente:** cada cliente tiene espacio propio; autorización server-side y aislamiento de datos probado. No basta con filtros visuales ni con un solo usuario administrador.
2. **Gestión de usuarios:** identidad, invitaciones, roles/permisos, revocación de sesiones, recuperación segura y MFA acorde al riesgo.
3. **Modelo comercial:** planes de suscripción mensuales/anuales, límites claros, activación/suspensión/cancelación, cobro mediante proveedor autorizado cuando aplique y facturación del servicio. Precios y rentabilidad aún por validar.
4. **Administración:** panel del cliente y panel interno del operador SaaS, con separación de privilegios; métricas de uso, soporte y auditoría.
5. **Seguridad y operación:** cifrado, secretos fuera del repositorio, mínimo privilegio, protección de datos, backups y restauración probada, monitoreo, respuesta a incidentes, retención y exportación/cancelación de datos.
6. **Calidad y despliegue:** migraciones reproducibles, pruebas automáticas funcionales y de aislamiento entre dos clientes, CI y puertas de lanzamiento; no declarar 'listo para producción' por una demo.
7. **Ejecución responsable:** no publicar datos reales, activar cobros, conectarse a terceros ni desplegar públicamente sin autorización. Respetar privacidad, normativa aplicable, licencias e IP.

## Requisitos particulares de URBIORA — Gestión residencial

1. **Tenancy comercial:** separar administradoras/condominios como clientes facturables; definir si una administradora gestiona múltiples comunidades y aplicar autorización de datos por comunidad y por operador, incluso en backend y reportes.
2. **Alta y gestión:** registro/onboarding controlado de clientes, creación de espacios, invitación y revocación de usuarios, roles de administradora, junta y propietario, MFA y recuperación segura.
3. **Módulos a conservar:** cuotas, cobros y gastos, propietarios/unidades, Gestión de Incidencias Residenciales y Portal de Propietario Remoto; distinguir lo disponible de lo pendiente.
4. **Evolución de backend:** pasar de MVP local SQLite a infraestructura SaaS duradera sin romper migraciones, aislamiento y copias cifradas; plan de migración y reversión probado.
5. **Cobros por el SaaS:** planes por condominio/administradora o unidades, estados de suscripción, límites transparentes, recibos y facturación del servicio, usando proveedor autorizado si se integran pagos.
6. **Producción:** cifrado, gestión de secretos, retención, respaldos con restauración probada, monitoreo, procedimiento de incidentes y revisión legal y de privacidad antes de datos reales.

## Criterios de aceptación para la salida comercial

- [ ] Pruebas automatizadas con al menos dos clientes y dos comunidades: sin lecturas/escrituras cruzadas por URL, API, exportaciones ni búsquedas.
- [ ] Prueba real de restauración de backup, permisos de propietarios, cobros/estados de suscripción y cancelación/exportación de datos.
- [ ] No habilitar hosting público ni datos reales sin autorización explícita y auditoría de seguridad/legal.

## Seguimiento

- Abrir o actualizar tareas de ingeniería por etapas. Documentar evidencia (commits, tests, migraciones, revisión de seguridad) antes de marcar algo como terminado.
- Respetar las fuentes de verdad y convenciones ya existentes en el repositorio.
- Toda característica enumerada se considera **prevista** hasta verificación individual.
- Relación de cartera: `medinacaj/MediOS/data/CARTERA_INVERSION_VENEZUELA.json`.
