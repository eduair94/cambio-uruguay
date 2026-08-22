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
| currency-bankos | dist/sync_bankos.js | 33 8 * * * | snapshots the whole Bankos discount map (reverse-engineered `com.anonymous.bankos`) into APP DB `bankossnapshots` (one upserted row) — the outage fallback for the app's `/api/bankos/discounts` (live-first) behind `/descuentos-con-tarjeta-uruguay`; needs `APP_MONGO_URI`; refuses to overwrite a good snapshot with a thin pull |
| currency-debt-relief | dist/sync_debt_relief.js | 13 10 1 * * | monthly; BCU usury caps |
| currency-bcu-rates | dist/sync_bcu_rates.js | 27 9 * * * | la grilla de tasas medias/topes del BCU (Ley 18.212) para `/adelanto-de-efectivo-tarjeta-de-credito`. **Diario a propósito**: el BCU republica TODOS LOS MESES (ventana trimestral móvil), la tabla rige desde el día 1 y el comunicado sale un día impredecible del mes anterior. Baja y parsea el **PDF oficial** (`unpdf`) — NO usa Gemini: la búsqueda groundeada devolvía la edición de 2022 archivada en la misma URL. Un candidato sólo se almacena si sus seis filas cumplen la aritmética de la ley (tope = media × 1,55, mora × 1,80) y ninguna media se movió más de 50 %; si falla, se conserva el snapshot anterior. Las filas en dólares se arrastran, no se parsean (ver `parse.ts`). bcu.gub.uy no manda las intermedias TLS: van embebidas en `classes/bcurates/certs.ts` |
| currency-temas-analysis | dist/sync_temas_analysis.js | 17 11 * * * | reads app DB, writes backend `temas_analysis_data`; self-gates 90d; needs `APP_MONGO_URI` |
| currency-site-analytics | dist/sync_site_analytics.js | 51 10 * * * | GA4 Data API → APP DB `siteanalyticssnapshots` for /estadisticas-del-sitio; needs `GA4_PROPERTY_ID` + SA (docs/analytics/GA4_DATA_API.md). The page's LIVE block is separate: on-demand `GET /site-analytics-realtime` on currency-server (Redis 45s), so the API process needs the same GA4 env |
| currency-chair-tiers | dist/sync_chair_tiers.js | 31 12 * * 0 | weekly r/CharruaDevs chair tier list → APP DB `chairtiersnapshots` |
| currency-chairs-hourly | dist/sync_chairs.js --fast | 23 * * * * | hourly price-only refresh (ML + Shopify; no LLM, no Reddit, no Fenicio sweep) |
| currency-chairs | dist/sync_chairs.js | 41 11 * * * | daily desk-chair market: ML (:9656) + UY storefronts + FB Marketplace (:9657) → APP DB `chaircatalogproducts` |
| currency-rentals | dist/sync_rentals.js | 52 4 * * * | directorio de alquileres de `/alquileres-uruguay`: ML (:9656, respuesta **cruda** — la recortada no trae dirección ni dormitorios) + InfoCasas (su `__NEXT_DATA__`) + FB Marketplace (:9657) -> APP DB `rentallistings`/`rentalmetas`. Una fila por **propiedad**: unifica el mismo inmueble publicado en varios portales (calle+número+dormitorios+m²±15%+precio±7%; sin dirección hace falta barrio+dormitorios+precio±5%). **La dirección sola nunca alcanza**: un edificio de ocho apartamentos son ocho avisos en el mismo número. Gallito NO está (WebForms con postback del lado del cliente). Ver `docs/app/RENTALS.md` |
| currency-rentals-hourly | dist/sync_rentals.js --fast | 47 * * * * | repaso de lo recién publicado (`order=3` / `since=today`); **nunca poda** — ve una franja del mercado, y "no está en la franja" no prueba nada |
| currency-rag-index | dist/sync_rag_index.js | 20 4 * * * | crawls the public sitemap → chunks → Gemini embeddings → APP DB `ragchunks`; incremental by content hash |
| currency-reddit-bot | dist/sync_reddit_bot.js | 6 * * * * | **SOLO COMENTA** (nunca abre hilos: `post.ts` se niega sin `REDDIT_BOT_ALLOW_POSTS=1`). Por hora, ventana de **168 h**, hasta 5 comentarios por corrida durmiendo entre uno y otro, 25/día y 8 por sub. El enfriamiento por página está apagado a propósito y lo reemplaza "no repetir página dentro de una corrida" en `run.ts`. Calla 03–10 UTC. Los 7 subs de la lista son TODOS los subs uruguayos vivos (28 medidos), y sólo 4 son escribibles: `subrules.ts` frena r/AskUruguayan (ban) y r/CharruaDevs (reglas). La aclaración de bot vive en la BIO y `identity.ts` la exige antes de publicar. **Inerte hasta `REDDIT_BOT_ENABLED=1` AND `REDDIT_BOT_DRY_RUN=0`** |
| currency-reddit-bot-watch | dist/sync_reddit_bot_watch.js | 9 * * * * | reads back comment scores; trips a 48 h circuit breaker on 3 negatives/24 h |
| currency-reddit-stats | dist/sync_reddit_stats.js | 48 */3 * * * | agrega el ledger del bot en APP DB `redditbotstats` para /estadisticas-reddit. Los `days` se **mezclan** con lo guardado, no se recalculan: el ledger es memoria operativa y el histórico no puede depender de que nadie lo limpie. 39 min después del watcher, que es quien actualiza votos y estado |
| currency-content-gaps | dist/sync_content_gaps.js | 35 5 * * * | clusters unanswered questions → grounded DRAFT in `docs/reddit-gaps/` (never a page) |
| currency-videos | dist/sync_videos.js | 26 */6 * * * | reads the public YouTube **Atom feed** (no API key, no quota) of the curated channels in `classes/videos/channels.ts` -> APP DB `videossnapshots` for /videos-de-economia-uruguay + its 13 per-topic pages; needs `APP_MONGO_URI`; refuses to overwrite a good snapshot with an empty or half-dead run |
| currency-regional | dist/sync_regional.js | */10 * * * * | el tablero regional de `/cotizaciones-de-la-region` y `GET /regional`: **21 fuentes públicas** en AR/BR/PY/CL/BO (5 bancos centrales) unidas al tablero uruguayo propio. Argentina tiene **siete dólares simultáneos** y Brasil un fixing legal (PTAX) más un mostrador (turismo) que difiere ~6,5 %: por eso cada fila lleva `kind` y nada se promedia entre mercados. Escribe TRES cosas: el snapshot, un punto diario por mercado y **una fila por cada cambio de precio, sin umbral mínimo** (`regional_changes`, servido por `GET /regional/changes`) — la fila diaria se sobrescribe, así que lo que pasa adentro del día sólo existe en el ledger, y su resolución ES este intervalo. `validate.ts` filtra por forma, banda, consenso (20 % entre relevamientos, **3 % entre referencias mid-market**), coherencia contra las patas en dólares y contraste de la referencia internacional contra el propio país; **publica lo descartado** en `rejected`. El BCP no tiene API (403 tras Cloudflare) y se lee de sus dos páginas server-rendered. Ver `docs/api/REGIONAL.md` |
| currency-regional-history | dist/sync_regional.js --backfill | 9 5 * * * | mismo entrypoint: además baja las series que el publicador entrega entera (7 dólares argentinos desde 2011, **referencia BCRA desde 1996**, **PTAX desde el Plano Real** —antes es otra moneda—, dólar observado chileno **desde 1984**) y recorre los dos archivos que sólo contestan de a un día: el del BCP (`?fecha=dd/mm/yyyy`, desde 2014) y **nuestra propia colección diaria uruguaya desde 2022-12-28**, con presupuesto por corrida y salteando lo ya guardado. Inserta por (key, day). **La SGS del BCB rechaza ventanas de más de 10 años devolviendo vacío**, indistinguible de "no hay serie": `sgsWindows()` parte el rango. El BCP contesta un domingo con el promedio del viernes bajo el encabezado del domingo: sólo se guarda una fila con hora |
| currency-mcp | mcp/dist/index.js (cwd ./mcp) | — | HTTP :8788 |
| currency-bot-telegram / -discord | bots/dist/entries/{telegram,discord}.js | — | read `bots/.env` |
| currency-daily | bots/dist/entries/daily_report.js | 0 12 * * * | |
| currency-alerts | bots/dist/entries/alert_check.js | */15 11-21 * * * | intraday move alerts |
| currency-content-promo | bots/dist/entries/content_promo.js | 0 14 * * 1,3,5 | one evergreen guide to X; **inert until `CONTENT_PROMO_ENABLED=1`** in `bots/.env` |

