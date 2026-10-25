# Seguridad y privacidad — políticas iniciales

Esta es una **política de trabajo**, no una afirmación de cumplimiento ni certificación.

- Repositorio **privado**; no alterar visibilidad, despliegues ni otorgar acceso a terceros sin autorización.
- No subir `.env` reales, llaves, tokens, certificados, datos bancarios ni PII de residentes a GitHub.
- Usar datos sintéticos para pruebas y demostraciones. Mantener entornos separados.
- Requerir autorización por tenant y unidad en servidor/base de datos, denegando acceso no autorizado por defecto.
- Guardar comprobantes de modo privado; comprobar permisos antes de descargar archivos y usar URLs temporales.
- Registrar modificaciones de importes, pagos, permisos y exports, sin volcar secretos ni datos sensibles en logs.
- Diseñar respaldos y probar restauración; cifrado en tránsito y reposo según proveedor.
- Revisar dependencias y CI una vez definido el stack. No confiar en controles de seguridad no verificados.
- Antes de datos reales, completar evaluación de privacidad y marco legal del país de lanzamiento.

Para reportar riesgos: crear un issue privado únicamente si **no** revela secretos o exploits reproducibles. Si la vulnerabilidad incluye datos o instrucciones sensibles, utilizar un canal privado autorizado por el propietario; no publicar detalles en issues abiertos.
