# mcp/ — AGENTS

Open-source MCP server (`cambio-uruguay-mcp`, published to npm) wrapping the public cambio-uruguay API as read-only tools; isolated package with its own build and deploy surface.

Start with `mcp/README.md` (client configs, tool list, env table) and `mcp/DEPLOY.md` (hosted endpoint, nginx). This file = only what's beyond them.

## Layout (all under `src/`, ESM, `tsc` Node16 → `dist/`)
| file | role |
|---|---|
| `index.ts` | entrypoint (`bin`). Picks transport from `MCP_TRANSPORT`: `stdio` (default) or `http`. HTTP server exposes only `/mcp` + `/health`. |
| `server.ts` | `buildServer(api)` — registers the 7 tools + 1 prompt on `McpServer`. Tool titles/descriptions/`zod` input schemas live here. |
| `tools.ts` | PURE handlers over the `CambioApi` seam (data in → structured data out, no MCP types, no network). Rate/retail-filter logic. |
| `api.ts` | `CambioApi` interface + `httpCambioApi(base)` live client (global `fetch`). Types: `RateRow`, `HouseInfo`, `InsightResult`. |
| `news.ts` | Google News RSS feeds + parse/merge/dedupe (news comes straight from RSS, NOT the API). |
| `lib.ts` | library entry — package `main`/`exports` (`.`, `./api`, `./tools`, `./news`) for programmatic use. |
| `test/*.test.ts` | vitest, pure handlers against a FAKE `CambioApi` — no network. |

## Build / run / test (cwd = `mcp/`)
- `npm ci && npm run build` → `dist/` (`tsc -p tsconfig.json`, `rootDir src`, `outDir dist`, declarations).
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
