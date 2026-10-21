# Auditoría comercial y propuesta de prueba gratuita limitada — Anypostly

Alcance: solo análisis y plan. Sin código, sin Stripe, sin publicar.
Leyenda: **[C] Comprobado** en la base de datos o en el registro de consumo · **[E] Estimación** · **[H] Hipótesis**.

---

## 1. Situación actual

| Tema | Hallazgo | Estado |
|---|---|---|
| Cuentas | 5 cuentas con plan. 4 en `basic` (1 negocio) y la propietaria en `admin` con `business_limit = -1` | [C] |
| Alta nueva | Cada registro recibe automáticamente `basic` (1 negocio, 30 imágenes y 200 textos al mes), **sin pago ni fecha de fin** | [C] |
| Significado de "basic" | El mismo nombre sirve para "Solo 29 €" y para "registrado gratis": no se distingue quién paga | [C] |
| Ilimitado | `business_limit = -1` da 9999 imágenes y textos. Lo tiene la cuenta de la propietaria (plan `admin`) | [C] |
| Cambio de plan | Solo un administrador puede modificar `user_plans`; un usuario solo puede leer su plan. No hay vía de autoascenso desde la app | [C] |
| Botones "Mejorar plan" | Solo muestran un aviso "próximamente"; no cobran ni cambian nada | [C] |
| Cupo en servidor | Las 7 funciones de IA verifican la sesión y reservan cupo de forma atómica; si falla, devuelven el cupo | [C] |
| Imagen editada vs generada | Comparten el mismo cupo (`images`), 1 unidad por imagen. En carrusel, 1 por foto/diapositiva | [C] |
| Roles | Hay 2 administradores (`user_roles`): la propietaria y una cuenta `basic` | [C] |

## 2. Consumo medido (22 sep – 21 oct 2026, créditos solicitados)

| Concepto | Créditos | Nota |
|---|---|---|
| Imágenes IA (gemini-2.5-flash-image) | ~4,38 | [C] |
| Textos IA (gemini-3-flash) | ~0,60 | [C] |
| Base de datos (11,1 h de instancia) | 0,86 | [C] — encendida pocas horas; si estuviera 24/7 serían ~55,7 créditos/mes [C tarifa] |
| Almacenamiento + tráfico + funciones | ~0,12 | [C] |
| Construcción de la app (no es coste de cliente) | 70,6 | [C] |

- **Por unidad [E]:** con unas 26 imágenes y unos 95 textos contados en ese periodo, sale del orden de **0,17 créditos por imagen** y **0,006 por texto**. Es aproximado: el registro no da cantidades exactas por petición.
- **Generada vs editada:** el registro solo muestra un modelo de imagen y no las separa. No hay evidencia de diferencia de coste [H: similar, porque usan el mismo modelo].
- **Euros:** no doy precio en euros por unidad; depende de cuánto cuesta cada crédito en vuestro plan, que no consta aquí.
- **Conclusión [E]:** la imagen es ~30 veces más cara que el texto. El riesgo de un trial está en las imágenes, no en el texto.

## 3. Vías de abuso de una prueba gratuita

| Vía | Riesgo hoy | Medida |
|---|---|---|
| Registrarse con muchos correos y gastar 30 imágenes cada uno | **Alto**: 30 imágenes gratis para siempre por cuenta | Trial con cupo pequeño y caducidad |
| Correos desechables | Medio | Confirmación de correo obligatoria (ya activa) + lista de dominios desechables [H] |
| Trial que nunca caduca | Alto (no hay fecha) | `trial_ends_at` comprobado en el servidor |
| Cuenta que se vuelve ilimitada | Bajo (solo admin) | Separar "admin" de "ilimitado"; registro de cambios de plan |
| Cambiar de plan desde el navegador | Bajo (bloqueado por permisos) | Mantener; cobro futuro solo desde el servidor |
| Gasto global inesperado | Medio | Tope diario global de imágenes para trials |

## 4. Propuesta de trial limitado (sin tarjeta)

