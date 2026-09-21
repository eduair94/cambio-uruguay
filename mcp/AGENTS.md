# mcp/ — AGENTS

Open-source MCP server (`cambio-uruguay-mcp`, published to npm) wrapping the public cambio-uruguay rates API AND the site API (rentals, used cars, products) as 26 read-only tools in 4 toolsets, plus a Claude skill; isolated package with its own build and deploy surface.

Start with `mcp/README.md` (client configs, tool list, env table) and `mcp/DEPLOY.md` (hosted endpoint, nginx). This file = only what's beyond them.

## Layout (all under `src/`, ESM, `tsc` Node16 → `dist/`)
| file | role |
|---|---|
| `index.ts` | entrypoint (`bin`). Picks transport from `MCP_TRANSPORT`: `stdio` (default) or `http`. HTTP server exposes only `/mcp` + `/health`. |
| `server.ts` | `buildServer(api, { site, toolsets })` — registers each toolset from `src/register/` (exchange = the original 7 tools + prompt) and sends `instructions.ts`. |
| `tools.ts` | PURE handlers over the `CambioApi` seam (data in → structured data out, no MCP types, no network). Rate/retail-filter logic. |
| `api.ts` | `CambioApi` interface + `httpCambioApi(base)` live client (global `fetch`). Types: `RateRow`, `HouseInfo`, `InsightResult`. |
| `news.ts` | Google News RSS feeds + parse/merge/dedupe (news comes straight from RSS, NOT the API). |
| `lib.ts` | library entry — package `main`/`exports` (`.`, `./api`, `./tools`, `./news`) for programmatic use. |
| `test/*.test.ts` | vitest, pure handlers against a FAKE `CambioApi` / `fakeSite()` — no network. `server.test.ts` drives the real server through `InMemoryTransport`. |

## Site toolsets: alquileres, autos, productos (v0.2.0)

19 more tools read the **site** API (`SITE_BASE_URL`, default `https://cambio-uruguay.com`, the Nuxt
`app/server/api/*` routes over the APP DB), not the rates API. Same pattern as `tools.ts`: pure
handlers `(site: SiteApi, input) => Promise<ToolOutput>` in `src/rentals/`, `src/cars/`,
`src/products/`; zod + descriptions in `src/register/*.ts`; `safe()` turns failures into MCP tool
errors. `buildServer(api, { site, toolsets })`; HTTP picks toolsets by path (`/mcp`, `/mcp/alquileres`,
`/mcp/autos`, `/mcp/productos`, `/mcp/cambio`), stdio by `MCP_TOOLSETS`. `src/instructions.ts` is sent
at initialisation; `src/register/prompts.ts` holds 6 guided workflows.

| dir | role |
|---|---|
| `src/site.ts` | `SiteApi` + `httpSiteApi()`: TTL cache (60 s searches, 10 min catalogues), in-flight dedupe, 25 s timeout (90 s for `/api/rentals/fit`), one retry on 502/503/504, Spanish `SiteError`s |
| `src/format.ts` | money/percent formatting, `fold`, `slugify`, `toQuery`, `siteUrl` (links always to the public site) |
| `src/rentals/` | search + geocode, household ranking (`POST /api/rentals/fit`), ficha + zone profile, analysis, estimate, zones, opportunities |
| `src/cars/` | directory, opportunities, ficha, model market, declared risks, report |
| `src/products/` | unified search (phones, chairs, equipar, movilidad), home basket, stores, SIPC prices, directories |
| `skills/buscador-uruguay/` | Agent Skill; `npm run pack-skill` writes `app/public/descargas/buscador-uruguay-skill.zip` (test fails on drift) |
| `scripts/smoke.mjs` | `npm run smoke`: every site handler against production. Run it after touching a handler: it found 4 real defects the unit tests could not |

### Gotchas measured against production (2026-09-21)
- **Rental price filters are ALWAYS pesos** (`priceMin`/`priceMax` compare `priceUyu`); the site `currency`
  param only keeps adverts published in that currency. Hence `priceMinUyu`/`priceMaxUyu` + `listedCurrency`.
