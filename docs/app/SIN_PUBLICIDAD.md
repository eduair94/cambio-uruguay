# Aporte para navegar sin anuncios (`/cuenta/sin-publicidad`)

Un aporte único deja la cuenta sin anuncios 12 meses (decisión del 23/11/2026). No es suscripción.
Diseño: `docs/superpowers/specs/2026-11-23-sin-publicidad-design.md`.

## Cómo funciona

1. La persona, con sesión (no invitado), elige monto y medio en `/cuenta/sin-publicidad`.
2. `POST /api/me/ad-free/checkout` crea una orden en `adfreeorders` (APP DB) y le pide al proveedor
   una página de pago alojada: preferencia de Checkout Pro (Mercado Pago, UYU) u orden de la Orders
   API v2 (PayPal, USD). El navegador va a esa página. Sin SDK de terceros en el sitio.
3. Al volver (`?orden=<id>`), la página llama `POST /api/me/ad-free/confirm`, que le PREGUNTA al
   proveedor (MP: `/v1/payments/search?external_reference=<orden>`; PayPal: la orden guardada, y la
   captura si quedó aprobada). Nunca se cree en la URL de vuelta.
4. Los webhooks cubren lo que la vuelta no ve: efectivo (Abitab/RedPagos) que se acredita después,
   la pestaña cerrada antes de volver, reembolsos y contracargos.
5. Cada pago leído se valida contra su orden (moneda, monto, referencia) y se guarda en
   `adfreedonations` (`mp:<id>` / `pp:<captura>`). `User.adFreeUntil` se recalcula entero desde los
   aprobados: cada uno suma 12 meses desde que se aprobó o desde que termina el anterior.
6. En el navegador, `plugins/ad-free.client.ts` decide si el loader de AdSense entra
   (`utils/adFree.ts` → `decideFromHint`). Sin sesión de Firebase guardada: entra apenas hidrata,
   como siempre. Donante con marca `cu_adfree_v1` vigente: no entra.

## Configuración (en `app/.env` del VPS, se hornea en el build)

Sin estas variables el medio de pago no aparece en la página y su endpoint contesta 503.

### Antes que nada: Cloudflare

`/api/payments/*` recibe POST de los servidores de Mercado Pago y de PayPal. Si una regla WAF, el
modo de pelea contra bots o un desafío los alcanza, los avisos no llegan (la vuelta del checkout y
la revisión de respaldo de `GET /api/me/ad-free` siguen confirmando, pero tarde). Agregar una regla
`skip` para `starts_with(http.request.uri.path, "/api/payments/")`.

### Mercado Pago

1. <https://www.mercadopago.com.uy/developers/panel/app> → crear aplicación («Pagos online»,
   Checkout Pro).
2. **Credenciales de producción** → `Access Token` → `MERCADOPAGO_ACCESS_TOKEN`.
3. **Webhooks** → URL de producción `https://cambio-uruguay.com/api/payments/mercadopago/webhook`,
   evento **Pagos**. Copiar la **clave secreta** → `MERCADOPAGO_WEBHOOK_SECRET` (con ella se
   verifica `x-signature`; sin ella el aviso igual se re-lee de la API, que es lo que lo hace seguro).
4. La preferencia ya manda su propio `notification_url` con `?source_news=webhooks` (sólo el
   formato webhook; el IPN trae una firma que no se valida con el secreto), así que el paso 3 es la
   firma, no la ruta. Un aviso con firma inválida se registra pero NO se rechaza: rechazarlo hace
   que Mercado Pago reintente durante días, y el pago se relee igual de la API.
5. Probar con credenciales de prueba antes de cargar el secreto de producción.

### Respaldo si un aviso no llega

`GET /api/me/ad-free` (lo pide el sitio en cada carga con sesión) vuelve a preguntar al proveedor
por las órdenes de la cuenta de los últimos 3 días sin pago asentado, como mucho cada 2 minutos por
orden y con 2 s de tope. Un pago en efectivo acreditado días después se ve en la próxima visita
aunque el webhook nunca haya llegado.

### PayPal

1. <https://developer.paypal.com/dashboard/applications/live> → crear app → `Client ID` y `Secret`
   → `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`.
2. En la app → **Webhooks** → `https://cambio-uruguay.com/api/payments/paypal/webhook`, eventos
   `Checkout order approved`, `Payment capture completed`, `Payment capture pending`,
   `Payment capture denied`, `Payment capture refunded`, `Payment capture reversed`. Copiar el
   **Webhook ID** → `PAYPAL_WEBHOOK_ID`.
3. `PAYPAL_ENV=sandbox` para probar con las credenciales de sandbox (por defecto `live`).

Después: `app/scripts/deploy.sh` (o cualquier push que toque `app/`) para que el build hornee las
variables. Verificar en `/cuenta/sin-publicidad` que aparezcan los medios.

## Cuentas del sitio sin anuncios

Las cuentas de `NUXT_ADMIN_EMAILS` y de `NUXT_AD_FREE_EMAILS` (lista aparte, para dueños que no
tienen que ver los tableros privados) navegan sin anuncios sin pagar, siempre que el correo esté
verificado: un alta con contraseña puede escribir cualquier dirección hasta abrir el enlace de
verificación. No se guarda nada en la base: `GET /api/me/ad-free` lo decide en cada pedido
(`server/utils/adFreeOwners.ts`), así que sacar la dirección de la lista lo termina. Se hornea en el
build como el resto del `runtimeConfig`.

## Devoluciones

Se ofrece la devolución completa dentro de 5 días hábiles (Ley 17.250, art. 16). Se hace desde el
panel del proveedor; el webhook (`refunded` / `PAYMENT.CAPTURE.REFUNDED`) termina el período solo.
Un contracargo (`charged_back` / `REVERSED`) también. El admin recibe aviso por Telegram de cada
aporte nuevo y de cada devolución.

## Montos

`app/utils/adFree.ts` → `AD_FREE_AMOUNTS` (sugeridos, mínimo, máximo). Cambiarlos es un commit.

## Qué no hace

- No oculta anuncios ya cargados (política de AdSense): un donante que inicia sesión a mitad de la
  visita, con el loader ya corriendo, recibe una recarga.
- No emite factura: eso lo resuelve el dueño fuera del sitio.
