# classes/ — AGENTS
Root Express backend: ~52 casa-de-cambio scrapers + self-updating data subsystems, all TypeScript on ts-node. Runs as the API process **and** as many one-file pm2 cron jobs.

## Run / build / test (from repo root, NOT here)
- `npm run dev` → `ts-node index.ts` (Express API; wires cambioInfo, aduana, banks, costs, figures, debt, loans, temas).
- `npm run build` → `tsc -p tsconfig.production.json`. `npm test` → `vitest run` (`tests/`).
- Cron entrypoints are root-level `sync_*.ts` / `import_*.ts`, each its OWN pm2 process: `sync.ts` (casas), `sync_aduana(.ts|_daily.ts)`, `sync_banks_news`, `sync_costs`, `sync_debt_relief`, `sync_figures`, `sync_loans`, `sync_predictions`, `sync_explain`, `sync_temas_analysis`. See `package.json` scripts for the ts-node command per job; dev one-offs are in `scripts/oneoff/*`.
- Validate scrapers: `scripts/oneoff/validate_cambios.ts` (its `main()` is the canonical connect+withTimeout idiom).

## Two Mongo connections — never confuse them
- `database.ts` = **backend** Mongo (`MONGODB_URI`, `config.ts` mongoConfig). `MongooseServer` singleton (default mongoose connection). Only `MongooseServer.startConnectionPromise()` opens it; it NEVER rejects/times out on its own → always wrap in `withTimeout(...,15000)` (exported here). Reads return `{error}` until `connectionAllowed`.
- `appdb.ts` = **SECOND** connection (`createConnection`, `APP_MONGO_URI`) to the Nuxt APP's DB. Ledgers `pricepredictions`, `moveexplanations`, `reddittopics` live there and are NEVER truncated/regenerated. `appModel()` = lazy Proxy: `.schema`/`.collection.name` need no live DB (so schema-parity tests import freely); any real op throws loudly without `APP_MONGO_URI`. `models/*.ts` (DriverSnapshot, MoveExplanation, PriceNews, PricePrediction) are app-bound mirrors guarded by `tests/appdb/schema_parity.test.ts` — a forgotten field is silently dropped.

## Cron tripwire — the #1 silent-bug source
Any entrypoint whose relative-import graph touches `MongooseServer.getInstance(` MUST call `MongooseServer.startConnectionPromise()` (wrapped in withTimeout) as the first thing in `main()`, else every Mongo op buffers 10s then the job catches-and-exits(0): pm2 reports success forever while writing nothing. Enforced by `tests/sync/connect_tripwire.test.ts` (static import-graph walk over root `sync_*/import_*`). app-Mongo bridge (`appdb.ts`) is NOT policed by it.

## Casa scrapers (`cambios/`, 52 files, 46 active origins)
- `cambio.ts` = abstract base (axios+cheerio, `axios.defaults.timeout=15000`, moment tz America/Montevideo, BCU sucursal lookup, `sync_data`). `cambioInfo.ts` = read/query facade over stored markets. `sync_cambio.ts` = iterate `origins` map → `new Class(); .sync_data()`, 500ms throttle, writes `last_sync.txt`/`last_sync_results.json`. `origins.ts` = origin-key → scraper-class registry (add a new casa here).
- **DB-derived scrapers** (`cambio_federal.ts`, `cambio_argentino.ts`, `cambio_romantico.ts`) don't fetch a site — they read `origin:"brou"` rows from Mongo and re-map them. They FALSE-FAIL when validated standalone without a live backend-Mongo connection.
- See **`classes/cambios/AGENTS.md`** for per-scraper detail.

## Gemini — ALL of it lives here now
- `gemini.ts` = the ONE grounded client (google_search on, returns text + resolved source URIs; callers reject any citation the model didn't actually fetch). `askGrounded`/`geminiConfigured`. `GEMINI_MODEL` env, default `gemini-2.5-flash-lite` (`gemini-2.5-flash` was retired → 404; one dead id silently took the WHOLE job fleet down). NEVER throws → returns `null` = "no update this cycle". Free-tier pacing via `GEMINI_MIN_INTERVAL_MS`.
- `aduana/gemini.ts` is just a re-export of `../gemini`. `ai_service.ts`'s `classify()` is a PLAIN completion (no web, no grounding) — do not use it to "verify" a live fact.
- App side forbids Gemini entirely (`noGeminiInApp` test in app); keep new AI calls in the backend.

## BCU
`bcu_soap.ts` (SOAP-primary, HTML fallback), `bcu_backfill.ts` (gap detect + backfill), `bcu_details.ts` (single-doc detail store), `cambios/bcu.ts` (the origin scraper).

## Self-updating subsystems (grounded Gemini, keep baseline on any failure)
| dir | role / files |
|---|---|
| `aduana/` | import/customs figures; auto-publish behind denylist + 2-independent-source guardrail. `harvest`,`discover`,`classify`,`corpus`,`norms`,`window`,`baseline`,`store`(single `aduana_data` doc),`payload`,`alerts`(Telegram, one line per state change),`types`,`gemini` |
| `banks/` | `entities`, `news`, `store` (bank-news briefing) |
| `loans/` | `catalog` seed, `scraper`(regex TEA: oca/pronto/cash only), `gemini`(grounded rest; citation hostname must match lender domain), `refresh`(fallback chain), `store` |
| `costs/`,`debt/`,`figures/` | uniform `bands`+`refresh`+`store` (validate every value vs bands, else keep baseline) |
| `predictions/` | `prompt`,`refresh`(grounded AI lean + external forecasts, legs fail independently),`series` → app-Mongo ledger |
| `explain/` | `moves`,`news`,`refresh` (Gemini news → falls back to classify()-attribution; idempotent) → app-Mongo |
| `temas-analysis/` | `appTopics`,`refresh`,`store` |

## Express + misc
`Express/`: `ExpressSetup.ts` (default `server` export used by index.ts), `Express.ts`, `ExpressCustomSetup.ts`, `Express.interface.ts`. Also here: `ai_service.ts` (AI insights + classify, 44KB), `ai_insight_cache.ts`, `redis_cache.ts` (ioredis), `reddit.ts`, `notify.ts` (Telegram), `rate_source.ts`, `origins.ts`, `ProxyFileService.ts`, `sync_favicon.ts`, `cluster.ts`, `utils.ts`.

## Gotchas
- `sync.ts` sets `NODE_TLS_REJECT_UNAUTHORIZED=0` and `process.exit(1)` even on success (existing quirk — don't "fix" the exit code blindly).
- API process must contain NO scheduled work — the currency-server is a pm2 cluster; `tests/no_scheduler_in_api.test.ts` enforces it. Put timers/crons in a `sync_*.ts`, never in index.ts.
- Deps: axios/cheerio/puppeteer/mongoose/moment-timezone/soap/ioredis/openai. Envs: `MONGODB_URI`, `APP_MONGO_URI`, `GEMINI_API_KEY`/`GEMINI_MODEL`/`GEMINI_MIN_INTERVAL_MS`.
- Deeper: **`classes/cambios/AGENTS.md`** (scrapers), **`tests/AGENTS.md`** (tripwire + parity tests).