- **`refLat`/`refLng` only SORT by distance**, they never filter; the radius is applied in the handler over a
  48-row page, and the text says how many fall inside, not the catalogue total.
- **The IDE geocoder** misses "Avenida Italia 2500" (finds "Italia 2500"), reads "Julio Herrera y Reissig" as an
  intersection and sometimes answers 503. `geocodeItems` retries without the street type; errors advise lat/lng.
- **Category offer lists are not curated** (a 20-peso fridge, a paring knife under "chef knife"): an offer only
  counts when it reaches 60 % of the p25 of the band for its condition (`plausibleOffers`).
- **`/api/rentals/fit`** is 10 req/min per IP and 30/min per worker, and a cold worker needs 30–60 s to load the
  catalogue (Cloudflare can 502 once): the hosted server shares one IP, so heavy use hits 429.
- The car valuation `diesel` coefficient is computed but not advice (it measures the version); it is not shown.
- Never log request bodies: household incomes and addresses travel in `rank_rentals_for_household`.
- **CORS** (`src/cors.ts`): only the site origins (+ `MCP_CORS_ORIGINS`) get headers, for the browser chat at `/asistente-ia` (Puter.js user-pays sign-in, `app/utils/puterChat.ts`, or the visitor's own Gemini key, `app/utils/geminiChat.ts`). The preflight is answered before the SDK transport, which would 405. Removing the site origin breaks that page silently.


## Build / run / test (cwd = `mcp/`)
- `npm install && npm run build` → `dist/` (`tsc -p tsconfig.json`, `rootDir src`, `outDir dist`, declarations).
- `npm test` (`vitest run`) · `npm run dev` (`tsx src/index.ts`) · `npm run inspect` (MCP Inspector on source).
- Node ≥18. Deps: only `@modelcontextprotocol/sdk` + `zod`.

## Non-obvious rules / gotchas
- **ESM `.js` specifiers**: source `.ts` imports use `.js` suffixes (`./api.js`) — required by Node16 moduleResolution. Keep it.
- **Upstream API is the only source of truth** (`API_BASE_URL`, default `https://api.cambio-uruguay.com`). Endpoints consumed: `GET /`, `GET /localData`, `GET /evolution/:origin/:currency?period=N`, `POST /ai/insights`. No DB, no scraping, no secrets here.
- **Market math excludes** `origin==="bcu"` and `INTERBANK_TYPES` (`INTERBANCARIO`, `FONDO/CABLE`, `CABLE`, `BILLETE`, `PROMED.FONDO`) — see `isRetail()` in `tools.ts`. Don't reintroduce those into averages/best-house.
- **Rate convention** (baked into tool descriptions): buy a currency = house `sell` price → best is LOWEST sell; sell it = house `buy` price → best is HIGHEST buy. Getting this backwards is the classic bug.
- **HTTP transport is stateless**: fresh `McpServer`+`StreamableHTTPServerTransport` per request (`sessionIdGenerator: undefined`), closed on `res` close. No session affinity. Behind nginx, responses are SSE — proxy must NOT buffer (`proxy_buffering off`; see DEPLOY.md).
- Handlers `throw` on empty results (e.g. `No retail rates found for currency "X"`) — surfaced as MCP tool errors.

## Production
- pm2 app **`currency-mcp`** in repo-root `../ecosystem.config.js` (fork mode, `cwd: ./mcp`, `script: dist/index.js`, env `MCP_TRANSPORT=http` / `MCP_HTTP_PORT=8788` / `API_BASE_URL`). Live at `https://mcp.cambio-uruguay.com/mcp`.
- **Separate deploy surface** from the root backend: `scripts/deploy-backend.sh` explicitly leaves `mcp/` (and `bots/`) out of scope — not in its `OTHER_APPS`, its build never touches these. Deploy manually per DEPLOY.md: SSH in, `git pull`, `cd mcp && npm ci && npm run build`, `pm2 reload currency-mcp && pm2 save`. Health: `curl -s localhost:8788/health`.
- npm publish auto-builds (`prepublishOnly`); `files` ships `dist` + README + LICENSE only.
