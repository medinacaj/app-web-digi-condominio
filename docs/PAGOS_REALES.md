# Suscripciones con pagos reales

## Definiciones confirmadas por el titular
- Empresa cobradora registrada en Chile.
- Mercado objetivo: Latinoamérica.
- Moneda del precio de la suscripción: dólares estadounidenses (USD).
- Se requieren pagos reales; la configuración asistida de suscripción no los sustituye.

## Tarifa base aprobada
US$0,75 por unidad al mes, con mínimo de US$25 por condominio. Para administradoras se suman los importes de cada condominio; no se aplican descuentos sin una definición adicional. El servidor calcula en centavos enteros y ofrece una cotización privada al administrador de cuenta. Impuestos y comisiones están pendientes; no se ha decidido cómo se incorporan al precio final. Esta cotización no ejecuta cargos.

## Pendientes comerciales necesarios
Descuentos por volumen, impuestos, comisiones, prueba gratuita, cancelaciones y reembolsos. No se habilitaron cargos.

## Selección e integración
Evaluar una pasarela que permita a la entidad comercial chilena habilitar suscripciones recurrentes denominadas en USD. PayPal es una candidata por verificar con la cuenta comercial concreta. No se presume elegibilidad del comerciante, del producto de suscripciones o del retiro de fondos por aceptar el país y moneda en una API. Denominar el precio en USD tampoco garantiza liquidación bancaria en USD: confirmar conversión, comisiones, disponibilidad y obligaciones tributarias con el proveedor y asesor correspondiente.

La documentación oficial no pudo consultarse desde este entorno (403); por ello no se declara una pasarela seleccionada ni compatible como hecho verificado. La integración necesita esa validación y credenciales de prueba/producción ingresadas de forma segura.

## Requisitos técnicos del siguiente incremento
- Catálogo de planes definido por el servidor con precios USD exactos y periodicidad aprobada; el cliente no envía importes confiables.
- Checkout alojado por el proveedor; no almacenar ni procesar tarjetas en la aplicación.
- Vincular suscripción externa y cuenta cliente; impedir acceso o cambio por otra cuenta.
- Webhook autenticado con verificación oficial de firma, idempotencia persistente y tratamiento de eventos repetidos/fuera de orden.
- La redirección de retorno o el botón de aprobación no marcan una suscripción como pagada. Confirmar estado mediante proveedor y eventos autenticados.
- Conservar historial de cobros y conciliar discrepancias; diseñar cancelación, impagos y reembolsos antes de cortar acceso.
- Validar flujo completo en sandbox antes de habilitar producción; las pruebas sintéticas actuales no equivalen a un pago real.

No se han creado productos, planes externos, suscripciones pagadas, cobros o cuentas comerciales. No enviar claves por chat ni guardarlas en Git.
