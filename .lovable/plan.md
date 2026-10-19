# Auditoría técnica y plan de lanzamiento — Anypostly

Alcance: solo planificación. Sin ediciones, sin publicar, sin Stripe ni cobros.
Leyenda: **[C] Comprobado** en el código · **[H] Hipótesis** pendiente de verificar.

---

## P0 — Bloquean el lanzamiento (abuso directo de coste de IA)

### P0-1 [C] Las funciones de IA no verifican la identidad del usuario
- Evidencia: `extractUserId()` en las 7 funciones de generación (`generate-image`, `edit-image`, `generate-post`, `generate-hooks`, `generate-reel-ideas`, `generate-weekly-plan`, `generate-shooting-plan`) decodifica el token con `atob(token.split('.')[1])` sin comprobar firma ni caducidad.
- Impacto: un token falsificado con cualquier `sub` se acepta; se puede consumir la cuota de otra persona o inventar usuarios.
- Cambio: módulo compartido `_shared/auth.ts` que use `supabase.auth.getClaims(token)`; responder 401 si falla.
- Aceptación: llamada con token inventado → 401; token caducado → 401; token válido → 200.

### P0-2 [C] Sin token, el límite de imágenes se salta por completo
- Evidencia: `generate-image` y `edit-image`: `if (userId) { checkAndIncrementUsage... }`. Sin cabecera `Authorization`, `userId` es null y se genera la imagen igualmente. Las funciones de texto tampoco exigen sesión.
- Impacto: cualquiera con la URL pública de la función genera imágenes ilimitadas con la clave de IA del proyecto. Es el mayor riesgo de gasto.
- Cambio: exigir sesión válida antes de leer el cuerpo de la petición en todas las funciones de IA.
- Aceptación: `curl` sin cabecera a cada función → 401 y ninguna llamada nueva en los registros del AI Gateway.

### P0-3 [C] Cuota de imágenes no atómica y con fallos de cómputo
- Evidencia: se lee `usage_counters`, se compara y después se llama a `increment_usage` (dos pasos, carrera). El contador sube **antes** de generar: si la IA falla, el usuario pierde una imagen. `checkAndIncrementUsage` deja pasar todo si faltan las variables de entorno.
- Cambio: nueva función SQL `consume_image_quota(_user_id)` que hace `INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit RETURNING`, de forma atómica; más `refund_image_quota` si la generación falla. Si falta configuración, bloquear (fail-closed).
- Aceptación: 40 peticiones en paralelo con límite 30 → exactamente 30 éxitos y 10 respuestas 429; una generación fallida no cambia el contador.

### P0-4 [C] No hay techo de consumo para el texto ni límite global de gasto
- Evidencia: las funciones de texto solo registran uso (`trackUsage`, sin `await`, sin límite). No existe ningún tope diario ni global.
- Cambio: límite mensual generoso por plan para texto (p. ej. `text_*` ≤ 300/mes en Solo), límite diario por usuario para imágenes y un interruptor global (tabla `app_settings.ai_enabled` + tope diario de imágenes para todo el proyecto) consultado del lado servidor.
- Aceptación: superar el tope diario → 429 con un mensaje claro; poner `ai_enabled=false` → todas las funciones de IA devuelven 503.
- Nota: el backend no tiene una pieza estándar de limitación de peticiones; esto sería un contador propio en la base de datos.

---

## P1 — Corregir antes de abrir a usuarios de pago

### P1-1 [C] `cleanup-storage` puede borrar archivos de otros usuarios
- Evidencia: comprueba que hay sesión, pero borra cualquier URL que no esté referenciada sin comprobar quién la subió. Como el guardado es manual, las imágenes recién generadas de otros usuarios todavía no tienen referencias.
- Cambio: guardar las imágenes en `post-images/{user_id}/...` y permitir borrar solo rutas con el prefijo del usuario que llama.
- Aceptación: el usuario A no puede borrar un archivo del usuario B (respuesta `skipped`).

### P1-2 [C] Almacenamiento sin aislamiento por usuario y bucket público
- Evidencia: las rutas son `generated/{uuid}` y `edited/{uuid}`, sin carpeta por usuario. El bucket `post-images` es público.
- Cambio: rutas con prefijo de usuario. Mantener el bucket público (las URL se pueden adivinar poco por el UUID), pero documentarlo; valorar más adelante URL firmadas para Studio/agencias.
- Además: las imágenes generadas y no guardadas quedan huérfanas → tarea de limpieza periódica que borre archivos sin referencia de más de 7 días.

### P1-3 [C] `edit-image` acepta cualquier `imageUrl` y tamaño de prompt
- Cambio: aceptar solo URL del bucket propio o `data:image` de hasta unos 8 MB; limitar la longitud del prompt (unos 2.000 caracteres); validar `postType` con una lista cerrada. Aplicar la misma validación de entrada (por ejemplo con zod) en todas las funciones.

