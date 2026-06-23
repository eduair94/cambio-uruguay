# Design: Import cart, dark/light theme, a11y & engagement

Date: 2026-06-21
Status: Approved (user: "Approve, implement")

## Goal

Four related improvements to cambio-uruguay (Nuxt 4 + Vuetify 3):

1. Lighthouse analysis of the home page (`/`) with tooling added.
2. Dark/light theme switcher + accessibility pass.
3. Tasteful, CSS-only engagement animations.
4. A product **import cart**: add products from Amazon/eBay (URL paste, best-effort
   scrape) or manually, then compute landed cost (taxes + shipping, USD & UYU)
   reusing the existing import-tax engine.

## Decisions (from brainstorming)

- **Import source:** URL paste → server best-effort OpenGraph/JSON-LD scrape, with
  manual entry fallback. No third-party API keys.
- **Cart storage:** synced to the Firebase account (mirrors saved-items / favorites);
  anonymous users get localStorage, merged into the account on login.
- **Theme default:** follow `prefers-color-scheme`, defaulting to dark when unknown.
  Choice persists in localStorage.
- **Animation:** CSS-only, `prefers-reduced-motion`-aware, ~0 JS weight (mobile
  Lighthouse perf is already capped — no motion library).
- **Cart default regime:** courier (online shopping); toggle to general.
- **Scrape allowlist:** `amazon.*`, `ebay.*`, `mercadolibre.*` / `mercadolivre.*`.

## Part 1 — Lighthouse

No LH tooling exists today. Add `npm run lighthouse` running `lighthouse` (npx) against
a production preview (`npm run preview`, port 3311), desktop + mobile presets, output
HTML+JSON under `docs/lighthouse/`. Use findings to drive Part 2. Known ceiling
(memory): SEO/BP ~100, A11y ~85 (Vuetify-capped), mobile perf capped.

## Part 2 — Dark/light theme + a11y

- Add a contrast-checked **`light` theme** to `plugins/vuetify.ts` (keep `dark`).
- **`useThemeMode()` composable** wrapping Vuetify `useTheme()`: resolves
  `localStorage` choice → else `prefers-color-scheme` → else dark; persists on toggle;
  listens to OS changes while on "system". Three states: `light | dark | system`.
- **Client plugin** applies the resolved theme as early as possible to avoid a flash;
  SSR keeps `dark` default so first paint matches today's look (no hydration mismatch:
  the plugin only re-applies on the client after mount).
- **Toggle button** (sun/moon/auto) in the app bar action cluster and the nav drawer.
  `aria-label`, keyboard-focusable, `VTooltip`.
- **A11y pass:** skip-to-content link (visually hidden, visible on focus, targets
  `#main`), global `:focus-visible` ring, audit icon-button `aria-label`s, ensure
  landmark roles (`header`/`nav`/`main`/`footer`), global `prefers-reduced-motion`
  guard in CSS.
- **Tests:** unit — theme resolution + persistence (pure `resolveTheme()` helper);
  e2e — toggle persists across reload, skip link focuses main.

## Part 3 — Engagement (CSS-only)

- **`useReveal()`** composable: IntersectionObserver adds a `.is-revealed` class to
  opted-in elements (fade/slide-up). No-op under `prefers-reduced-motion`.
- **Count-up** on the converter result / hero stats via `requestAnimationFrame`,
  skipped under reduced motion (renders final value immediately).
- Card hover lift, smooth theme cross-fade (transient class to avoid transitioning
  everything), subtle hero gradient. All reduced-motion-aware.
- **Tests:** unit for the count-up tween math + reduced-motion short-circuit; e2e smoke
  that revealed sections are visible.

## Part 4 — Import cart

Route: `/herramientas/carrito-importacion` (registered in `utils/tools.ts`, category
`impuestos`; linked from `/herramientas`). Trilingual.

### Pure engine — `utils/importCart.ts`

Reuses `courierImport`/`generalImport` (`utils/importTax`),
`productTypeById`/`resolveProductTax`/`productRegimeStatus` (`utils/importProductTypes`),
`round` (`utils/calculators`). No Vue/Nuxt runtime → unit-testable.

```ts
interface CartItem {
  id: string; name: string; url?: string; imageUrl?: string
  priceUsd: number; qty: number; weightKg?: number; categoryId: string
}
interface CartSettings {
  regime: 'courier' | 'general'
  origin: 'usa' | 'other'              // courier TIFA
  useFranchise: boolean
  franchiseAvailableUsd: number        // shared across the cart
  shippingUsd?: number                 // cart-level, untaxed (caller computes from weight×courier)
  arancelPct?: number; tasaConsularPct?: number; imesiPct?: number  // general regime
  usdToUyu?: number | null             // pass bestSell('USD')
}
function computeCart(items: CartItem[], settings: CartSettings): CartResult
```

