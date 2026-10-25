# Contexto maestro — Digi-Condominio

**Versión de planificación:** 0.1 (propuesta, no producto liberado)  
**Actualizado:** 2026-10-25  
**Clasificación:** documento interno / repositorio privado.

## Identidad y visión

Digi-Condominio es el **nombre técnico del repositorio**, no una marca comercial aprobada. El producto se plantea como SaaS web para administrar comunidades, edificios, condominios y unidades inmobiliarias, con transparencia operativa y financiera para administradores, comités y propietarios.

### Origen de las ideas

Existe una planificación anterior sobre «CondoTech Venezuela» (Proyecto Maestro de Negocios Digitales Chile–Venezuela, 05-08-2026), junto con módulos de incidencias residenciales y portal de propietario remoto. Se usan **como hipótesis de producto**, no como prueba de implementación ni como aprobación de nombre, país, precio o arquitectura. La aplicación Digi-Condominio no ha sido verificada como idéntica a CondoTech.

### Naming

La marca final está **pendiente**. Candidatos bajo estado **Posible**, no aprobados: Mi Comunidad Digital, Mi Comunidad Fácil, Comunidad en Gestión, Mi Condominio Digital. «Mi Comunidad Digital» presenta posible conflicto comercial y requiere una revisión rigurosa. No registrar como marca aprobada ni reintroducir nombres descartados.

## Usuarios propuestos

- Administrador: configura edificios, unidades, cuotas, cobros, comunicaciones y reportes.
- Comité: supervisa información, documentos y actividades autorizadas según reglas de cada comunidad.
- Propietario o residente: consulta sus cargos, pagos, avisos y documentos asignados.
- Superadministrador de la plataforma: soporte limitado y auditable; sin acceso implícito a datos financieros o privados.

Los permisos definitivos y las delegaciones son decisiones pendientes; una persona podría pertenecer a varias comunidades.

## MVP propuesto — sujeto a validación de alcance

1. Alta de comunidad, edificios y unidades con aislamiento entre comunidades (multi-tenant).
2. Invitaciones, identidad, membresías y permisos por rol y comunidad.
3. Propietarios/unidades; relaciones de propiedad, residencia y delegación con vigencia histórica.
4. Cuotas y conceptos, cargos por periodo, registro **manual** de pagos y comprobantes; saldo/estado de cuenta.
5. Gastos, proveedores y documentación básica; reportes y exportación.
6. Avisos/documentos con controles de visibilidad; portal responsive para propietarios.
7. Registro de auditoría y trazabilidad de cambios financieros, accesos y permisos.
8. Importación inicial desde CSV/Excel con vista previa, validación y reversión controlada.

La contabilidad completa, pasarela propia, custodia de dinero, control de acceso físico, votaciones, reservas, IoT e integración con sistemas externos quedan **fuera del MVP preliminar**. Incidencias y propietario remoto son opciones de fase posterior.

## Flujo principal propuesto

Administrador crea comunidad y unidades → invita usuarios → configura conceptos y cuotas → genera cargos → registra pagos/comprobantes → revisa saldos y gastos → propietarios consultan estado de cuenta y documentos → queda evidencia auditable.

## Arquitectura: criterios, no selección cerrada

- Diseño multi-tenant con separación demostrable de datos, preferiblemente enforcement en backend y base de datos.
- Autenticación y autorización en **cada operación**, denegación por defecto y privilegios mínimos.
- Operaciones financieras con integridad, idempotencia, inmutabilidad o reversos auditables; no sobrescribir historial.
- Almacenamiento privado de comprobantes con autorización y enlaces de corta duración.
- Cifrado en tránsito y reposo, mínimos datos personales, control de retención, exportación y eliminación según base legal.
- Respaldo con ensayo de restauración, registros sin secretos, monitoreo y continuidad operativa.
- Infraestructura, proveedor cloud, framework, base de datos, región y costos **pendientes de evaluación**.

## Regulación por validar según país

**Jurisdicción inicial no decidida.** Si el lanzamiento es en Chile, revisar Ley 21.442 de copropiedad y su normativa complementaria y el régimen de datos personales, incluyendo Ley 21.719, cuya entrada en vigencia está fijada para el **01-12-2026**. Validar requerimientos con asesoría competente, no asumir que un producto es jurídicamente conforme por incluir funciones. Si el lanzamiento es en Venezuela u otro país, levantar matriz normativa local antes de fijar reglas financieras/administrativas.

Fuentes legales de referencia:
- https://www.bcn.cl/leychile/Navegar?idNorma=1174663&idVersion=2026-09-23
- https://www.bcn.cl/leychile/Navegar/imprimir?idNorma=1209272

## Validación comercial (referencia, no compromiso)

El plan previo planteaba pilotos de 3 edificios y 200 unidades durante 3 meses, con metas referenciales: 2 de 3 renovaciones y reducción de 30% del cierre mensual. Las cifras sirven para diseñar el experimento; requieren ratificación para Digi-Condominio.

## Riesgos abiertos

Aislamiento entre comunidades, permisos, accesos a documentos financieros, exactitud de saldos, migración de Excel, fraude/duplicidad de comprobantes, baja adopción, exigencias legales distintas por país, soporte y costos operativos.

## Exclusiones y protección intelectual

Mantener repositorio **privado** y evitar datos reales, secretos o archivos confidenciales de terceros en control de versiones. Ningún cambio de visibilidad, proveedores con acceso al código o despliegue público se ejecuta sin autorización explícita.

## Reglas de continuidad

Toda decisión registra fecha, motivo y efectos. Toda tarea distingue **propuesta / aprobada / implementada / probada / publicada**. Cada PR debe actualizar documentación y evidencia técnica, y ningún cierre de issue debe fingir validaciones no efectuadas.
