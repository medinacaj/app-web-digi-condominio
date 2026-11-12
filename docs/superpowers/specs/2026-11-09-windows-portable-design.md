# Digi-Condominio portátil para Windows

El usuario aprobó proceder con el iniciador de doble clic, configuración sencilla y paquete descargable. Quiere probar en su PC sin Git ni comandos cotidianos. Se mantiene Node, SQLite y la interfaz existente.

Enfoques: instalar Node más un iniciador reduce descargas, pero exige una instalación adicional; incluir el runtime oficial en un ZIP permite extraer y usar. Se adopta este último como decisión de implementación para simplificar el uso. Paquete Windows x64 (Intel/AMD); no se presupone soporte ARM nativo.

`Iniciar Digi-Condominio.cmd` invoca runtime/node.exe incluido o Node instalado como alternativa y abre el navegador solo cuando el servidor escucha en 127.0.0.1:4173. Una nueva página local pide comunidad, email, contraseña y confirmación solo si no existen usuarios. Valida y crea las tres entidades en una transacción usando Store. No escribe contraseñas en archivos ni logs. Después presenta el login existente. Reinicios preservan la base .data y nunca reinicializan cuentas. Un puerto ocupado produce una explicación sin cerrar procesos ajenos.

La configuración acepta solo Host/Origin locales y un token impredecible; limita el cuerpo, escapa entradas y deshabilita setup tras el alta. No habilitar acceso remoto. Descargar el runtime desde nodejs.org con TLS y verificar SHA-256 contra SHASUMS256.txt. El ZIP incluye licencias, instrucciones breves y archivos explícitamente seleccionados, sin Git, DB, secretos ni herramientas de desarrollo. La copia en GitHub es opcional y no se publica ni se hace push en este trabajo.

Aceptación: primera configuración y login funcionales vía HTTP y navegador; rechazar alta inválida y petición de origen ajeno; no permitir segunda alta; reinicio conserva usuarios y movimientos; errores legibles; paquete comprobado sin datos privados. Pruebas Windows nativas se registrarán solo si se ejecutan realmente. El entorno actual es Linux; se añadirá CI Windows para validación posterior sin afirmar que se ejecutó remoto.
