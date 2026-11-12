# Sistema de identidad propuesto · DigiCondominio / URBIORA
**Versión:** propuesta 0.1 · 2026-11-12 · **No aprobado / no publicado**.

## Nota de nombre comercial
El repositorio técnico es `medinacaj/app-web-digi-condominio`. En la cartera MediOS aparece como **URBIORA — Gestión residencial**, mientras el propietario también lo llama **DigiCondominio**. **La elección de marca comercial no está validada aquí.** Diseñar un isotipo residencial independiente de ambos nombres: permitirá decidir entre «DigiCondominio» y «URBIORA» sin rehacer todo el sistema. No renombrar repositorio, aplicación, dominio o package hasta contar con decisión expresa.

## Diagnóstico basado en código
La app usa `src/styles.css` con base `#172138`, `--primary:#466ae9`, sidebar azul oscuro, tarjetas blanco/gris, monograma en degradado azul y navegación similar al dashboard de DigiFirma. Esto dificulta diferenciarlos como negocios distintos. Se requiere una gramática visual residencial propia, no solo recolorear botones.

## Posicionamiento
- **Categoría:** software de administración para comunidades residenciales, condominios, juntas y gestores; el SaaS multiusuario y el backend productivo no están acreditados por una demo.
- **Propuesta de valor:** «La comunidad organizada, en un solo lugar».
- **Personalidad:** cercana, confiable, práctica, acogedora, eficiente; no infantil ni informal respecto de pagos, datos de residentes o incidencias.
- **Audiencias:** administraciones, propietarios, comités y equipos de mantenimiento, con permisos separados según rol.

## Dirección visual B — Barrio conectado
**Idea de logo principal:** tres módulos verticales de altura variable que forman una **manzana/comunidad** en negativo, unidos por una línea de patio/plaza compartida. Evitar clip art genérico de casa, tejados con checkmark y símbolos de firma. Una forma redondeada permite favicon legible.
- **Firma horizontal:** isotipo + denominación comercial elegida al aprobar el nombre.
- **Isotipo:** manzana compacta de bloques/patio con énfasis en espacio común; reconocible sin letras en 16 × 16.
- **Monocromo:** versiones en verde profundo y blanco; mantener claro de 1 px entre espacios negativos a 16 px.
- **Alternativa:** geometría de 4 viviendas en cuadrante alrededor de patio interior, sin gradientes; validar cuál funciona mejor en pantalla móvil.
- **Reglas:** al menos una unidad estructural de espacio libre en torno al símbolo; tamaños mínimos por validar tras dibujar vectores.

### Paleta propuesta
| Token | HEX | Función |
|---|---|---|
| `--dc-forest` | `#0D5348` | Marca, navegación contextual, CTA principal y encabezados |
| `--dc-sand` | `#E9B894` | Superficies de acento cálidas, ilustraciones y chips (texto oscuro) |
| `--dc-cream` | `#F7F4ED` | Fondo general acogedor |
| `--dc-terracotta` | `#DB7258` | Detalles, progreso residencial y avisos no críticos; **no texto pequeño sobre blanco** |
| `--dc-ink` | `#22362F` | Texto y elementos de alto contraste |
| `--dc-white` | `#FFFFFF` | Campos, tablas y superficies |
| `--dc-error` | `#A8343E` | Errores y fallos críticos; verificar contraste y no depender solo de color |

**Contrastado en pares preliminares (WCAG):** verde/crema 8.14:1; arena/verde 5.00:1; verde/blanco 8.94:1. Terracota/blanco es 3.20:1, por eso **no** se usaría para texto normal sobre blanco. Revisar otros pares/estados con pruebas automáticas antes de aplicar.

