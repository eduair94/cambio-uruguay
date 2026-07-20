# cambio-uruguay — AGENTS

Root map of a multi-package monorepo behind [cambio-uruguay.com](https://cambio-uruguay.com): a TypeScript Express API + casa-de-cambio/currency scrapers (this dir) plus a separate Nuxt frontend (`app/`), an MCP server (`mcp/`), and social bots (`bots/`). Operate only inside this worktree.

## Two build surfaces (own package.json, own deploy, DIFFERENT MongoDBs)
- **Root** = Express API + scrapers + sync jobs. `name:"api"`, TS4.9, CommonJS. Dev: `npm run dev` (`ts-node index.ts`). Build: `npm run build` (`tsc -p tsconfig.production.json` → `dist/`). Prod: pm2 via `ecosystem.config.js`. Mongo DB `cambio-uy` (`config.ts`), host A.
- **`app/`** = Nuxt 4 (`compatibilityVersion: 4`) / Vuetify 4.1.5 frontend. `name:"app"` v2.0.0, ESM, TS5.7. Own `package.json`, own build (`nuxt build`), own deploy (`app/scripts/deploy.sh`). Uses a DIFFERENT Mongo (`APP_MONGO_URI`, host B). **`classes/appdb.ts` is the only bridge from root → app DB.**
- **`mcp/`**, **`bots/`** = own `package.json` + `npm run build`; build separately before their pm2 apps start.
- **Rule: never mutate `app/` mid-build.** Root `tsconfig.json` excludes `app`, `dist`, `mcp`, `bots`, `scripts/oneoff`.

## pm2 jobs (`ecosystem.config.js` → script → cron UTC)
| app | script | cron | notes |
|---|---|---|---|
| currency-server | dist/index.js | — | **cluster ×2**, the API. NO scheduled work here (see below) |
| currency-sync | dist/sync.js | */5 * * * * | scrape all casas (`classes/sync_cambio.ts`) |
| currency-sheet | dist/sync_sheet.js | — | long-running Google-Sheet sync |
| currency-aduana | dist/sync_aduana.js | 30 9 * * 1 | Mondays; Reddit+Gemini customs corpus |
| currency-aduana-daily | dist/sync_aduana_daily.js | 40 9 * * * | self-gates to 2026-09-01..11-01 decree window |
| currency-banks-news | dist/sync_banks_news.js | 37 10 * * * | heaviest Gemini job (~36 calls) |
| currency-figures | dist/sync_figures.js | 52 9 * * * | UY figures (SMN/BPC/boleto) |
| currency-costs | dist/sync_costs.js | 43 9 * * * | cost-of-living figures |
| currency-loans | dist/sync_loans.js | 47 8 * * * | lender TEA refresh |
| currency-predictions | dist/sync_predictions.js | 23 9 * * * | writes APP DB `pricepredictions`; needs `APP_MONGO_URI` |
| currency-explain | dist/sync_explain.js | 7 10 * * * | writes APP DB `moveexplanations` |
| currency-debt-relief | dist/sync_debt_relief.js | 13 10 1 * * | monthly; BCU usury caps |
| currency-temas-analysis | dist/sync_temas_analysis.js | 17 11 * * * | reads app DB, writes backend `temas_analysis_data`; self-gates 90d; needs `APP_MONGO_URI` |
| currency-mcp | mcp/dist/index.js (cwd ./mcp) | — | HTTP :8788 |
| currency-bot-telegram / -discord | bots/dist/entries/{telegram,discord}.js | — | read `bots/.env` |
| currency-daily | bots/dist/entries/daily_report.js | 0 12 * * * | |
| currency-alerts | bots/dist/entries/alert_check.js | */15 11-21 * * * | intraday move alerts |

Root pm2 entrypoints live at repo root: `index.ts`, `sync.ts`, `sync_aduana*.ts`, `sync_banks_news.ts`, `sync_figures.ts`, `sync_costs.ts`, `sync_debt_relief.ts`, `sync_loans.ts`, `sync_predictions.ts`, `sync_explain.ts`, `sync_sheet.ts`, `sync_temas_analysis.ts`. Shared: `config.ts`, `global.ts`, `sentry.ts`.

## Top-level dirs
| dir | role |
|---|---|
| `app/` | Nuxt frontend (separate package, own MongoDB) — see `app/AGENTS.md` |
| `classes/` | backend logic — see `classes/AGENTS.md` |
| `classes/cambios/` | 49 per-casa scraper modules (48 registered in `origins.ts`) — see `classes/cambios/AGENTS.md` |
| `bots/` | Telegram/Discord/Twitter bots — see `bots/AGENTS.md` + `bots/README.md` |
| `mcp/` | open-source MCP server — see `mcp/AGENTS.md`, `mcp/README.md`, `mcp/DEPLOY.md` |
| `tests/` | root vitest backend suite — see `tests/AGENTS.md` |
| `docs/` | `api/ app/ backlinks/ lighthouse/ medium-articles/ research/ seo/ superpowers/` (plans, SEO data, articles) |
| `scripts/` | `deploy-backend.sh` + `oneoff/` (dev one-offs, run via `npm run <name>`) |
| `swagger/` | OpenAPI config (`config.ts`, README) served by the API |
| `interfaces/` | `Cambio.ts` shared TS interface |
| `config/` | `config.ts` |
| `dist/` | root build output (gitignored) |

`classes/` key files: `database.ts` (Mongo connect), `gemini.ts` + `ai_service.ts` (LLM), `appdb.ts` (app-DB bridge), `reddit.ts`, `redis_cache.ts`, `notify.ts`, `cluster.ts` (`isPrimaryInstance()`), `Express/` (server setup), `models/` (mongoose), and per-feature dirs `aduana banks costs debt explain figures loans predictions temas-analysis` (each `refresh.ts`/`store.ts`).

## Build / run / test / lint
- Root: `npm run dev` (API), `npm run build`, `npm test` (`vitest run`, `tests/**/*.test.ts`). One-offs: `npm run prex`, `bcu_backfill`, `get_locations`, etc. (ts-node, in `scripts/oneoff/`, NOT compiled).
- `app/`: `npm run dev`, `npm run build`, `npm test`, `npm run lint`. **`npm run typecheck` is broken** (vue-tsc crashes — use `lint`). Dev restart wipes `.nuxt` → `npx nuxi prepare`.
- No committed `package-lock.json` at root (gitignored); only `app/package-lock.json` is committed. CI/deploy install with `npm install`, never `npm ci`. `app` installs use `--force`, NOT `--legacy-peer-deps` (drops pinia).

## Deploy (push to `main` → `.github/workflows/deploy.yml`)
- **App**: `test` job (app vitest) → `deploy` job SSHes and runs `app/scripts/deploy.sh` (flock + staging build + atomic swap + `pm2 reload`, zero-downtime).
- **Backend**: `changes` path-filter (root `*.ts`, `classes/**`, `ecosystem.config.js`, `tests/**`…) → `backend-test` → `backend-deploy` SSHes and runs `scripts/deploy-backend.sh`. **Builds ON the server** (needs gitignored `sheet_key.json`), stages into `dist_staging`, atomic swap, rolling `pm2 reload currency-server`. Sequenced after app deploy so SSH sessions don't share the git tree.
- New non-server pm2 app must be added to `OTHER_APPS` in `deploy-backend.sh` or it never starts on the VPS (`currency-temas-analysis` is currently absent from that list).

## Non-obvious gotchas
- **currency-server is pm2 cluster ×2 → NO recurring scheduler may live in the API process** (`setInterval`/cron would run once per instance). Guard with `classes/cluster.ts` `isPrimaryInstance()` or (preferred) a separate single-instance pm2 cron app. Tripwire: `tests/no_scheduler_in_api.test.ts`.
- Root vs app use different Mongo hosts/DBs; jobs writing app collections refuse to run without `APP_MONGO_URI`.
- Secrets: `.env` (dotenv), `sheet_key.json`, `serviceAccount.json`, `prex_session.txt`, `proxy.txt` all gitignored/server-only. See `.env.sample` (PREX_* USD scrape, AI_* wormgpt).
- Ignore root scratch junk: `/*.html`, `/*.png`, `*.mp4`, `*.stackdump`, `.sdd-*`, `.superpowers/`, `docs/seo/data/` are gitignored debug artifacts.
- DB-derived casa scrapers (federal/argentino/romantico mirror BROU) false-fail without a live Mongo connection.
- The maintainer keeps a per-feature Claude auto-memory (`MEMORY.md`, outside the repo) with richer page-by-page history than this file.
