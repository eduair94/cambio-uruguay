# Aporte único sin anuncios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un aporte único (Mercado Pago UYU / PayPal USD) deja la cuenta sin anuncios 12 meses.

**Architecture:** Checkout alojado por el proveedor; el servidor crea la orden y reconcilia el pago
contra la API del proveedor (al volver y por webhook firmado). `User.adFreeUntil` se recalcula
entero desde los pagos aprobados. En el cliente, un estado `unknown|ads|free` decide si el loader de
AdSense entra, con una marca en `localStorage` para no demorar a nadie.

**Tech Stack:** Nuxt 4 / Nitro (h3), mongoose, Vuetify 4, vitest. Sin SDK de pagos: `$fetch` a las
APIs REST.

**Spec:** `docs/superpowers/specs/2026-11-23-sin-publicidad-design.md`

## Global Constraints

- Todo en `app/` (no toca el backend raíz). APP DB por `connectDb()`.
- Montos: UYU sugeridos 200/400/800, mín 150, máx 20000, enteros; USD 5/10/20, mín 4, máx 500, 2
  decimales. 12 meses por aporte.
- Env (horneadas): `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`,
  `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV` (`live` default | `sandbox`).
- Página `/cuenta/sin-publicidad`, `noindex, nofollow`. Copy en español rioplatense.
- Sin SDK JS de terceros; sin ocultar anuncios con CSS; sin cifras de ingreso en el repo.
- Componentes Vuetify usados tienen que estar registrados en `plugins/vuetify.ts`.

## Review Focus

- Webhook repetido / desordenado (aprobado llega después de reembolsado): el estado final lo da la
  re-lectura del proveedor, no el orden de llegada → test de `applyProviderPayment` idempotente.
- Pago con monto o moneda distintos a la orden (alguien edita la preferencia): no otorga → test.
- Invitado anónimo de Firebase intenta pagar: 403 antes de crear nada → test del validador.
- Usuario que cierra sesión con marca de donante: los anuncios vuelven → test de `decideViewer`.
- Firma MP con `data.id` alfanumérico en mayúsculas (se pasa a minúsculas) → test de firma.

---

### Task 1: Núcleo puro (`utils/adFree.ts`)

**Files:** Create `app/utils/adFree.ts`, `app/tests/unit/adFree.test.ts`

**Interfaces — Produces:**
- `type AdFreeProvider = 'mercadopago' | 'paypal'`; `type AdFreeCurrency = 'UYU' | 'USD'`
- `AD_FREE_MONTHS = 12`; `AD_FREE_AMOUNTS: Record<AdFreeProvider, { currency, suggested: number[], min, max, decimals }>`
- `validateAmount(provider, raw: unknown): { ok: true, amount: number } | { ok: false, error: string }`
- `addMonths(d: Date, n: number): Date` (fin de mes: 31/1 + 1 → 28/29 feb)
- `computeAdFreeUntil(approved: { approvedAt: Date }[]): Date | null`
- `isAdFreeActive(until: Date | string | null, now?: Date): boolean`
- `type ViewerStatus = 'unknown' | 'ads' | 'free'`; `AD_FREE_HINT_KEY = 'cu_adfree_v1'`;
  `interface AdFreeHint { uid: string; until: string | null; checkedAt: string }`;
  `parseHint(raw: string | null): AdFreeHint | null`;
  `decideFromHint(hint, now): { status: ViewerStatus | 'wait'; revalidate: boolean }` —
  donante vigente → `free`+revalidate; no-donante revisado < 12 h → `ads`+revalidate; resto → `wait`.
- `formatAmount(amount, currency): string` (`$ 400` / `US$ 10`).

- [ ] Tests: `computeAdFreeUntil` encadena (dos aportes el mismo día → +24 meses; el segundo después
  del vencimiento → arranca en su fecha); vacío → null; `validateAmount('mercadopago', 149)` error,
  `150` ok, `'400'` ok, `400.5` error, `20001` error; `validateAmount('paypal', 4.5)` ok, `4.555`
  error; `decideFromHint` con until futuro → free; con until pasado y checkedAt hace 1 h → ads;
  checkedAt hace 13 h → wait; null → wait.
