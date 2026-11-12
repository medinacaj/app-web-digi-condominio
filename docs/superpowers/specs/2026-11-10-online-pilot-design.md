# Piloto SaaS en línea: identidad, despliegue y suscripción

## Encargo y límites
El usuario pidió proceder con alojamiento en Internet, HTTPS, invitaciones, recuperación y suscripciones tras la base SaaS. Se implementará y verificará lo independiente de servicios externos. No hay hosting, dominio, proveedor de correo ni cobro configurados en la máquina; GitHub privado sí está accesible. No contratar ni activar cargos, enviar correo real ni publicar datos sin configuración efectiva. Se pidió preferencia piloto/cobro real de forma asíncrona.

## Enfoque elegido para preparación
Una instancia de Node y SQLite persistente detrás de HTTPS es el incremento de piloto que preserva el código actual. Se preparan Docker y proxy HTTPS para un servidor Linux, y una plantilla Render con volumen persistente y HTTPS gestionado como alternativa. No sirve almacenamiento efímero, serverless, escalado horizontal ni varias réplicas SQLite. PostgreSQL/alta disponibilidad quedan como evolución; no declarar arquitectura productiva aprobada. No crear servidores facturables automáticamente.

La alternativa de reescribir ahora todas las consultas para PostgreSQL amplía mucho la entrega y no resuelve por sí sola la falta de hosting/correo. Publicar el HTTP local sin identidad ni persistencia no cumple el encargo. Un contenedor verificable y límites explícitos permite preparar el piloto sin presentar un despliegue inexistente.

## Identidad
- Mantener modo local compatible. Modo alojado opt-in: origen público HTTPS fijo, validación de Host y Origin, proxy de confianza solo con configuración explícita; cookie __Host-digi_session Secure/HttpOnly/SameSite=Lax/Path=/, sin token de sesión en JSON. CSRF específico por sesión en X-CSRF-Token para mutaciones autenticadas. Cookies renovables por login; logout revoca; recarga restaura sesión válida desde /api/session.
- Invitaciones emitidas por account_admin al email y rol exactos, opcionalmente con asignación a un condominio de la misma cuenta. URL con token aleatorio en fragmento, hash en DB, expiración y un solo uso. No exponer token en API/log. Al aceptar para usuario existente, exigir sesión de esa identidad y no cambiar su contraseña. Para nuevo usuario, nombre y contraseña válidos. Revalidar autoridad del emisor al aceptar y auditar atómicamente.
- Solicitud de recuperación de contraseña con respuesta genérica. Token aleatorio, hasheado, de uso único y expiración. Cambio de contraseña consume token y revoca todas las sesiones de la identidad. No envía ni devuelve la contraseña. Limitación de solicitudes y entradas.
- Transporte de correo HTTPS explícito (adaptador Resend, sin dependencia nueva). Sin credenciales configuradas, el envío falla cerrado con error legible; nunca se finge entrega. Pruebas con capturador sintético, sin mensajes externos.
- Nuevas tablas aditivas sobre esquema 4, versión 5 con transacción y rechazo de versiones futuras. Migración anterior v3→v4 sigue explícita; después Store aplica la ampliación aditiva conocida v4→v5.

## Suscripciones
Sin precios o pasarela aprobados, modelar estado y plan por cuenta como configuración asistida: unconfigured/trial/active/suspended, fecha opcional y auditoría del operador. Solo account_admin puede consultar; no puede autoactivar un pago ni cambiar su suscripción desde API. No interpretar estos estados como cobros, facturas, checkout o recepción de webhook. No aplicar cortes financieros nuevos a operaciones existentes sin política aprobada. Integrar cobros requiere país, moneda, precios, proveedor y credenciales.

## Despliegue y entrega
Servidor alojado separado del launcher local, base inicial previamente provisionada, sin bootstrap público. Contenedor sin root, contexto COPY explícito sin bases/secretos, volumen persistente y healthcheck; proxy Caddy TLS y/o Render gestionado. HTTPS real de dominio público requiere dominio/hosting accesibles. Verificar también HTTPS con certificado local de prueba y navegador que confíe explícitamente en ese certificado solo para el test.

Conservar datos existentes y cambios previos. Añadir documentación operacional, variables ejemplo sin valores secretos y automatizar pruebas en CI. Preparar rama/PR borrador en repo privado si hay permisos, sin fusionar main. No afirmar ejecución de CI remota, entrega de email ni URL pública sin evidencia.

## Aceptación
Pruebas negativas de invitaciones (tenant, rol, expiración, reuso, usuario existente), reset (respuesta genérica, expiración, reuso, revocación de sesiones), cookies/CSRF/Host/Origin/HTTPS, privacidad de suscripciones y persistencia. Recorrido web de invitación y reset con captura sintética. Build Docker y arranque con datos sintéticos; test HTTPS. Suite histórica y SaaS base debe pasar. Documentar claramente los requisitos externos pendientes.
