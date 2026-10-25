# Primera base web — Prototipo 0.1.0

**Estado:** interfaz navegable con datos inventados. **No es un sistema de administración funcional ni un MVP productivo.**

## Ejecución local

Desde la raíz del repositorio:

```bash
npm run serve
```

Abrir `http://localhost:4173`. Alternativamente cualquier servidor estático moderno puede servir el directorio; se usan módulos ES nativos. Requiere Python 3 para el comando `serve` o un servidor estático equivalente. No abrir directamente `index.html` mediante `file://` porque los módulos requieren origen HTTP.

Pruebas sin instalar dependencias:

```bash
npm run check
```

Requiere Node.js 20 o superior. No existe `npm install` obligatorio ni archivos `.env`. CI se ejecuta en PRs y en pushes a `main`, siempre que GitHub Actions esté disponible.

## Secciones desarrolladas (sólo presentación)

- Resumen con indicadores, gráfico de datos relativos, ocupación y últimos movimientos.
- Comunidades y filtro por comunidad.
- Directorio de unidades de muestra con búsqueda.
- Movimientos de pago sintéticos en modo lectura.
- Comunicados demostrativos y creación local **volátil** de un aviso.
- Centro documental de ejemplo (sin archivos reales ni descarga).
- Configuración con pendientes.
- Menú responsive y navegación accesible básica.

## Limitaciones explícitas

- No hay autenticación, sesiones, backend, base de datos, permisos, multi-tenancy efectivo ni control de acceso. **Nunca usar con datos reales.**
- Ni cuentas ni documentos reales; la información se pierde al recargar. No hay facturación, pagos, banco, generación de cuotas ni saldos normativos.
- Las cifras de indicadores se basan parcialmente en un dataset sintético resumido. La lista de unidades es una muestra y no coincide con los totales agregados de comunidades; se señala en pantalla.
- Los nombres de comunidades son ficticios y las unidades monetarias se indican como UM para no fijar país/moneda.
- Sin despliegue, sin publicación ni conexión con servicios de terceros.
- Debe hacerse una revisión visual/manual de accesibilidad y responsive con navegador antes de afirmar que está validado a nivel UX.

## Decisión técnica provisional

Para permitir un inicio sin añadir integraciones, el primer prototipo se realizó con HTML, CSS y JavaScript ECMAScript Modules, sin dependencias externas. **No es una decisión definitiva del stack de producción.** La evolución a React/Next.js, API, bases de datos, autenticación y hosting se documentará mediante ADR, validación del país y criterios de seguridad.

## Evidencia

Tests de lógica bajo `tests/domain.test.js`; registrar el resultado real de `npm run check` y del CI antes del merge. El código está sujeto a revisión en PR, no a despliegue público.

## Pruebas de interacción realizadas en esta fase

Se ejecutaron pruebas en Chromium con un ensamblado **temporal offline** de los mismos archivos CSS y JS (sin conexiones de red): captura de escritorio/móvil, navegación entre módulos, filtro de búsqueda, creación temporal de un comunicado y menú móvil. No hubo errores JS. Se corrigió un desbordamiento y se confirmó ancho correcto a 360/390/768/1440 px. El Chromium del entorno bloqueó la navegación HTTP; las rutas HTTP fueron comprobadas por separado con Python, por lo que sigue pendiente una prueba integral de módulos ES en navegador servido y una evaluación de accesibilidad.

## CI remoto GitHub Actions (2026-10-25)

La ejecución `40224344777` del workflow **Comprobaciones del prototipo**, asociada al PR #9, terminó con estado `completed` y conclusión **success**. Esto valida los pasos automatizados configurados de sintaxis y pruebas unitarias, no despliegue ni seguridad productiva.
