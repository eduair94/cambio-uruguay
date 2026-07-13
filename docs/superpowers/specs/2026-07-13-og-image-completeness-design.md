# OG image completeness — design

Date: 2026-07-13

**Status:** Implemented 2026-07-13 — `buscar.vue` wired and confirmed rendering (200 image/png, verified in isolation against a healthy local dev server, twice). `npm run check:og-images` added, unit-tested (11/11), and confirmed working end-to-end: it fetched the live sitemap (673 default-locale routes) and correctly classified 504 passes / 169 failures with a clean exit code.

The 169 failures are all in `/sucursales/*`, `/dolar/*`, `/casa/*` — three dynamic route families this plan never touched (no page in those directories was in Part A's scope). Isolated retesting shows they correlate with `nuxt dev`'s own cold-compile/resource fragility under concurrent load (first-hit Vite compilation of an unvisited dynamic route is slow; hitting ~170 of them at once destabilized the dev process — OOM once, `503 Dev server is unavailable` after a restart), not a code defect in this branch. This matches this project's already-documented dev-mode fragility (memory `lightmode-contrast-audit`: "dev cold-compiles ~80s/page ... run against a **prod** build" for full sweeps). A full 0-failures sweep needs a production build or the deployed site, not local `nuxt dev` — `check:og-images` already supports this via `BASE=<url>`. Whether those three route families have a real, separate OG gap is unverified and out of this plan's scope; flagging as a follow-up candidate.

## Problem

OG image rendering is on-demand via the `nuxt-og-image` module + `app/components/OgImage/Cambio.vue` satori template. Pages opt in by calling `defineOgImageComponent('Cambio', { title, subtitle, tag })`, either directly or (for every `herramientas/*` calculator) indirectly through the shared `ToolShell` wrapper. A page with neither falls back to the module's generic default image (or none) when shared on social/Telegram/Discord. Exactly one indexable page — `buscar.vue` — has neither (see Part A for how this was narrowed down from an initial over-broad grep).

There is also no way to catch a *future* page missing the composable, or a satori-template regression that 500s at request time, other than someone noticing a bad social preview after the fact.

## Scope

Two independent pieces:

**Part A — wire the composable onto every indexable page missing it.**
**Part B — a QA script that hits every real route's OG image URL and reports failures.**

## Part A: wire missing pages

**Correction (post-spec-approval):** the initial grep for `defineOgImageComponent` only checked each page file directly and flagged 19 files. Investigation for the plan found that all 15 `herramientas/calculadora-*` / `conversor-*` / `costo-de-vida.vue` / `widget-dolar.vue` pages render through the shared `<ToolShell slug="...">` wrapper (`app/components/ToolShell.vue:163-167`), which **already** calls `defineOgImageComponent('Cambio', { title: tool.title, subtitle: tool.description, tag: 'HERRAMIENTA' })` itself, sourced from the tool catalogue (`app/utils/tools.ts`). All 15 catalogue slugs are registered there (verified by grep). So those 15 pages already get real, per-tool OG images today — they were never actually missing one. Adding a second `defineOgImageComponent` call directly in those page files would be redundant at best and a duplicate-registration bug at worst.

3 files are excluded for a different reason — all carry `robots: noindex` and are never socially shared, so an OG image is wasted work:

- `app/pages/offline.vue` (PWA offline fallback)
- `app/pages/widget.vue` (embed-only iframe target)
- `app/pages/cuenta/index.vue` (auth-gated account page)

That leaves exactly **one** genuine gap:

- `app/pages/buscar.vue` (bare landing only — result pages stay noindex, unaffected)

Wire it using the page's own existing `useSeoMeta` copy (`app/pages/buscar.vue:137-146`, confirmed `locale` already in scope via `useI18n()` at line 96):

```ts
defineOgImageComponent('Cambio', {
  title: () => t('search.pageTitle'),
  subtitle: () => t('search.pageDescription'),
  tag: 'BÚSQUEDA',
  locale: locale.value as 'es' | 'en' | 'pt',
})
```

No new copy is invented — title/subtitle reuse the i18n keys the page's `useSeoMeta` block already calls.

## Part B: OG image QA script

New file: `app/scripts/check-og-images.mjs`, plain Node (no new dependency), matching the existing `app/scripts/lightmode-axe.mjs` convention (`BASE` env var for target, runnable via `node scripts/check-og-images.mjs`).

**Route source:** fetch `${BASE}/api/__sitemap__/urls` — the same live endpoint (`app/server/api/__sitemap__/urls.get.ts`) that generates the real XML sitemap, covering every static route, catalogue slug (guides/tools/glossary/convert/indicators/cotizacion), and API-derived dynamic route (historico, sucursales, dolar/departamento, casa) across all 3 locales. This is a deliberate choice over hand-listing routes: `lightmode-axe.mjs` hand-lists pages and has already drifted (it still probes `/cuenta`, `/widget`, `/offline` — all noindex, per Part A). Reusing the sitemap endpoint means the OG check can never drift from what's actually live — it's also the check that would have caught Part A's original false positive, since it tests actual rendered output rather than grepping page source for the composable call.

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

- Part A: `npm run lint` (existing convention — `typecheck` is separately known-broken, see memory `typecheck-broken`) + manual check of `buscar.vue` via the dev server's `/__og-image__/image/buscar/og.png` URL.
- Part B: run the script itself against local dev (`npm run dev` in one terminal, `node app/scripts/check-og-images.mjs` in another) — after Part A lands, expect 0 failures. Confirms the script's own logic by exercising it against a known-good state.
