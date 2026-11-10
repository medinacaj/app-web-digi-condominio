# Demo estática para GitHub Pages

La rama `demo/github-pages` contiene únicamente HTML/CSS/JS con datos ficticios. La entrada carga directamente main.js, sin sondeo API ni backend. No incluye credenciales, SQLite, servidor, sesiones, checkout o pagos. Los cambios de comunicados son temporales en el navegador.

Se verificaron las siete pantallas en Chromium sirviendo la demo desde un subdirectorio de proyecto; sin errores JavaScript ni solicitudes API.

Para regenerar: `python3 scripts/build-demo.py /ruta/nueva/demo` (la ruta de destino debe ser nueva). Publicar solo ese directorio en la rama de demo, sin fusionarla con main ni incluir el checkout completo.

## Activación pendiente
El token de esta integración recibió HTTP403 al consultar/crear GitHub Pages. La rama ya está subida; el propietario debe activar Pages en Settings → Pages si su plan permite Pages para repositorios privados. Conservar el repositorio privado.

Seleccionar **Deploy from a branch**, rama **demo/github-pages**, carpeta **/(root)** y guardar. GitHub mostrará la URL real después del despliegue; no se ha verificado ni se anuncia una URL pública antes de ese resultado.

Un repositorio privado no implica un sitio Pages privado. Revisar la visibilidad del sitio antes de activarlo. Todo el contenido de esta demo es sintético y carece de funcionalidad de cuentas o cobros reales. Si el plan no admite Pages en repositorios privados, no cambiar la visibilidad del repositorio como solución automática.