| Decisión | Propuesta | Por qué |
|---|---|---|
| Duración | 7 días desde el alta | Suficiente para ver un calendario semanal |
| Imágenes IA | **5 en total** (no por mes) | Es lo caro; deja probar "Mejorar con IA" y "Generar" |
| Textos IA | **40 en total** | Barato; permite manual editorial + una semana de contenido |
| Negocios | 1 | Igual que Solo |
| Al caducar | Se puede entrar, ver y copiar todo lo guardado; las funciones de IA responden "prueba terminada" | No se pierde nada, no hay coste |
| Tope global | Máx. N imágenes al día entre todos los trials (p. ej. 100) | Protege ante registros masivos |
| Tarjeta | No | Menos fricción; el cupo pequeño limita el riesgo |

**Coste máximo por trial [E]:** 5 × 0,17 + 40 × 0,006 ≈ **1,1 créditos**.

## 5. Distinguir trial de pago de forma segura

- Nuevo campo `status` en `user_plans`: `trial` / `active` / `expired` / `comp` (cortesía), más `trial_ends_at` y `current_period_end`.
- Alta nueva → `trial` (en vez de `basic` sin fecha).
- Solo `active` se considera de pago. En el futuro solo lo activará el servidor tras confirmar el cobro; nunca el navegador.
- `reserve_quota` decide en el servidor: si es trial, cupo total y fecha; si `expired`, rechaza; si `active`, cupo mensual del plan.
- Nombres alineados con la oferta: `solo` / `pro` / `studio` (hoy `basic` = Solo).
- "Ilimitado" deja de depender de `business_limit = -1`; se usa un estado explícito `comp` solo para administradores.
- Tabla de registro de cambios de plan (quién, cuándo, de qué a qué), visible solo para administradores.

## 6. Las 5 cuentas actuales

| Cuenta | Hoy | Propuesta |
|---|---|---|
| Propietaria (admin, ilimitada) | `admin`, -1 | `comp` ilimitada; sigue siendo administradora |
| Admin con `basic` | basic | Confirmar si es tuya: pasar a `comp` o dejar en Solo |
| 3 cuentas `basic` | basic | Pasar a `active` Solo como beta (sin caducidad) o a trial: **decisión tuya** |

Nadie pierde negocios, contenidos ni imágenes; solo cambia el cupo.

## 7. Qué corregir antes de vender

1. Trial con caducidad y cupo total (hoy cada registro tiene 30 imágenes/mes gratis para siempre).
2. Separar pago, cortesía y prueba con `status`.
3. Mensaje claro en pantalla al llegar al límite o caducar (hoy puede salir un error genérico [H]).
4. Tope global diario para trials.
5. Página de planes con los cupos reales de cada plan.
6. Páginas legales y condiciones de la prueba (pendiente de auditoría anterior).
7. Después: conectar el cobro, que solo cambie `status` desde el servidor.

## 8. Orden de implementación

1. Migración: `status`, `trial_ends_at`, `current_period_end`, registro de cambios; cuentas actuales sin pérdida de acceso.
2. Alta nueva → trial 7 días; `reserve_quota` con cupo total de trial y caducidad.
3. Tope global diario de imágenes de trials.
4. Avisos en pantalla: días restantes, cupo usado, "prueba terminada" (ES/EN).
5. Página de planes y aviso de mejora coherentes.
6. Pruebas: trial caducado → rechazo sin llamar a la IA; 6.ª imagen → rechazo; admin sigue ilimitado.
7. Más adelante: Stripe.

## Decisiones que necesito de ti

- ¿7 días, 5 imágenes y 40 textos te parecen bien?
- ¿Las 3 cuentas beta pasan a Solo de cortesía o a trial?
- ¿La segunda cuenta administradora es tuya?

## Detalles técnicos

- `reserve_quota` lee `status` y `trial_ends_at`; para trial usa un contador con `month = 'trial'` para el total.
- Funciones de límite reescritas por `status`, no por `business_limit = -1`.
- `handle_new_user_plan` inserta `status='trial', trial_ends_at = now() + interval '7 days'`.
- Todo sigue siendo SECURITY DEFINER y solo para el servidor.