- [ ] Run `npx vitest run tests/unit/adFree.test.ts` → FAIL; implementar; → PASS. Commit.

### Task 2: Modelos + reconciliación de pagos (servidor)

**Files:** Create `app/server/models/AdFreeOrder.ts`, `app/server/models/AdFreeDonation.ts`,
`app/server/utils/adFreeStore.ts`, `app/server/utils/mercadoPago.ts`, `app/server/utils/paypal.ts`,
`app/tests/unit/adFreePayments.test.ts`; Modify `app/server/models/User.ts` (`adFreeUntil: Date|null`),
`app/nuxt.config.ts` (runtimeConfig `adFree` privado + `public.adFree.{mercadopago,paypal}` booleanos).

**Interfaces — Produces:**
- `adFreeStore.ts`: `interface ProviderPayment { id: string /* mp:123 | pp:CAP */; orderId: string; provider; amount: number; currency; status: DonationStatus; statusDetail: string | null; approvedAt: Date | null }`;
  `checkAgainstOrder(order, p): boolean` (moneda igual, |monto−orden| < 0,005, orderId igual);
  `applyProviderPayment(p): Promise<{ newlyApproved: boolean; uid: string | null }>` — busca orden,
  valida, upsert donación (`approvedAt` se fija una vez), recalcula `User.adFreeUntil`, y si
  `newlyApproved` notifica (Telegram admin + correo) en `try` aislado;
  `recomputeUser(uid): Promise<Date | null>`; `adFreeSummary(uid)` → `{ active, until, donations[] }`.
- `mercadoPago.ts`: `mpConfigured()`, `createMpPreference(order, { email, siteUrl }): Promise<{ id, url }>`
  (`X-Idempotency-Key` = orderId, `external_reference` = orderId, `notification_url`
  `${siteUrl}/api/payments/mercadopago/webhook`, `back_urls` → `${siteUrl}/cuenta/sin-publicidad?orden=<id>`,
  `auto_return: 'approved'`, `statement_descriptor: 'CAMBIOURUGUAY'`, `installments: 1`);
  `getMpPayment(id)`, `searchMpPayments(orderId)`; `mapMpPayment(raw): ProviderPayment` (status:
  approved; pending|in_process|authorized → pending; in_mediation → approved; rejected; cancelled;
  refunded; charged_back); `verifyMpSignature({ xSignature, xRequestId, dataId, secret }): boolean`.
- `paypal.ts`: `ppConfigured()`, `ppAccessToken()` (cacheado hasta `expires_in − 60 s`),
  `createPpOrder(order, { siteUrl }): Promise<{ id, url }>` (`PayPal-Request-Id` = orderId,
  `custom_id`/`reference_id` = orderId, `NO_SHIPPING`, `PAY_NOW`, return/cancel a la página);
  `reconcilePpOrder(paypalOrderId): Promise<ProviderPayment[]>` (GET; `APPROVED` → capture con
  `PayPal-Request-Id: cap-<id>`; captures → pagos); `getPpCapture(id)`; `mapPpCapture(raw, orderId)`
  (COMPLETED → approved, PENDING → pending, DECLINED|FAILED → rejected, REFUNDED → refunded,
  PARTIALLY_REFUNDED → approved, REVERSED → charged_back); `verifyPpWebhook(headers, body): Promise<boolean>`.

- [ ] Tests (puros, sin red): `verifyMpSignature` con vector calculado en el test (HMAC de
  `id:abc123;request-id:req-1;ts:1700000000;`), mayúsculas en `dataId` → normaliza, firma mala →
  false, falta `v1` → false; `mapMpPayment` para cada estado; `mapPpCapture` para cada estado;
  `checkAgainstOrder` rechaza moneda distinta, monto distinto, orderId distinto.
- [ ] FAIL → implementar → PASS. Commit.

### Task 3: Endpoints

