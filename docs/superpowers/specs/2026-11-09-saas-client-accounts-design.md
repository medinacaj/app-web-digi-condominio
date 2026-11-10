# Digi-Condominio SaaS: cuentas de clientes y condominios

Fecha: 9 de noviembre de 2026.

## Decisión aprobada

El usuario confirmó que el producto debe ser SaaS y atender tanto a condominios independientes como a empresas administradoras. Aprobó una aplicación común con jerarquía **cuenta del cliente → condominios → unidades**. El paquete Windows queda como herramienta opcional de pruebas, no como modalidad principal del producto.

La aprobación cubre esta estructura. Las decisiones de detalle siguientes son propuestas técnicas para revisión; no se presenta como aprobada una arquitectura productiva, una jurisdicción ni una política comercial.

## Intención

Ofrecer el mismo producto por Internet a clientes con uno o varios condominios, sin duplicar versiones ni permitir que un cliente acceda a información de otro. Conservar los módulos existentes de unidades, cuotas, pagos manuales, reversos, incidencias, comunicados, documentos y gastos.

## Alternativas

1. Aplicaciones separadas para independientes y administradoras: permiten diferencias completas, pero duplican mantenimiento, pruebas y despliegues.
2. Aplicación común con cuentas de cliente y condominios subordinados: comparte funcionalidades, admite crecimiento y centraliza reglas de aislamiento. **Alternativa elegida por el usuario.**

## Entidades y límites propuestos

- **Cuenta de cliente / organización:** unidad de aislamiento comercial y administrativo. Su tipo será `independent` o `management_company`; no equivale a una persona ni a un usuario.
- **Condominio / comunidad:** pertenece a una cuenta. Un independiente empieza con uno; una administradora puede tener varios. Las restricciones de cantidad se definirán con los planes, no como una suposición de seguridad.
- **Unidad:** pertenece a un condominio; cargos, pagos e incidencias conservan ese contexto.
- **Usuario:** identidad personal que puede pertenecer a varias cuentas mediante asignaciones explícitas. Compartir email no concede acceso a todos los clientes.
- **Membresía de cuenta:** permite administrar la cuenta según permisos. Se distingue de la asignación operacional en cada condominio.
- **Membresía de condominio:** conserva los roles actuales `admin`, `committee` y `owner` mientras se diseña una matriz más detallada.

Cada condominio tiene una sola cuenta responsable en esta primera estructura. Delegación entre empresas, copropiedad comercial de una cuenta y transferencia de condominios quedan fuera de la primera entrega. No trasladar información automáticamente al cambiar de administradora.

## Permisos propuestos

| Rol | Alcance |
| --- | --- |
| Administrador de cuenta | Configuración de su cuenta y administración explícita de acceso a sus condominios |
| Administrador de condominio | Operaciones autorizadas únicamente en condominios asignados |
| Comité | Consulta y seguimiento según permisos del condominio; sin ampliar automáticamente los permisos financieros existentes |
| Propietario | Unidades y datos autorizados por su asignación, sin acceso general a la cuenta |

El administrador de cuenta no obtiene acceso operacional implícito a todos los datos. Ese acceso debe concederse y auditarse explícitamente. El propietario de una unidad y el titular de una cuenta son conceptos distintos y deben tener nombres distintos en código e interfaz.

Reglas propuestas para cerrar ambigüedades de implementación:

- Roles de cuenta iniciales: `account_admin` administra la cuenta; `member` no concede administración y sirve de requisito para las asignaciones operacionales. No introducir suspensión global de identidades en esta entrega; sí comprobar revocación de membresías en cada solicitud.
- Todo usuario operacional, incluidos propietarios y comité, necesita membresía activa de cuenta **y** membresía de condominio. Revocar la primera corta acceso a todos los condominios de esa cuenta; revocar una membresía de condominio solo corta ese alcance. Se conserva el historial.
- Los administradores de cuenta pueden conceder/revocar asignaciones operacionales dentro de su cuenta, incluida una asignación a sí mismos; cada concesión es explícita y auditada. No pueden actuar en cuentas ajenas. Los administradores de condominio no pueden elevar su propio rol ni crear administradores de cuenta. La administración del último titular de cuenta debe impedir que esta quede sin responsable.
- Un usuario puede pertenecer a varias cuentas con permisos distintos; revocar una no cancela las otras. La sesión no reemplaza la comprobación de membresías en cada operación.
- Los eventos de cuenta necesitan un registro propio con cuenta, actor, acción, entidad y fecha. `audit_events` actual exige un condominio y no debe usarse con uno ficticio para representar eventos de cuenta. Toda concesión/revocación se confirma o revierte junto con su auditoría.

