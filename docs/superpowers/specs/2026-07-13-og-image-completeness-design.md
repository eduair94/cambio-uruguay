# OG image completeness — design

Date: 2026-07-13

## Problem

OG image rendering is on-demand via the `nuxt-og-image` module + `app/components/OgImage/Cambio.vue` satori template. There is no manifest: each page opts in by calling `defineOgImageComponent('Cambio', { title, subtitle, tag })` inline. 19 of 81 page files never call it, so those pages fall back to the module's generic default image (or none) when shared on social/Telegram/Discord.

There is also no way to catch a *future* page missing the composable, or a satori-template regression that 500s at request time, other than someone noticing a bad social preview after the fact.

## Scope

Two independent pieces:

**Part A — wire the composable onto every indexable page missing it.**
**Part B — a QA script that hits every real route's OG image URL and reports failures.**

## Part A: wire missing pages

19 files currently lack `defineOgImageComponent`. 3 are excluded — all carry `robots: noindex` and are never socially shared, so an OG image is wasted work:

- `app/pages/offline.vue` (PWA offline fallback)
- `app/pages/widget.vue` (embed-only iframe target)
- `app/pages/cuenta/index.vue` (auth-gated account page)

The remaining **16** get wired:

- `app/pages/buscar.vue` (bare landing only — result pages stay noindex, unaffected)
- `app/pages/herramientas/calculadora-aguinaldo.vue`
- `app/pages/herramientas/calculadora-impuestos-importacion.vue`
- `app/pages/herramientas/calculadora-inflacion.vue`
- `app/pages/herramientas/calculadora-irpf.vue`
- `app/pages/herramientas/calculadora-iva.vue`
- `app/pages/herramientas/calculadora-plazo-fijo.vue`
- `app/pages/herramientas/calculadora-prestamo.vue`
- `app/pages/herramientas/calculadora-presupuesto-viaje.vue`
- `app/pages/herramientas/calculadora-propinas.vue`
- `app/pages/herramientas/calculadora-spread.vue`
- `app/pages/herramientas/calculadora-sueldo-liquido.vue`
- `app/pages/herramientas/conversor-de-monedas.vue`
- `app/pages/herramientas/conversor-unidad-indexada.vue`
- `app/pages/herramientas/costo-de-vida.vue`
- `app/pages/herramientas/widget-dolar.vue`

Pattern for each (matches existing sibling pages, e.g. `herramientas/index.vue`, `carrito-importacion.vue`, `alquilar-en-uruguay.vue`):

```ts
defineOgImageComponent('Cambio', {
  title,      // reuse the page's existing useSeoMeta title (or its i18n key), not new copy
  subtitle,   // reuse the page's existing useSeoMeta description, trimmed to ~60-70 chars for the card
  tag,        // short category label, see below
})
```

Tag assignment:
- `CALCULADORA` — the 10 `calculadora-*.vue` pages
- `CONVERSOR` — `conversor-de-monedas.vue`, `conversor-unidad-indexada.vue`
- `HERRAMIENTA` — `widget-dolar.vue`, `costo-de-vida.vue`
- `BÚSQUEDA` — `buscar.vue`

Whether a page passes `locale` follows that page's existing convention — only pages that already have `locale` in scope (via `useI18n()`) pass it; others omit it, same as current mixed usage across the codebase (some pages hardcode literal ES strings, others use `t()`).

No new copy is invented — title/subtitle come from each page's own `useSeoMeta` block or i18n keys already in the codebase.

## Part B: OG image QA script

New file: `app/scripts/check-og-images.mjs`, plain Node (no new dependency), matching the existing `app/scripts/lightmode-axe.mjs` convention (`BASE` env var for target, runnable via `node scripts/check-og-images.mjs`).

**Route source:** fetch `${BASE}/api/__sitemap__/urls` — the same live endpoint (`app/server/api/__sitemap__/urls.get.ts`) that generates the real XML sitemap, covering every static route, catalogue slug (guides/tools/glossary/convert/indicators/cotizacion), and API-derived dynamic route (historico, sucursales, dolar/departamento, casa) across all 3 locales. This is a deliberate choice over hand-listing routes: `lightmode-axe.mjs` hand-lists pages and has already drifted (it still probes `/cuenta`, `/widget`, `/offline` — all noindex, per Part A's research). Reusing the sitemap endpoint means the OG check can never drift from what's actually live.

**Path selection:** dedupe to unique paths, default locale (`es`) only. The satori template renders the same layout for all three locales from the same props, so one locale is a representative sample; full tri-locale coverage would triple request volume for no meaningful extra signal. Note this scope in the script's summary output.

**Per-path check:**
1. Build `${BASE}/__og-image__/image${path}/og.png`
2. `GET` it
3. Assert: HTTP 200, `content-type` starts with `image/`, response body > 1000 bytes (catches empty/broken renders without full PNG parsing)
4. Run with a small concurrency pool (~5 concurrent requests) to avoid hammering the target server

**Output:** total checked, pass count, and a failure table (path, status, reason) for anything that didn't pass. Non-zero process exit code if any failure, so it's usable as a CI gate, not just a manual check.

**npm script:** add `"check:og-images": "node scripts/check-og-images.mjs"` under `app/package.json` (mirrors how other one-off scripts in `app/scripts/` are invoked).

## Out of scope

- No static PNGs are generated or committed — the site is SSR (pm2, not `nuxt generate`), so the module's on-demand render + cache already serves production; a QA smoke-check is what's needed, not a build artifact.
- No changes to the `Cambio.vue` satori template itself.
- No manifest/config file introduced — the per-page inline pattern is already the established convention; introducing a manifest here would be a divergence, not a fix.

## Testing

- Part A: `npm run lint` (existing convention — `typecheck` is separately known-broken, see memory `typecheck-broken`) + manual spot-check of 2-3 wired pages via the dev server's `/__og-image__/image/...` URL.
- Part B: run the script itself against local dev (`npm run dev` in one terminal, `node app/scripts/check-og-images.mjs` in another) — after Part A lands, expect 0 failures. Confirms the script's own logic by exercising it against a known-good state.