### P1-4 [C] El modelo de imagen y el orden de respaldo no coinciden con lo esperado
- Evidencia: `generate-image` prueba primero `gemini-2.5-flash-image`, después `3.1-flash` y por último `3-pro` (el más caro). `edit-image` usa `gemini-2.5-flash-image-preview` (nombre antiguo). Un fallo en cadena puede costar hasta 3 llamadas por imagen.
- Cambio: definir un modelo principal y como máximo un respaldo; registrar el modelo usado en `usage_counters` o en una tabla `ai_calls`.

### P1-5 [C] Planes de pago simulados
- Evidencia: `user_plans` solo lo cambian los administradores; `Plans.tsx` muestra contacto/upgrade sin cobro. Los nombres no coinciden: el código usa `basic`/`pro`/`studio` y la oferta comercial usa Solo.
- Cambio (sin Stripe todavía): unificar los nombres de plan, añadir `status` (trial/active/canceled) y `current_period_end`, y hacer que la cuota se calcule por periodo de facturación cuando se conecte el cobro.

### P1-6 [C] `get_image_limit(_user_id)` acepta cualquier id
- Cualquier usuario con sesión puede consultar el límite de otro (filtración menor del plan). Cambio: versión sin parámetro que use `auth.uid()` para el cliente.

---

## P2 — Calidad y crecimiento internacional

- P2-1 [H] Carruseles: la coherencia entre diapositivas depende de N llamadas independientes a `generate-image`, cada una consume cuota. Verificar con una prueba real cuántas imágenes descuenta un carrusel de 5 y si hay estilo consistente; valorar descontar en bloque y pasar la diapositiva 1 como referencia.
- P2-2 [H] Respuestas JSON de texto analizadas con una expresión regular `\{[\s\S]*\}`; los fallos de análisis devuelven 500 sin reintento. Pasar a salida estructurada (tool calling).
- P2-3 [C] CORS `*` en todas las funciones; restringir a los dominios propios cuando haya dominio de marca.
- P2-4 [H] Onboarding: verificar el flujo nuevo usuario → banner → primer negocio → primer contenido; medir el tiempo hasta el primer contenido. Falta la traducción completa al catalán en las pantallas nuevas de recuperación de contraseña.
- P2-5 Marca internacional: dominio propio fuera de la IP compartida (incidencia de bloqueo en España), páginas legales (términos, privacidad, RGPD, DPA para agencias), correos de autenticación con dominio propio.
- P2-6 Registros: el `console.log` de los prompts completos puede incluir datos de clientes; recortarlo.

---

## Datos que faltan para estimar el coste por generación

| Dato | Estado | Cómo obtenerlo |
|---|---|---|
| Precio por imagen de cada modelo en el Gateway | Desconocido (inferido) | Registros del AI Gateway: créditos por petición |
| Tokens de entrada/salida por función de texto | Desconocido | Registros del Gateway, 20 muestras por función |
| Tasa de respaldo (cuántas imágenes usan 2-3 modelos) | No se registra | Registrar el modelo usado por llamada (P1-4) |
| Regeneraciones por contenido guardado | Parcial | `usage_counters` frente a `generated_posts` |
| Tamaño medio de imagen y crecimiento del bucket | Desconocido | Metadatos de `storage.objects` |
| Coste fijo de la instancia de Cloud | Desconocido | Contexto de coste del proyecto |
| Imágenes huérfanas (generadas y no guardadas) | Desconocido | Comparar objetos con las URL referenciadas |

Fórmula objetivo: coste por usuario y mes = Σ(llamadas × créditos medios por modelo) + GB almacenados × tarifa + parte fija prorrateada.

---

## Plan incremental (cada paso se puede desplegar por separado)

1. **Bloqueo de abuso (P0-1, P0-2):** autenticación compartida en las 8 funciones. Prueba: curl sin token y con token falso.
2. **Cuota atómica y reembolso (P0-3).** Prueba de concurrencia.
3. **Topes de texto, tope diario e interruptor global (P0-4).**
4. **Almacenamiento por usuario y limpieza segura (P1-1, P1-2).** Migrar solo las rutas nuevas; las antiguas se mantienen.
5. **Validación de entradas y modelos (P1-3, P1-4) + tabla `ai_calls`** (función, modelo, éxito, créditos si se conocen).
6. **Modelo de planes preparado para cobro (P1-5, P1-6)**, todavía sin Stripe.
7. **P2** según prioridad comercial.

## Detalles técnicos
- `_shared/auth.ts`: `requireUser(req)` → `{ userId, supabaseUserClient }` o lanza una respuesta 401.
- `consume_image_quota` / `refund_image_quota`: SECURITY DEFINER, `search_path=public`, EXECUTE revocado a anon/authenticated (solo service role).
- `ai_calls(id, user_id, function, model, status, latency_ms, created_at)`: RLS solo para administradores; la escriben las funciones.
- Pruebas: tests de Deno por función (401 sin token, 429 al llegar al límite) y una prueba SQL de concurrencia.
