# Developer portal `/desarrolladores` (Scalar API reference + open-source hub)

**Date:** 2026-06-22
**Status:** Approved → implementing

## Goal

A dedicated developer page that (a) renders the public API reference with
[Scalar](https://scalar.com), and (b) acts as an open-source hub: GitHub repo,
license, local setup, MCP server, and contributing info — everything a developer
needs to build on cambio-uruguay.

## Decisions (from brainstorming)

- **Scalar integration:** `@scalar/nuxt` module (Nuxt 4 compatible — deps on
  `@nuxt/kit ^4.0.0`). Renders inline inside our own page via the auto-imported
  `ScalarApiReference` component, so the site header/footer + a custom dev-hub
  header wrap the reference. Client-only render to avoid SSR/Vuetify CSS clashes.
- **OpenAPI source:** a hand-authored `app/public/openapi.json` (OpenAPI 3.1),
  served at the stable URL `https://cambio-uruguay.com/openapi.json` so external
  tools (Postman, Insomnia, codegen) can import the same single source of truth.
  `servers: https://api.cambio-uruguay.com`.
- **Languages:** ES + EN via existing `@nuxtjs/i18n` (pt added for parity so the
  page never ships broken). OpenAPI `description`s in English (dev convention).
- **Route:** `/desarrolladores`, with `/developers` alias.
- **Backend-served docs (`/docs` on Express):** out of scope for now (needs a
  root backend redeploy). Noted as a future option; the `openapi.json` URL
  already covers programmatic import without it.

## Documented endpoints (base `https://api.cambio-uruguay.com`)

Schemas derived from the **live API responses** (sampled 2026-06-22) plus the
existing types in `mcp/src/api.ts`.

| Tag | Endpoints |
|-----|-----------|
| Cotizaciones | `GET /`, `GET /exchange/{origin}/{code}` |
| Histórico | `GET /evolution/{origin}/{code}/{type}` (`?period=`) |
| BCU oficial | `GET /bcu`, `GET /bcu/{origin}` |
| Casas & Sucursales | `GET /localData`, `GET /locations` |
| Parámetros (enums) | `GET /parameters/{origins,currencies,types,locations,all}` |
| IA | `POST /ai/insights`, `GET /ai/status` |
| Sistema | `GET /ping`, `GET /health` |

Excluded (internal/admin): `debug/*`, `cache/*`, `geocoding`, `position_stack`,
`fortex`, `distances`, `exchanges/{origin}` (raw BCU branch dump).

### Key response shapes (from live samples)

- **RateRow** (`GET /`, `GET /exchange/...`): `{ origin, date(ISO), type, code,
  buy(number), name, sell(number) }`. `code` ∈ currencies enum; `type` ∈ types
  enum or `""`.
- **localData**: object keyed by origin → `{ name, website?, maps?, bcu?,
  departments[] }`.
- **locations**: array of `{ origin, id, name, dept, locality, address, phone,
  hours, lat, lng, mapUrl }`.
- **evolution**: `{ origin, code, type, statistics{ totalDataPoints, dateRange,
  buy{min,max,avg,current,change}, sell{...} }, evolution[RateRow] }`.
- **parameters/\***: `{ origins|currencies|types|locations: string[], count }`;
  `parameters/all` merges all four.
- **ai/insights** (POST `{ type, currency?, lang? }`): `{ insight, type, cached,
  truncated }`. `type` ∈ market_summary | currency_analysis | best_rates |
  trend_analysis | custom. `lang` ∈ es | en | pt.
- **ai/status**: `{ configured, model, availableTypes[], supportedLanguages[],
  cacheEnabled, cacheTTL }`.
- **ping**: `{ expected, total }`. **health**: `{ status, timestamp, uptime,
  database{...}, cache{...}, sync{...} }`.

## Page composition (`app/pages/desarrolladores.vue`)

1. **Dev-hub header** (Vuetify, site-themed):
   - Open source on GitHub → repo `eduair94/cambio-uruguay` + license badge.
   - Quick-start: `npm install && cd app && npm install`, `npm run dev`.
   - API base URL + link/copy of the raw `openapi.json`.
   - MCP server card (reuse existing `McpConfigCard`) → `mcp.cambio-uruguay.com/mcp`.
   - Contributing (PRs welcome) + contact.
2. **`<client-only>` `<ScalarApiReference :configuration="{ url: '/openapi.json',
   darkMode }">`** — `darkMode` bound to `useThemeMode().applied === 'dark'` so
   it follows the site theme toggle.

## Wiring

- `nuxt.config.ts`: add `'@scalar/nuxt'` to `modules`. No global standalone route
  (we embed the component). Add `/desarrolladores` to `robots.allow`.
- `i18n/locales/json/{es,en,pt}.json`: `desarrolladores.*` keys.
- `Footer.vue`: add a `footer-link` to `/desarrolladores`; point the existing
  "API" actions (footer + `conectar.vue` API card) at the new page.
- `pages/desarrolladores.vue` uses `definePageMeta({ alias: ['/developers'] })`.
- `server/api/__sitemap__/urls.get.ts`: `addUrlsForAllLocales('/desarrolladores',
  0.6, 'monthly')`.
- SEO: `useSeoMeta` + `defineOgImageComponent('Cambio', …)` like other pages.

## Testing

- **Unit** (`vitest`): load `public/openapi.json`, assert it parses, is OpenAPI
  3.1, has `servers`, and every documented path/operation is present with a 200
  response — guards against drift/typos.
- **e2e** (`playwright`): `/desarrolladores` returns 200, dev-hub header visible,
  and Scalar mounts (gate on hydration via `toPass` retries, per project pattern).

## Out of scope (YAGNI)

- Auto-generating OpenAPI from the Express handlers (no decorators today).
- Backend-served Scalar at `api.cambio-uruguay.com/docs`.
- Auth/keys (the API is public + read-only).
