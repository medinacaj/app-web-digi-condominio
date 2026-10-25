# Auditoría inicial verificable — 2026-10-25

Repositorio: `medinacaj/app-web-digi-condominio`. Alcance: metadata, contenido raíz de `main`, ramas, commit, issues y PRs. No es pentest ni auditoría funcional: el código no existe.

| Área | Resultado | Riesgo | Acción |
|---|---|---|---|
| Confidencialidad | Repositorio privado | Control actual favorable; no equivale a acceso exclusivamente humano | Revisar colaboradores, apps, tokens y permisos periódicamente |
| Código | Único `README.md`, 25 bytes | No hay producto | Definir MVP y base técnica |
| Historia | Un commit `Initial commit` | Sin seguimiento de avances | Adoptar issues + PR |
| Ramas | Solo `main` al inspeccionar | Sin flujo separado | Ramas para cambios |
| Protección | `main` figura `protected: false` | Escritura directa accidental | Evaluar GitHub Pro/rulesets privados u otra protección compatible |
| Rulesets | Consulta HTTP 403, se solicita GitHub Pro o repositorio público | Protección nativa no disponible bajo acceso/plan actuales | **No** volver público; evaluar upgrade y controles operativos |
| CI/tests | Sin archivos de CI ni tests | Calidad no medible | Añadir CI cuando exista stack |
| Seguridad del producto | No se puede verificar autenticación, autorización, cifrado ni backups | Riesgo futuro alto, no vulnerabilidad demostrada | Diseñar controles antes de manejar datos reales |
| Privacidad | No hay política implementada ni tratamiento real verificado | Requisitos por país pendientes | Definir país, minimización, retención y documentación |
| Despliegue | Sin configuración hallada | Aplicación no publicada según evidencia del repo | No asumir despliegue inexistente fuera de GitHub |
| Dependencias | Sin manifiestos | No aplica escaneo de dependencias aún | Añadir herramientas con el proyecto |

## Limitaciones

No se inspeccionaron ajustes de colaboradores/tokens ni servicios externos; no hay permisos suficientes para todos los endpoints de seguridad de GitHub. La ausencia de archivos de despliegue no prueba que ningún servicio externo exista. Ninguna prueba dinámica, de compilación, rendimiento ni vulnerabilidades se ejecutó.

## Seguridad antes del MVP

1. Matriz de permisos por rol y tenant con pruebas negativas de acceso cruzado.
2. Gestión segura de archivos, importaciones, identificadores y datos personales.
3. Integridad de cargos, pagos, reconciliaciones y auditoría.
4. Mecanismo de backup y restauración verificada antes del piloto.
5. Evaluación legal según jurisdicción, sin inventar certificaciones.

## Resultado

**Repositorio apto para fase de definición, no apto para producción.** Documentación propuesta en rama de trabajo; requiere validación e integración.