- `lineValueUsd = priceUsd × qty`.
- **Courier:** franchise allocated **proportionally by line value** across non-blocked
  items, then `courierImport` per line (shipping 0 — added once at cart level). Items
  blocked for courier (`productRegimeStatus`) are excluded from tax + franchise and
  surfaced in `warnings`.
- **General:** `generalImport` per line with settings' arancel/tasaConsular/IVA(by
  category)/IMESI(flagged items use `settings.imesiPct`, default 0).
- Totals: `subtotalUsd` (all goods), `taxableSubtotalUsd` (non-blocked),
  `shippingUsd`, `totalTaxUsd`, `landedCostUsd = taxableGoods + tax + shipping`,
  `landedCostUyu = landedCostUsd × usdToUyu` (or null), `effectiveRatePct`,
  `totalWeightKg`, `warnings[]`, per-line `CartLineResult { tax, blocked, ... }`.
- All amounts `round()`ed; documented as an **estimate** (mixed-category franchise
  allocation is a simplification).

### Scrape — `utils/productScrape.ts` (pure) + `server/api/import-preview.get.ts`

- Pure helpers (unit-tested): `isAllowedProductUrl(url)` (https only, host in allowlist,
  block credentials/ports), `parseProductHtml(html)` → `{ title?, image?, price?,
  currency? }` from OpenGraph (`og:title`/`og:image`/`product:price:amount`) and
  JSON-LD `Product.offers.price`.
- Endpoint validates URL (allowlist), **SSRF guards** (no redirects to private/loopback
  hosts — resolve and reject private IP ranges; cap response size + timeout), fetches
  HTML, returns parsed best-effort `{ title, image, price, currency }`. Failures return
  `{}` (caller falls back to manual). Never proxies arbitrary hosts.

### Persistence — `ImportCart` model + `server/api/me/cart` GET/PUT

- `models/ImportCart.ts`: `{ uid (indexed, unique), items: CartItem[], settings,
  updatedAt }`. One doc per user (upsert).
- `me/cart/index.get.ts` → caller's cart (or empty). `index.put.ts` → upsert caller's
  cart from body (validated). Mirrors `me/saved` auth pattern (`requireUser` + `connectDb`).
- **Client:** Pinia `stores/importCart.ts` — items+settings, persisted to localStorage;
  on login, merge localStorage cart into the account (union by item id, server wins on
  conflict) then PUT; debounced PUT on change while logged in. Mirrors
  `useFavoritesState` hydration.

### UI

- `pages/herramientas/carrito-importacion.vue` — header, settings panel (regime,
  origin, franchise, courier select for shipping estimate), item list, summary, share,
  disclaimers (match existing calculator tone), SEO meta + OG.
- `components/import-cart/AddProductDialog.vue` — URL paste (calls import-preview) +
  manual fields (name, price, qty, weight, category). Graceful when scrape returns `{}`.
- `components/import-cart/ImportCartItem.vue` — row with thumbnail, edit/remove, per-line
  landed cost + blocked warning.
- `components/import-cart/ImportCartSummary.vue` — totals USD + UYU, effective rate,
  breakdown, warnings, "save to account" hint when logged out.

### Tests

- `importCart.test.ts` (TDD first): franchise proportional allocation, mixed categories
  (books 0% / meds 10% / general 22%), blocked exclusion + warning, general regime,
  UYU conversion, empty cart, qty.
- `productScrape.test.ts`: allowlist accept/reject (incl. SSRF-y hosts), OG + JSON-LD
  parsing from fixtures, missing-data graceful.
- `api-import-cart.test.ts`: GET returns caller cart, PUT upserts uid-scoped, rejects bad
  body (mirrors `api-saved.test.ts` mocking).
- `import-cart-store.test.ts`: localStorage persist/load + merge-on-login union.
- e2e `import-cart.spec.ts`: add product manually → totals compute → change regime →
  toggle franchise → remove.

## Build order

4 (engine TDD) → scrape/server/store → cart UI → 2 (theme/a11y) → 3 (anim) →
verify (unit/lint/build/e2e) → 1 (Lighthouse) → adversarial review.

## Out of scope (YAGNI)

Affiliate monetization, real-time price refresh, multi-cart, shareable cart URLs,
official Amazon/eBay APIs, IMESI rate tables per product.