**Files:** Create `app/server/api/me/ad-free/index.get.ts`, `checkout.post.ts`, `confirm.post.ts`,
`app/server/api/payments/mercadopago/webhook.post.ts`, `app/server/api/payments/paypal/webhook.post.ts`,
`app/server/utils/adFreeCheckout.ts`, `app/tests/unit/adFreeCheckout.test.ts`.

**Interfaces — Consumes:** Task 1, Task 2. **Produces:** `checkoutRequestError(user, body, configured): { status, message } | null`
(anónimo → 403, proveedor desconocido → 400, no configurado → 503, monto → 400).

- [ ] Tests de `checkoutRequestError`: anónimo 403, `provider: 'stripe'` 400, mp no configurado 503,
  monto 100 → 400, válido → null.
- [ ] Endpoints: checkout cuenta órdenes de la última hora (>10 → 429), crea orden, llama al
  proveedor, guarda `providerRef`, devuelve `{ url }`. Confirm exige que la orden sea del uid y
  reconcilia (MP: `searchMpPayments`; PayPal: `reconcilePpOrder(providerRef)`), devuelve
  `{ status, summary }` con el mejor estado (approved > pending > resto). Webhook MP: firma si hay
  `x-signature` y secreto (mala → 401), `type|topic` payment → `getMpPayment` → apply; siempre 200 en
  lo demás. Webhook PayPal: `verifyPpWebhook` (falla → 401); ORDER.APPROVED → `reconcilePpOrder`;
  PAYMENT.CAPTURE.* → id de captura (resource.id, o el link `up` de un refund) → `getPpCapture` → apply.
- [ ] PASS. Commit.

### Task 4: Quién ve anuncios (cliente)

**Files:** Create `app/composables/useAdFree.ts`, `app/plugins/ad-free.client.ts`; Modify
`app/app.vue` (loader exige `viewer === 'ads'`), `app/composables/useAds.ts` (`canRender` falso con
`free`), `app/composables/useSponsorships.ts` (idem); Test `app/tests/unit/adFreeViewer.test.ts`.

**Interfaces — Produces:** `useAdFreeViewer(): Ref<ViewerStatus>` (`useState('cu_adfree_viewer', () => 'unknown')`);
`writeHint(h: AdFreeHint | null)`, `readHint()`; `refreshAdFree(): Promise<AdFreeSummary | null>`
(token → GET `/api/me/ad-free` → marca → estado).

- [ ] Test: `adsenseLoaderScripts` no cambia; `useAds().canRender` con viewer `free` → false y con
  `unknown` → igual que antes (montar con estado inyectado como en los tests de `useAds`
  existentes).
- [ ] Plugin: en `onNuxtReady`, `decideFromHint`; `wait` → `hasStoredFirebaseSession()` → sin sesión
  `ads`, con sesión `refreshAdFree()` con tope 4 s. Watch del uid del store: logout → borrar marca +
  `ads`; login nuevo → refresh, y si queda `free` con `script[src*="adsbygoogle"]` en el DOM →
  `location.reload()`.
- [ ] PASS. Commit.

### Task 5: Página, entradas y textos legales

**Files:** Create `app/pages/cuenta/sin-publicidad.vue`, `app/components/account/AdFreePanel.vue`;
Modify `app/components/DonationCard.vue` (botón «Quitar anuncios»), `app/components/AccountMenu.vue`
(«Sin anuncios»), `app/pages/terminos.vue` (sección «Aporte para navegar sin anuncios»),
`app/pages/privacidad.vue` (datos del aporte, MP/PayPal como encargados), `app/plugins/vuetify.ts` si
falta algún componente.

- [ ] Página según el spec (oferta, selector, montos, estado, vuelta con `?orden=`, preguntas).
  `useTrack('ad_free_checkout_start' | 'ad_free_donation')`.
- [ ] `npm run lint`, suite completa `npx vitest run` → verde. Commit.

### Task 6: Verificación y publicación

- [ ] `npx nuxi build` en el worktree (o dev) y ver la página sin sesión; `curl` al webhook MP sin
  firma con id falso → 200 sin efectos.
- [ ] PR, automerge, deploy; medir `/cuenta/sin-publicidad` en producción.