### Tipografía y gramática visual
- **Titulares:** **DM Sans** 600–750 (licencia/hosting sujetos a revisión) o `system-ui`; redondez sutil, carácter cercano y modular.
- **Cuerpo e interfaz:** **Nunito Sans** 400–650 (sujeto a licencia/hosting) o `system-ui`; no usar tipografía manuscrita para pagos y cifras.
- **Layout landing:** cálido y espacial; bloques asimétricos de «Comunidad → Cuotas → Incidencias → Avisos», fotos/ilustraciones propias de edificios con permiso, ejemplos de vecinos ficticios y una escena de comunidad.
- **Dashboard:** encabezado con selector de comunidad visible y estado; tarjetas operativas que prioricen unidades, solicitudes, cuotas/avisos y actividad; agrupaciones por espacios y uso, **no** replicar la columna de expedientes de DigiFirma.
- **Componentes:** radio de 12–18 px, superficies crema, bordes discretos, secciones suaves, componentes más grandes y fáciles de usar por personas no técnicas; gráficos solo con datos sintéticos en la demo.
- **Iconografía:** edificios, unidad, llave, recibo, mantenimiento, calendario, vecinos y mensajes. Biblioteca consistente de trazo redondeado. La firma gráfica es **comunidad**, no legalidad documental.
- **Estados:** cuota, incidencia, lectura, aviso, gestión: siempre texto/ícono junto a color; advertencias financieras claras, sin prometer cobros reales.

### Voz de marca
Directa, cotidiana y útil:
- Preferir: «Tu comunidad, mejor coordinada», «Ver incidencias», «Consultar cuotas de ejemplo», «Una administración más clara».
- Evitar: «Pagos 100 % protegidos», «Tu condominio ya está digitalizado», «Datos reales de residentes», «Sistema bancario integrado» si el producto continúa en demo.
- Tratar «DigiCondominio» y «URBIORA» como **opciones de naming pendientes**; no mezclar ambas marcas en una misma pantalla sin definir jerarquía.

## Sistema de logo y favicon
- **Favicon final:** símbolo manzana/patio de geometría reconocible; fondo verde sólido, módulos claros o arena. Debe diferenciarse claramente del documento/sello de DigiFirma en una pestaña de 16 px.
- **Derivados tras aprobación:** `src/brand/condominio-logo.svg`, `condominio-symbol.svg`, `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` (180 × 180), `social-card.png` (1200 × 630). Nombres de archivo definitivos dependen de elegir marca comercial.
- **Integración:** title/meta/OG, PWA si aplica, tema de navegador, icono de app, header, sidebar, demo Pages, estados de carga y futuras notificaciones. No publicar fotos de inmuebles sin derechos comprobados.
- **No integrar código sensible en Pages:** la rama `demo/github-pages` debe contener solo frontend y datos sintéticos; mantener backend, PII y operaciones monetarias fuera del paquete.

## Diferenciación explícita frente a DigiFirma
| Atributo | DigiCondominio / URBIORA | DigiFirma |
|---|---|---|
| Logomark | Comunidad/manzana/patio | Documento/trazo de aprobación |
| Marca cromática | Verde bosque / arena / terracota | Azul tinta / metal dorado / papel |
| Arquitectura | Operativa, comunidades y vecinos | Editorial y expedientes |
| Fotografía/ilustración | Vivienda, calles, convivencia | Documento abstracto y trazabilidad |
| Lenguaje | Cercano y resolutivo | Formal y documental |
| Navegación | Comunidad → unidades → cuotas → incidencias | Documentos → solicitudes → auditoría |

## Criterios de aceptación del branding (trabajo posterior)
- [ ] Decidir si el nombre visible será **URBIORA**, **DigiCondominio** u otra opción. Solo entonces diseñar el logotipo textual definitivo.
- [ ] Elegir isotipo original, comprobar a 16 px, 32 px, claro/oscuro y monocromo.
- [ ] Crear gráficos SVG editables y derivados PNG sin depender de iconos genéricos de bibliotecas.
- [ ] Aplicar el lenguaje a landing/demo Pages, panel, navegación, estados, favicon, metadata y futuros login/registro.
- [ ] Confirmar contraste WCAG AA, tamaño táctil de controles y navegación con teclado.
- [ ] Mantener contenido demo ficticio; no usar cuentas ni pagos reales para evaluar branding.
- [ ] Ejecutar CI y pruebas en Windows/Linux como aplique. El [PR SaaS #24](https://github.com/medinacaj/app-web-digi-condominio/pull/24) tiene un bloqueo Windows independiente, registrado en [Issue #25](https://github.com/medinacaj/app-web-digi-condominio/issues/25).
- [ ] Abrir PR de implementación después de aprobar concepto, sin fusionar ni desplegar sin revisión.

**Esta PR solo propone identidad.** No incluye logotipos/favicons definitivos, no cambia CSS/HTML ni modifica la publicación actual.
