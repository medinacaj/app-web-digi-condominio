# Piloto en línea de Digi-Condominio

## Qué está preparado

- Entrada alojada `npm run start:hosted` con origen público HTTPS obligatorio y base persistente explícita.
- Sesión con cookie HttpOnly/Secure y protección CSRF. No devuelve el token de sesión al JavaScript alojado. Restablece sesión válida al recargar.
- Invitaciones de cuenta con rol y condominio opcional; enlace personal, caducidad de 24 horas, hash en la base y uso único. Las modificaciones de permisos invalidan enlaces previos para evitar restaurar privilegios revocados.
- Recuperación con respuesta genérica, token de una hora y uso único; cambiar contraseña revoca sesiones anteriores. La respuesta no espera al proveedor de correo.
- Estado y plan de suscripción por cuenta como metadatos asistidos, con auditoría. **No hay checkout, cargos, facturas, pasarela ni confirmación de pagos.** Los estados todavía no restringen las operaciones del cliente.
- Docker sin root, volumen `/data`, proxy TLS Caddy y plantilla de servicio Render con disco persistente.

La preparación no es un despliegue. No se ha creado un servidor remoto ni una URL pública. Las pruebas de correo usan mensajes sintéticos capturados; no verifican entrega externa real.

## Camino recomendado para el primer piloto

La plantilla `render.yaml` permite al titular crear un servicio conectado al repositorio privado. Render proporciona una URL HTTPS de servicio; no es obligatorio comprar primero un dominio web propio. **La instancia con disco requiere un plan facturable**: revisar el precio, región y condiciones vigentes antes de crear recursos. Este trabajo no contrata ni paga ese servicio.

1. Crear/conectar la cuenta de hosting y autorizar únicamente el repositorio necesario. Elegir la rama de implementación revisada; no activar despliegue de `main` mientras falten decisiones.
2. Revisar la plantilla y su costo antes de aplicarla. El servicio ejecuta una sola instancia y conserva `/data`; no usar servicio gratuito con disco efímero, varias réplicas ni serverless.
3. Copiar la URL real asignada por el proveedor a `DIGI_PUBLIC_ORIGIN`. Debe comenzar por `https://`, sin ruta, parámetros ni credenciales; no inventar la URL por el nombre del servicio.
4. Configurar de forma segura las variables de correo y primera cuenta descritas abajo. El arranque falla de forma legible si faltan requisitos, sin ofrecer un bootstrap público.
5. Arrancar, comprobar health, crear la primera sesión y probar una invitación y recuperación con identidades sintéticas. Comprobar persistencia tras reinicio y recuperación de un respaldo antes de ampliar el piloto.
6. Quitar la contraseña de bootstrap de los ajustes del hosting después de crear la cuenta inicial. Los siguientes arranques detectan usuarios existentes y no los vuelven a crear.

No pegar claves en el chat, issues, Dockerfile o Git. No cambiar la visibilidad privada del repositorio.

## Variables del servidor

| Variable | Uso |
| --- | --- |
| `DIGI_PUBLIC_ORIGIN` | Origen HTTPS real del piloto |
| `DIGI_DB_PATH` | Ruta absoluta en disco persistente, por ejemplo `/data/condominio.sqlite` |
| `DIGI_HOST` | `0.0.0.0` dentro del contenedor; por defecto loopback fuera de él |
| `PORT` | Puerto HTTP interno; el borde publica HTTPS |
| `DIGI_TRUST_PROXY` | `1` solo detrás de un proxy que controle X-Forwarded-Proto y sin backend HTTP públicamente expuesto |
| `DIGI_MAIL_API_KEY` | Credencial del proveedor Resend, ingresada como secreto |
| `DIGI_MAIL_FROM` | Dirección remitente verificada por el proveedor |
| `DIGI_ADMIN_EMAIL`, `DIGI_ADMIN_PASSWORD`, `DIGI_COMMUNITY_NAME` | Inicialización privada, solo para una base vacía |
| `DIGI_ACCOUNT_NAME`, `DIGI_ACCOUNT_KIND` | Nombre opcional y tipo del primer cliente (`independent`/`management_company`) |

El adaptador usa `https://api.resend.com/emails`; el dominio remitente debe verificarse según el proveedor para invitar destinatarios reales. Un sandbox del proveedor puede limitar los destinatarios. Configurar nombres de variables o una clave de prueba no prueba que el correo funcione. Se necesitan la cuenta del proveedor, el remitente y la credencial auténtica en los ajustes del hosting.

La comprobación `/api/health` es pública y no devuelve usuarios, cuentas ni sesiones. Las demás rutas alojadas requieren Host y transporte HTTPS esperados; las mutaciones requieren Origin correcto y las autenticadas además CSRF. La protección contra intentos de contraseña se aplica por identidad normalizada, sin confiar en X-Forwarded-For enviado por el cliente.