Estas son propuestas técnicas de mínimo privilegio, no una matriz legal aprobada.

La operación de soporte del proveedor SaaS no tendrá acceso irrestricto por defecto. Acceso excepcional, identidad de soporte y procedimiento de auditoría requieren diseño aparte.

## Aislamiento obligatorio

Toda consulta y escritura debe validar en servidor: sesión válida, membresía/permiso y pertenencia del recurso a la cuenta y condominio correspondientes. No confiar en el selector del navegador ni en identificadores enviados por el cliente.

La relación cuenta-condominio-unidad debe tener integridad referencial. Los informes, miembros, historial, incidencias, exportaciones y futuros archivos deben aplicar la misma separación. Los cambios de contexto en la interfaz deben descartar respuestas antiguas y no permitir operaciones sobre datos del contexto anterior.

Las decisiones pendientes sobre datos históricos de propietarios se mantienen abiertas: añadir cuentas de clientes no resuelve ni autoriza la exposición de información del residente anterior.

## Estado real del código

`server/store.js` contiene usuarios, comunidades, unidades y membresías por comunidad. No existen cuentas de cliente ni membresías de cuenta. `createCommunity`, `communitiesFor`, `member` y `requireAdmin` constituyen puntos centrales de adaptación. `/api/communities` y el selector web exponen solo el contexto actual por comunidad.

El esquema SQLite local usa `user_version=3` e inicialización por CREATE TABLE IF NOT EXISTS. Este mecanismo no basta para introducir arbitrariamente una migración SaaS: se necesita migración explícita, respaldo, validación y rollback. Las comunidades existentes no se agruparán por nombre, email compartido o coincidencias de usuarios. Para bases existentes se requerirá un mapeo explícito de comunidad a cuenta y de administradores iniciales de cada cuenta; no se promoverá automáticamente a todos los administradores de condominio. La migración materializará las membresías de cuenta necesarias para los usuarios ya asignados y rechazará conflictos o cuentas sin responsable; una base sintética nueva podrá inicializarse directamente con la estructura nueva.

La asociación de cuenta debe ser obligatoria en base de datos mediante migración versionada; actualizar los INSERT posicionales, la versión de esquema y las comprobaciones de respaldo/restauración conjuntamente.

El servidor actual está limitado a loopback y no es un despliegue SaaS. Subir código a GitHub no hospeda esta aplicación completa.

## Primera entrega propuesta

Implementar cuentas de clientes, asociación obligatoria de condominios y membresías de cuenta; adaptar permisos y selector de contexto, manteniendo los módulos operativos existentes. Añadir migración controlada y pruebas negativas de acceso entre cuentas.

Para el primer piloto se propone alta asistida de cuentas, sin registro público ni cobro automático. Esto reduce dependencias iniciales, pero es una propuesta; no constituye una política comercial aprobada. La base de datos productiva, proveedor, dominio y servicios de correo se decidirán antes de habilitar acceso externo.

## Criterios de aceptación

1. Crear un cliente independiente con un condominio y una administradora con dos; ambos usan la misma aplicación.
2. Un usuario asignado a varios condominios ve solo los autorizados. Cambiar cuenta no conserva datos, formularios ni respuestas del contexto anterior.
3. Alterar un ID de cuenta, condominio, unidad, incidencia o informe no permite leer ni escribir datos ajenos.
4. El alta o revocación de membresía de cuenta/condominio queda auditada y es atómica; no se eleva un rol operacional por pertenecer a una cuenta. Probar revocación global de cuenta, revocación de un solo condominio, permisos distintos en varias cuentas y rechazo de autoescalamiento por un administrador de condominio.
5. Las pruebas existentes de cuotas, pagos, reversos, backups y privacidad siguen aprobadas, además de los nuevos casos de aislamiento.
6. La migración preserva movimientos y asignaciones y rechaza un mapeo incompleto; nunca reúne comunidades por heurísticas.

## Posterior a la base multi-cliente

- Invitaciones, recuperación de cuentas, sesiones web seguras y MFA según modelo final.
- Hosting con HTTPS, base de datos productiva, archivos privados y secretos fuera del código.
- Planes, límites, suscripciones y facturación comercial.
- Respaldos externos y restauración ensayada, métricas, alertas, retención y soporte.
- País inicial, obligaciones legales y matriz definitiva de permisos.

## Fuera de alcance de esta decisión

No se aprobó proveedor ni gasto recurrente, pasarela de pagos, publicación del puerto local, datos personales reales, certificación legal o contratación comercial. Esta especificación no afirma que el SaaS ya esté implementado o desplegado.