Root pm2 entrypoints live at repo root: `index.ts`, `sync.ts`, `sync_aduana*.ts`, `sync_banks_news.ts`, `sync_figures.ts`, `sync_costs.ts`, `sync_debt_relief.ts`, `sync_loans.ts`, `sync_predictions.ts`, `sync_explain.ts`, `sync_sheet.ts`, `sync_site_analytics.ts`, `sync_temas_analysis.ts`, `sync_rag_index.ts`, `sync_reddit_bot.ts`, `sync_reddit_bot_watch.ts`, `sync_content_gaps.ts`, `sync_videos.ts`, `sync_bcu_rates.ts`, `sync_rentals.ts`, `sync_regional.ts`. Shared: `config.ts`, `global.ts`, `sentry.ts`.

## Top-level dirs
| dir | role |
|---|---|
| `app/` | Nuxt frontend (separate package, own MongoDB) — see `app/AGENTS.md` |
| `classes/` | backend logic — see `classes/AGENTS.md` |
| `classes/cambios/` | 53 per-casa scraper modules + shared DolarAhora parser (47 active keys in `origins.ts`) — see `classes/cambios/AGENTS.md` |
| `bots/` | Telegram/Discord/Twitter bots — see `bots/AGENTS.md` + `bots/README.md` |
| `mcp/` | open-source MCP server — see `mcp/AGENTS.md`, `mcp/README.md`, `mcp/DEPLOY.md` |
| `tests/` | root vitest backend suite — see `tests/AGENTS.md` |
| `docs/` | `analytics/ api/ app/ backlinks/ lighthouse/ medium-articles/ research/ seo/ superpowers/` (plans, SEO data, articles; `analytics/GA4_DATA_API.md` = GA4 read-path setup) |
| `scripts/` | `deploy-backend.sh` + `oneoff/` (dev one-offs, run via `npm run <name>`) |
| `swagger/` | OpenAPI config (`config.ts`, README) served by the API |
| `interfaces/` | `Cambio.ts` shared TS interface |
| `config/` | `config.ts` |
| `dist/` | root build output (gitignored) |

