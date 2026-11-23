# Aporte único para navegar sin anuncios — diseño

Fecha: 2026-11-23. Pedido del dueño: «un botón de donación único para remover la publicidad (requiere
iniciar sesión), según los mejores estándares de la industria al día de hoy».

## Intención

Quien usa el sitio seguido y no quiere anuncios puede hacer un aporte único y, a cambio, su cuenta
queda sin anuncios. El aporte financia el sitio; el beneficio tiene que funcionar en todos los
dispositivos donde la persona inicie sesión, por eso exige cuenta.

Decisiones del dueño (23/11/2026):

- **Un aporte = 12 meses sin anuncios.** No es suscripción: nada se renueva solo. Aportes sucesivos
  se encadenan (el segundo suma 12 meses desde que termina el primero).
- **Monto sugerido + monto libre con mínimo** (patrón Ko-fi / Buy Me a Coffee).
- **Mercado Pago (UYU) y PayPal (USD).**

## Objetivos / no objetivos / anti-objetivos

- Objetivo: el donante deja de ver anuncios (AdSense: automáticos y manuales) y la fila patrocinada,
  en todo dispositivo con su sesión, sin que el resto de los visitantes pague ni un milisegundo.
- Objetivo: el beneficio se otorga sólo con la palabra del proveedor de pago, nunca con la del
  navegador; un reembolso o contracargo lo revoca.
- No objetivo: suscripciones, planes, facturación electrónica (la decide el dueño fuera del código),
  muro de pago o contenido exclusivo. El sitio sigue gratis entero.
- Anti-objetivo: cargar el SDK de JavaScript de Mercado Pago o de PayPal en el sitio (peso, terceros,
  Clarity); demorar el loader de AdSense para quien no donó; ocultar anuncios ya cargados con CSS
  (política de AdSense); guardar datos de tarjeta; un cambio de forma en el HTML que el borde cachea.

## Enfoques considerados

1. **Checkout alojado por el proveedor con confirmación del servidor (elegido).** El servidor crea
   la orden (Checkout Pro de Mercado Pago: `POST /checkout/preferences`; PayPal Orders API v2:
   `POST /v2/checkout/orders`), el navegador va a la página del proveedor y vuelve. El servidor
   consulta el estado al proveedor al volver y por webhook firmado. Sin JS de terceros, PCI SAQ-A,
   cubre efectivo (Abitab/RedPagos quedan pendientes y se acreditan por webhook).
2. Botones/SDK embebidos (MP Bricks, PayPal JS SDK). Mejor conversión marginal, pero cargan
   ~100–300 KB de terceros y otro dominio en la página; descartado por el anti-objetivo.
3. Enlaces fijos actuales (`mpago.la`, Ko-fi) + webhook por correo. No atan el pago a una cuenta
   (Ko-fi sólo da el correo del pagador) y no hay reembolso automatizable; descartado.
   Stripe no opera con comercios uruguayos.

## Diseño

### Datos (APP DB, `MONGO_URI` del app)

- `adfreeorders` — la intención de pago: `_id` (24 hex aleatorios), `uid`, `provider`
  (`mercadopago`|`paypal`), `amount`, `currency` (`UYU`|`USD`), `providerRef` (id de preferencia MP
  u orden PayPal), `createdAt`. Un documento por clic en «Aportar».
- `adfreedonations` — un documento por PAGO real: `_id` = `mp:<paymentId>` | `pp:<captureId>`,
  `orderId`, `uid`, `provider`, `amount`, `currency`, `status`
  (`pending`|`approved`|`rejected`|`cancelled`|`refunded`|`charged_back`), `statusDetail`,
  `approvedAt`, `createdAt`, `updatedAt`. Clave por pago y no por orden: si alguien paga dos veces la
  misma preferencia, son dos aportes.
- `User.adFreeUntil: Date | null` — derivado, se recalcula entero desde las donaciones aprobadas
  (`computeAdFreeUntil`, puro): ordenadas por `approvedAt`, cada una arranca en
  `max(approvedAt, fin de la anterior)` y suma 12 meses. Recalcular entero hace idempotentes los
  webhooks repetidos y deja que un reembolso «saque» un tramo del medio.

### Montos (`app/utils/adFree.ts`, editables por el dueño)

- UYU: sugeridos 200 / 400 / 800, mínimo 150, máximo 20.000, enteros.
- USD: sugeridos 5 / 10 / 20, mínimo 4, máximo 500, dos decimales.
- 12 meses por aporte. Validación en servidor (el cliente sólo ayuda).

### Servidor

- `GET /api/me/ad-free` (requireUser) → `{ active, until, donations[] }` (sin ids de proveedor).
- `POST /api/me/ad-free/checkout` `{ provider, amount }` → `{ url }`. Rechaza invitado anónimo (403),
  proveedor sin credenciales (503), monto fuera de rango (400), más de 10 órdenes por hora por cuenta
  (429). Crea la orden, llama al proveedor con clave de idempotencia = id de orden y devuelve la URL de
  pago (`init_point` / enlace `payer-action`).