## Alternativa en servidor Linux propio

`deploy/compose.yml` ejecuta backend privado y Caddy, que obtiene certificados para `DIGI_DOMAIN`. Requiere dominio apuntado al servidor, puertos 80/443 y correo de contacto para TLS. No se requiere modificar el servidor local `npm start` para exponerlo.

Configurar las variables del servidor en el entorno privado del operador y añadir `DIGI_DOMAIN` y `DIGI_TLS_EMAIL`. Validar con `docker compose -f deploy/compose.yml config --quiet` y, tras aprobar la publicación, ejecutar `docker compose -f deploy/compose.yml up -d --build`. No publicar el puerto 3000 del backend. El apagado admite hasta 30 segundos para cerrar conexiones y vaciar entregas pendientes.

No ejecutar esos comandos sobre un servidor ajeno ni interpretar este documento como una compra de infraestructura aprobada.

## Cuentas y datos anteriores

La base de cuentas continúa documentada en [SAAS_BASE.md](SAAS_BASE.md). Una base v3 requiere la migración explícita y respaldada v3→v4. Abrir la v4 con esta versión aplica las tablas aditivas de identidad/suscripción y marca esquema **5**, en una transacción. Respaldar antes de actualizar; no usar un binario anterior con una base más reciente.

Los permisos de cuenta y condominio siguen separados. Aceptar una invitación para una identidad existente exige iniciar sesión con ese correo y no reemplaza su contraseña. Los cambios de membresía anulan invitaciones previas, y emitir otra invitación al mismo correo/cuenta reemplaza el enlace anterior.

## Suscripción asistida

`npm run subscription:set` es una CLI privada del operador, no una API de autosuscripción. Requiere `DIGI_SUBSCRIPTION_ACCOUNT`, `DIGI_SUBSCRIPTION_PLAN`, `DIGI_SUBSCRIPTION_STATUS` (`trial`, `active`, `suspended`) y opcionalmente `DIGI_SUBSCRIPTION_EXPIRES` en ISO UTC con milisegundos. Los cambios se guardan junto con su auditoría.

La interfaz muestra ese estado solo al administrador de la cuenta y aclara que no equivale a cobros. Para activar pagos reales faltan país, moneda, precios, proveedor, credenciales, checkout, webhooks autenticados e idempotentes y política de acceso/cancelación aprobada. No se inventaron importes ni se efectuaron cargos.

## Comprobaciones reproducibles

- `npm run check`: sintaxis y pruebas de dominio, API, permisos, migraciones, tokens, auditoría y configuración alojada.
- `DIGI_E2E_MODE=direct python tests/browser-e2e.py`: recorrido histórico.
- `python tests/local-launcher-browser.py`: arranque opcional local y persistencia.
- `python tests/accounts-browser.py`: cuentas, contextos y administración.
- `python tests/online-browser.py`: HTTPS local verificado con clave de prueba específica, cookie, recarga, invitación y reset con captura sintética. No deshabilita la verificación TLS del producto ni usa credenciales de correo reales.
- `docker build -t digi-condominio:pilot-test .` y `python scripts/testing/container-smoke.py`: backend sin root ni puerto HTTP publicado, proxy TLS con CA local explícitamente confiada, operación CSRF y persistencia después de reiniciar. Solo contenedores y volúmenes de prueba propios.

Las pruebas de navegador requieren Python+Playwright y Chromium/Chrome; no son dependencias de la aplicación publicada. `openssl` se usa solo para el certificado de prueba.

## Límites operativos y antes de datos reales

SQLite en una instancia conserva el comportamiento actual del MVP; no aporta alta disponibilidad, escalado horizontal ni una aprobación de arquitectura productiva. Falta probar la infraestructura y correo externos, respaldos fuera de sitio, monitoreo, alertas, restauración supervisada, MFA y política legal/de datos.

La recuperación usa una cola en memoria acotada a 32 entregas: al apagar se espera su cierre, pero un fallo de proceso puede perder el correo pendiente. El hash huérfano caduca; el usuario puede volver a solicitarlo después de un minuto. No es una cola durable ni una garantía de entrega. La retención y limpieza operacional de tokens/auditorías deben definirse para producción.

Permanecen los hallazgos anteriores sobre historial de incidencias >100 eventos, auditoría de exportaciones y privacidad histórica de propietarios. El piloto no autoriza datos personales reales ni certifica seguridad, cumplimiento o disponibilidad.

## Nueva decisión comercial
El usuario solicita pagos reales. Su implementación requiere confirmar país de la entidad cobradora, moneda, precios y proveedor compatible. Los metadatos actuales no constituyen cobro real; no se activó una pasarela ni se inventaron importes.

El titular confirmó entidad cobradora en **Chile** y precios en **USD**. Véase
[PAGOS_REALES.md](PAGOS_REALES.md) para el alcance y los requisitos de la integración.
