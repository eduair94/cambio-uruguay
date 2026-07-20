# app/ — AGENTS

Nuxt 4 (`compatibilityVersion: 4`) + Vuetify 4.1.5 SSR frontend for cambio-uruguay.com: live USD rates, ~60 content/tool pages, trilingual (es default / en / pt).

## Run / build / test / lint
- Dev: `npm run dev` → **port 3311** (`0.0.0.0`); prod: `npm run build` then `npm run start`.
- After `.nuxt` is wiped (dev restart, branch switch): `npx nuxi prepare` (also runs via `postinstall`/`prepare` = `nuxt prepare`).
- **`npm run typecheck` (vue-tsc) is BROKEN — it crashes. Use `npm run lint` (eslint flat) instead;** `npm run lintfix` to auto-fix.
- Prettier is enforced *through* eslint (`prettier/prettier` rule): `semi:false, singleQuote, arrowParens:avoid, printWidth:100, trailingComma:es5, tabWidth:2`. lint-staged runs `lintfix` on js/ts/vue, `prettier --write` on json/md/css. Known conflict: prettier vs `vue/html-self-closing` anchor/attr wrapping — let `lintfix` settle it, don't hand-format.
- Unit: `npm run test:unit` (= `vitest run`; `tests/unit/**`, **environment: node, no Nuxt runtime** — tested logic must avoid Nuxt auto-imports & use relative imports). Most `utils/*.ts` have a paired `*.test.ts`.
- E2E: `npm run test:e2e` (Playwright, system Chrome, `tests/e2e/**`, baseURL `localhost:3311`, `workers:1`, reuses running dev server). **Gate every interaction on hydration** (`expect(...).toPass()` retries) or you hit first-click races (Suspense hydration bug is latent site-wide).

## Layout
- `pages/` — file-routed views (`casa/`, `cotizacion/`, `dolar/`, `convertir/`, `guias/[slug]`, `indicadores/`, `herramientas/`, `sucursales/`, `glosario/`, `blog/`, `cuenta/` subdirs).
- `utils/` — **typed data catalogs + pure logic** (`~110` files). Content pages are data-driven: a `utils/<topic>.ts` catalog (often with computed rankings + a `*.test.ts`) feeds `pages/<slug>.vue`. New content pages follow this. No Vue/Nuxt imports here — keep pure so vitest-node can load them.
- `components/` — Vuetify components; subdirs `OgImage/` (`Cambio.vue` OG template), `charts/`, `map/`, `mapa/`, `nearby/`, `reddit/`, `import-cart/`, `account/`, `analysis/`, `Faq/`.
- `server/` — Nitro. `api/` (routes, mostly `.get.ts` proxying/merging `api.cambio-uruguay.com`), `tasks/` (scheduled — see below), `models/` (mongoose), `utils/` (e.g. `firebaseAdmin.ts`), `data/`.
- `composables/` — `useThemeMode`, `useExchangeRates`, `useTrack`, `useConsent`, `useRedditSentiment`, `useAuthFetch`, `useSavedDrift`, etc.
- `stores/` — Pinia (`auth`, `cambio`, `importCart`, `loading`, `firebaseAuthApi`, `firebaseMessagingApi`).
- `i18n/locales/` — `es.ts` / `en.ts` / `pt.ts` (+ `json/`). Strategy `prefix_except_default`; labels are i18n keys, never raw literals.
- `plugins/` (`.client.ts` for browser-only: firebase, clarity, tawk, consent, track-clicks), `middleware/auth.ts` (client-only login guard), `layouts/` (`default`, `error`, `widget`), `assets/`.

## Source-of-truth & guard rails (these cause CI-red bugs)
- **`utils/siteNav.ts` = single source of truth** for desktop header, mobile drawer, footer, XML+HTML sitemap, Ctrl+K palette, `/buscar`. A new `pages/*.vue` **not registered in `NAV_SECTIONS`** (or in `EXCLUDED_ROUTES`/`UNLISTED_ROUTES`) fails `tests/unit/siteNav-coverage.test.ts`. It's a PURE module (no catalog imports); long-tail search lives in `utils/searchIndex.ts`. New tool → also `utils/tools.ts` (`toolSlugs`).
- **No Gemini/AI in this app** — enforced by `tests/unit/noGeminiInApp.test.ts`. All AI (blog moves/predictions/figures/loans) moved to the backend; app only proxies + caches. Figures/company constants baked into utils serve as baseline; live values arrive from backend.
- OG image is generated **per public page** (nuxt-og-image via `OgImage/Cambio.vue`); `og:image` is intentionally NOT hardcoded in `nuxt.config`. `npm run check:og-images` verifies coverage.

## Theme & responsive (recurring bug sources)
- Dark-first site. `useThemeMode` persists to `localStorage['cu_theme']` (`THEME_STORAGE_KEY` in `utils/theme.ts`) and stamps `data-theme` on `<html>`; Vuetify theme mirrors it.
- Light-mode AA fixes live in `assets/css/critical.css`. **A permanently-dark/colored banner darkens its own text in light mode** → add class **`.on-dark`** to the slab root so the global rule restores light text.
- Wide tables: add global class **`cu-mobile-cards`** + `data-label` per `<td>` to stack into cards <600px (`assets/css/responsive-tables.css`); VDataTables use native `:mobile` instead.
- Vuetify base stylesheet is **`~/assets/variables.scss`, NOT `vuetify/styles`** (loading both double-emits & breaks the v4→v3 look reverts). `legacy-vuetify.css` restores MD2 elevations/case. Do not add `@nuxtjs/leaflet` (ships leaflet.css globally); Leaflet CSS is scoped per-route.

## Auth, analytics, tasks
- Firebase auth (Google / email / magic-link / guest / Discord-OAuth→custom-token) + favorites + rate alerts + Telegram linking. Web SDK config in `runtimeConfig.public.firebase`; Admin server-side (`server/utils/firebaseAdmin.ts`).
- **GA4 is SEND-ONLY / unreadable** (`nuxt-gtag`, Consent Mode v2 default-deny). Demand/traffic signal comes from the Reddit pipeline (`server/tasks/reddit/sentiment.ts` → `useRedditSentiment`), never GA4.
- Nitro `scheduledTasks` (UTC) in `nuxt.config.ts`: `drivers:daily`, `blog:daily`, `figures:drift`, `newsletter:daily`, `alerts:check` (*/10m), `telegram:summary`, `couriers:scrape`, `withdraw:iva-check`, `casas:reviews`, `reddit:sentiment`, `bcu:warnings`. Durable fs stores under `.data/` (blog, couriers, withdraw, casas-reviews, figures, company).

## Deeper docs
`docs/app/SEO_README.md`, `docs/app/AUTH_README.md`, `docs/app/PERFORMANCE_IMPROVEMENTS.md`; SEO strategy/audits in `docs/seo/`. Env template: `app/.env.example`. Backend/deploy specifics live in the root `AGENTS.md` and the maintainer's memory, not here.