- `POST /api/me/ad-free/confirm` `{ orderId }` → reconcilia esa orden contra el proveedor y devuelve
  el estado. Nunca lee el estado de la query de vuelta: MP se busca por `external_reference`
  (`/v1/payments/search`), PayPal por el id de orden guardado (y se CAPTURA si está `APPROVED`).
- `POST /api/payments/mercadopago/webhook` — valida `x-signature` (HMAC-SHA256 del manifiesto
  `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` con el secreto del panel) cuando llega firmado;
  el aviso es sólo una pista: se re-lee `GET /v1/payments/<id>` con el token propio. Acepta también el
  formato IPN (`?topic=payment&id=`), que viaja sin firma: re-leer del proveedor es igual de seguro.
- `POST /api/payments/paypal/webhook` — verifica con `POST /v1/notifications/verify-webhook-signature`
  (`PAYPAL_WEBHOOK_ID`). `CHECKOUT.ORDER.APPROVED` → captura (quien cerró la pestaña antes de volver);
  `PAYMENT.CAPTURE.*` → re-lee la captura y aplica su estado (`REFUNDED` → revoca,
  `REVERSED` → contracargo).
- Cada pago leído se valida contra la orden: misma moneda, mismo monto, `external_reference` /
  `custom_id` = id de orden. Lo que no coincide se registra y no otorga nada.
- Al pasar un pago a aprobado por primera vez: aviso por Telegram al admin y correo de confirmación
  al donante (SMTP del sitio); ninguno de los dos bloquea ni rompe la confirmación.
- Variables (horneadas en el build, como todo el `runtimeConfig`): `MERCADOPAGO_ACCESS_TOKEN`,
  `MERCADOPAGO_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`,
  `PAYPAL_ENV` (`live` por defecto, `sandbox` para probar). Sin credenciales el proveedor no aparece
  (`runtimeConfig.public.adFree.{mercadopago,paypal}`) y su endpoint contesta 503: inerte hasta
  configurarlo.

### Cliente: quién ve anuncios

Estado `useState('cu_adfree_viewer')`: `unknown` (SSR e hidratación) → `ads` | `free`.

- `plugins/ad-free.client.ts`, en `onNuxtReady`, con una marca local `cu_adfree_v1`
  `{ uid, until, checkedAt }` en `localStorage`:
  1. Marca con `until` futuro → `free` ya (retiene el loader) y verifica en segundo plano.
  2. Marca de no-donante revisada hace < 12 h → `ads` ya; revalida en segundo plano si hay sesión.
  3. Sin marca: sin sesión de Firebase guardada → `ads` ya (el 99 % de las visitas, cero demora).
     Con sesión → espera la verificación (tope 4 s; vencido → `ads`).
  - Verificar = esperar la sesión, `GET /api/me/ad-free`, reescribir la marca. Uid distinto o sin
    sesión → borrar marca, `ads`. Error de red con marca de donante vigente → se queda en `free`.
  - Login durante la visita que resulta donante, con el loader ya inyectado → una recarga (no se
    pueden sacar anuncios ya colocados sin violar la política). Logout → borra marca, `ads`.
- `app.vue`: el loader de AdSense exige además `viewer === 'ads'`.
- `useAds().canRender` y `useSponsorships().canRender`: falsos con `viewer === 'free'` (no con
  `unknown`, para no correr el layout de todos los demás).

### Página `/cuenta/sin-publicidad`

Hereda las reglas de `/cuenta` (prefijo): sin anuncios, sin caché de borde, fuera del sitemap y del
menú, sin Clarity. `noindex`. No usa el middleware `auth`: la oferta se ve sin sesión y el botón
pide iniciar sesión, explicando por qué (el beneficio queda en la cuenta).

- Oferta: qué incluye (sin anuncios en todo el sitio, todos los dispositivos con sesión), qué no
  cambia (todo lo demás sigue gratis), 12 meses, no se renueva solo.
- Selector de moneda/proveedor (UYU · Mercado Pago / USD · PayPal; sólo los configurados), chips con
  los montos sugeridos + «Otro monto» con mínimo, botón «Aportar $ 400 con Mercado Pago».
- Estado de la cuenta: «Tu cuenta no tiene anuncios hasta el …» + historial de aportes.
- Vuelta del proveedor (`?orden=<id>`): «Confirmando tu pago…», reconcilia y reintenta unos
  segundos; aprobado → gracias + fecha; pendiente → explica que se acredita solo (efectivo);
  rechazado/cancelado → reintentar.
- Preguntas: ¿es suscripción?, ¿qué pasa a los 12 meses?, ¿y si veo anuncios igual?, reembolso
  (dentro de 5 días hábiles, art. 16 de la Ley 17.250, escribiendo a contacto), qué datos se guardan.

Entradas: botón «Quitar anuncios» en `DonationCard` (portada, avanzado), «Sin anuncios» en el menú
de la cuenta. Secciones nuevas en `/terminos` y `/privacidad`.

Analítica: `ad_free_checkout_start` (`provider`, `currency`, `value`) y `ad_free_donation`
(al confirmar aprobado) por `useTrack`.

## Lo que queda al constructor

Textos finales, estilos, nombres de componentes, la forma exacta de los tests. El reintento de la
página de vuelta (cantidad/espera). El formato del correo.
