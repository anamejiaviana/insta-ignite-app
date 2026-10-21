# Auditoría pre-cobros (modo prueba) — Anypostly

Alcance: solo análisis y plan. No se activa ningún cobro real.

## 1. Estado actual comprobado

| Tema | Hallazgo |
|---|---|
| Cuentas | 5 en total: 1 `comp` ilimitada (la propietaria, plan `admin`) y 4 `legacy` en `basic`, con 1 negocio cada una. No hay ninguna `trial`, `active` ni `expired` todavía. |
| Cobros integrados | Ninguno: no hay código de Stripe/Paddle, checkout, webhook ni portal de cliente. Funciones del servidor: solo las 7 de IA y la de limpieza de almacenamiento. |
| Secretos | Solo los internos (clave de IA y claves propias del backend). No hay ninguna clave de Stripe guardada. |
| Página de planes | Muestra 29 / 69 / 115 € y avisa de que el pago online aún no está disponible. |
| Cupos de IA (servidor) | Solo/basic 30 imágenes y 200 textos; pro 80 y 500; studio 150 y 1000; ilimitado 9999 (si `business_limit = -1`). Prueba: 5 imágenes y 40 textos en total, 7 días, y tope diario de 30 imágenes entre todas las pruebas. Se reserva antes de llamar a la IA y se devuelve si falla. |
| Cambio de estado | Un trigger impide que la app cambie estado o fechas de la prueba; solo el servidor puede poner `active`. Solo los admins pueden editar planes. |
| **Límite de negocios** | **Solo se controla en pantalla.** La regla de alta de negocios solo comprueba que el negocio sea tuyo; no cuenta cuántos tienes. Una cuenta Solo o de prueba podría crear más de 1 negocio desde fuera de la app. |
| Datos de plan | No se guardan cliente ni suscripción de Stripe, ni fin de periodo, ni "cancelar al final", ni impago. Pro y Studio no tienen límite de negocios definido en la base de datos (hoy se tomaría el valor por defecto, 1). |

## 2. Qué corregir antes de cobrar

1. Límite de negocios en el servidor: Solo 1, Pro 3, Studio 5, prueba 1, comp ilimitado; legacy se queda como está. Los negocios que ya existen se respetan siempre.
2. Que el plan pagado decida los límites (`plan_name` + `status='active'`), no el número `business_limit = -1`.
3. Guardar los datos de suscripción en un sitio que solo el servidor pueda escribir.

## 3. Implementación propuesta

**Pasarela.** Usar los pagos integrados de Lovable con Stripe. Arrancan en modo prueba, no necesitan cuenta propia ni claves y traen checkout, portal de cliente, webhooks e impuestos. Solo se activa desde el chat del editor de Lovable, cuando la propietaria lo pida. No se recomienda conectar una cuenta propia con claves.

**Productos.** Solo 29 €, Pro 69 € y Studio 115 €, cobro mensual, en EUR. Precio con IVA incluido para compradores de la UE (el IVA se calcula según el país; habrá que confirmar si 29 € incluye ya el IVA o no).

**Flujo.**
```text
Ver planes -> Checkout (pide NIF/empresa opcional, SCA/3DS automático)
  -> webhook firmado -> servidor actualiza el plan (idempotente por id de evento)
  -> la app relee el plan; los cupos cambian al instante
```

| Situación | Comportamiento |
|---|---|
| Alta pagada | `active`, plan elegido, fin de periodo guardado. Se reinicia el cupo del mes. |
| Renovación | Factura pagada: se amplía el fin de periodo. |
| Impago | Estado `past_due` con unos días de gracia y aviso; si sigue sin pagarse, `expired` (solo lectura). |
| Cancelar | Siempre al final del periodo; el acceso se mantiene hasta esa fecha. |
| Subir de plan | Inmediato, con cobro prorrateado. |
| Bajar de plan | Al final del periodo. Si sobran negocios, no se borra ninguno: solo se bloquea crear más. |
| Prueba caducada | Puede pagar desde "Ver planes"; pasa a `active` sin perder nada. |
| legacy / comp | No ven checkout obligatorio y nunca los toca un webhook, salvo que paguen voluntariamente. |
| Facturas | Las emite Stripe con los datos fiscales de la vendedora; el cliente las descarga en el portal. |

**Seguridad.**
- Solo el webhook firmado cambia `status`.
- Cada evento se guarda una vez (tabla de eventos procesados) y los eventos atrasados se ignoran.
- El checkout solo se crea en el servidor con sesión verificada y no se fía del precio que mande el navegador.
- Todo en modo prueba hasta que la propietaria apruebe pasar a real.

## 4. Lo que necesita la propietaria

- Pedir en el chat del editor de Lovable que active los pagos (requiere el plan Pro de Lovable).
- Confirmar si los precios incluyen IVA.
- Datos fiscales de autónoma (nombre, NIF, dirección) para las facturas cuando se pase a real; en modo prueba no hacen falta.
- Aceptar las condiciones del proveedor y añadir páginas legales (condiciones, privacidad, desistimiento) antes de cobrar de verdad.

## 5. Orden

1. **(Sin la propietaria)** Límite de negocios en el servidor, límites por plan pagado y campos de suscripción solo para el servidor. Con pruebas: Solo no crea un 2.º negocio, Pro sí hasta 3, legacy y comp intactos.
2. La propietaria activa los pagos integrados (modo prueba).
3. Productos, checkout, webhook idempotente y portal; prueba con tarjetas de test (pago correcto, 3DS, impago, cancelación, cambio de plan).
4. Páginas legales y datos fiscales; pasar a real solo con autorización expresa.

## Detalles técnicos

- Política de alta en `clients` con una función SECURITY DEFINER que cuenta los negocios: `count(*) < límite` según `status`/`plan_name`, y para `legacy` usa su `business_limit` actual.
- Nueva tabla `subscriptions` (user_id, provider_customer_id, provider_subscription_id, price_id, status, current_period_end, cancel_at_period_end), con lectura propia y escritura solo para `service_role`.
- Tabla `billing_events (event_id PK, processed_at)` para la idempotencia.
- Ampliar `protect_plan_status` a `plan_name`/`business_limit` para cuentas no-admin.
- Añadir los estados `past_due` y `canceled` a `reserve_quota` (`past_due` permite uso durante la gracia).
- Cupo de imágenes/textos por `plan_name` cuando `status='active'`; `comp` ilimitado por estado y no por -1.