`classes/` key files: `database.ts` (Mongo connect), `gemini.ts` + `ai_service.ts` (LLM), `appdb.ts` (app-DB bridge), `reddit.ts`, `redis_cache.ts`, `notify.ts`, `cluster.ts` (`isPrimaryInstance()`), `Express/` (server setup), `models/` (mongoose), and per-feature dirs `aduana banks bcurates costs debt explain figures gaps loans predictions rag redditbot regional rentals site-analytics temas-analysis` (each `refresh.ts`/`store.ts`).

## Build / run / test / lint
- Root: `npm run dev` (API), `npm run build`, `npm test` (`vitest run`, `tests/**/*.test.ts`). One-offs: `npm run prex`, `bcu_backfill`, `get_locations`, etc. (ts-node, in `scripts/oneoff/`, NOT compiled).
- `app/`: `npm run dev`, `npm run build`, `npm test`, `npm run lint`. **`npm run typecheck` is broken** (vue-tsc crashes — use `lint`). Dev restart wipes `.nuxt` → `npx nuxi prepare`.
- No committed `package-lock.json` at root (gitignored); only `app/package-lock.json` is committed. CI/deploy install with `npm install`, never `npm ci`. `app` installs use `--force`, NOT `--legacy-peer-deps` (drops pinia).

## Deploy (push to `main` → `.github/workflows/deploy.yml`)
- **App**: `changes` path-filter (`app/**`) → `test` job (app vitest) → `deploy` job SSHes and runs `app/scripts/deploy.sh` (flock + staging build + atomic swap + `pm2 reload`, zero-downtime). **A push that touches no file under `app/` does NOT redeploy the frontend** — the `nuxt build` on the server is ~5 min and 17 of the 20 commits before `43f5861` touched zero app files. Safe only because `app/` is self-contained (no workspaces, no `file:` deps, no alias out of `app/`): if you ever make the Nuxt build read something outside `app/`, widen the `app` filter in `deploy.yml` FIRST — the failure mode is a change that silently never reaches production. `workflow_dispatch` bypasses the filter and always deploys (escape hatch for forcing a rebuild).
- **Backend**: `changes` path-filter (root `*.ts`, `classes/**`, `ecosystem.config.js`, `tests/**`…) → `backend-test` → `backend-deploy` SSHes and runs `scripts/deploy-backend.sh`. **Builds ON the server** (needs gitignored `sheet_key.json`), stages into `dist_staging`, atomic swap, rolling `pm2 reload currency-server`. Sequenced after app deploy so SSH sessions don't share the git tree.
- New non-server pm2 app must be added to `OTHER_APPS` in `deploy-backend.sh` or it never starts on the VPS.

## Non-obvious gotchas
- **currency-server is pm2 cluster ×2 → NO recurring scheduler may live in the API process** (`setInterval`/cron would run once per instance). Guard with `classes/cluster.ts` `isPrimaryInstance()` or (preferred) a separate single-instance pm2 cron app. Tripwire: `tests/no_scheduler_in_api.test.ts`.
- Root vs app use different Mongo hosts/DBs; jobs writing app collections refuse to run without `APP_MONGO_URI`.
- Secrets: `.env` (dotenv), `sheet_key.json`, `serviceAccount.json`, `prex_session.txt`, `proxy.txt` all gitignored/server-only. See `.env.sample` (PREX_* USD scrape, AI_* wormgpt).
- Ignore root scratch junk: `/*.html`, `/*.png`, `*.mp4`, `*.stackdump`, `.sdd-*`, `.superpowers/`, `docs/seo/data/` are gitignored debug artifacts.
- DB-derived casa scrapers (federal/argentino/romantico mirror BROU) false-fail without a live Mongo connection.
- The maintainer keeps a per-feature Claude auto-memory (`MEMORY.md`, outside the repo) with richer page-by-page history than this file.
