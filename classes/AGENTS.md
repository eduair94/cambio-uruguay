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

## Two AI providers, one facade
- **`ai_text.ts` is what features call** — `askText` / `askTextWithImage` / `askStructured`. Claude first, Gemini as automatic fallback. `AI_TEXT_PROVIDER` pins one (useful when reproducing a bad answer: you cannot investigate "it wrote something odd yesterday" without knowing which model wrote it). The provider is resolved ONCE per process so a run does not switch voices halfway.
- **`claude.ts` is the sole owner of the private Claude endpoint** (`tests/claude_endpoint_ownership.test.ts`). It talks to `claude-agent-api` on `127.0.0.1:9310` of the deploy box — Claude Code headless on the maintainer's SUBSCRIPTION, contract in `/root/claude-agent-api/INTEGRACION.md` on that machine. NOT the Anthropic API: no `/v1/messages`, no temperature, no max_tokens.
  - **The quota is a person's**: 200 calls/day shared with their interactive Claude Code. `CLAUDE_AGENT_MIN_REMAINING` (60) makes jobs stand down before eating the last of it.
  - **429/503/504 latch a process-wide flag and are NEVER retried** — the service's own guidance; a retry loop spends real weekly quota to earn another 429.
  - **Replies come back in caveman** (the box's `caveman` plugin hooks `SessionStart` for every API call). `claude.ts` counters it with `appendSystemPrompt` — verified 2026-08-17 that this beats the hook, so no server-side change is needed.
  - `jsonSchema` gives server-enforced structured output; the result arrives as a JSON **string**, not an object.
  - Images: the endpoint has no image field, but it has a `Read` tool and a confined workspace, so `askTextWithImage` writes the file into `CLAUDE_AGENT_WORKSPACES` and tells the agent to open it.
- **NO EMBEDDINGS.** Anthropic ships no embedding endpoint, so `rag/embed.ts` stays on Gemini permanently. Capability gap, not a config choice.

## Gemini — the other provider
- `gemini.ts` = the ONE grounded client (google_search on, returns text + resolved source URIs; callers reject any citation the model didn't actually fetch). `askGrounded`/`askPlain`/`askWithImage`/`embedContents`/`geminiConfigured`. `GEMINI_MODEL` env, default `gemini-2.5-flash-lite` (`gemini-2.5-flash` was retired → 404; one dead id silently took the WHOLE job fleet down). NEVER throws → returns `null` = "no update this cycle". Free-tier pacing via `GEMINI_MIN_INTERVAL_MS`.
- **`tests/gemini_key_ownership.test.ts` forbids any other backend file from naming `generativelanguage.googleapis.com`** — one key read, one pacer, one backoff. `classes/rag/embed.ts` owns the embedding *policy* (model, dims, normalisation, batching) but calls `embedContents` here for the HTTP.
- **Embeddings are metered PER DAY and PER PROJECT, and this project is on the free tier for them**: measured 2026-08-17 against the live API, `EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier` = **1 000/day**, every item inside a `batchEmbedContents` counting as one request (a `generateContent` key that behaves as billed does NOT imply the embedding endpoint is). Consequences baked into the design: stub-tier chunks are never embedded (lexical-only, 1 966 of the 4 275 indexed pages); the chunker packs sibling sections (3 514 → **2 309** embeddable chunks); **`GEMINI_EMBED_KEYS` takes several keys and `embedContents` rotates when one is spent** — per-project quota means a second key is a second 1 000, and this box had two distinct keys while spending one; `sync_rag_index`'s budget is `800 × keys` and converges in two runs; the bot caps queries per run (`REDDIT_BOT_MAX_CANDIDATES`) so it cannot eat the indexer's share.
- On a 429, the naive loop loses the whole run — the next batch fires straight into the same closed window. `embedTexts` waits `RAG_EMBED_COOLDOWN_MS` (45 s) after an all-null batch and retries it once.
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
| `rag/` | site RAG index → APP DB `ragchunks`. `sources`(tier/exclusion rules over the sitemap),`crawl`(cheerio, strips the layout),`chunk`(~1.1k chars + heading path),`embed`(**always L2-normalises**; `gemini-embedding-001` at 768d returns \|v\|≈0.59),`store`(incremental by contentHash, `pruneMissing` refuses to delete >25%),`retrieve`(dense cosine ⊕ BM25, fused by RRF) |
| `redditbot/` | answers UY subreddits. `config`(two gates),`augment`(**researches what the page does NOT cover and verifies the sources**; its findings widen the evidence pool AND become the page's addendum),`filter`(cheap screen + question shape),`judge`(second, independent relevance gate),`compose`,`validate`(**every number must be in the retrieved context OR in the poster's own text**; plus voseo, no bullets, no emoji, no AI filler),`limits`(pure, per day/sub/author/page),`gate`(cosine + margin),`image`(downloads the post's attachment),`ledger`,`post`(user-auth write client),`run`(one answer per run),`watch`(score readback + **anonymous visibility check** — a shadowbanned account sees its own removed comments as normal, so the authored view says "all good" forever — + circuit breaker) |
| `redditbot/social/` | comentarios **sin ningún enlace**, para que la cuenta exista antes de poder promocionar nada. `pick`(qué hilo NO es nuestro + el veto de temas donde una broma ofende + los que piden anécdotas propias, que esta cuenta no tiene),`compose`(elige registro **util/liviano** antes de escribir: un título que pregunta fuerza util),`language`(contesta en el idioma del hilo — media r/AskUruguayan la escriben extranjeros),`validate`(techo de largo por registro; cero enlaces; **primera persona del pasado prohibida en los dos idiomas**),`limits`,`ledger`(**la visibilidad se mide con token ANÓNIMO**: el autor ve sus comentarios borrados como si nada, y de ahí sale qué subs aceptan a la cuenta — mirando los borrados de LOS DOS bots),`run` |
| `redditbot/ask/` | una pregunta por día en r/AskUruguayan. `research`(4 listados del sub + sus reglas + búsqueda web de la actualidad),`novelty`(**Jaccard ⊕ trigramas, sin embeddings**: pedirle originalidad a un modelo sin mostrarle lo publicado devuelve la pregunta que el sub ya contestó tres veces),`compose`(tres candidatas, Opus),`validate`(sin política, sin preguntas de sí/no, título que no se corte en el celular),`reap`(**una hora sin un solo comentario ni voto y el post se borra**: Reddit no da cero —todo post nace con score 1— así que cualquier movimiento cuenta, incluido un voto negativo),`run` |
| `redditbot/disclosure.ts` | la firma con enlace funcional. Va en el POST y NO en los comentarios: en un post propio es honesta y barata, en un comentario la lee un AutoModerator como promoción. Se agrega DESPUÉS de validar, porque la regla es "ningún enlace" y la firma es un enlace |
| `gaps/` | questions the site cannot answer → a page on the live site, AND questions an existing page half-answers → an addendum to it (`enrich`,`publishAddenda` → `app/utils/generated/addenda.ts`, injected by the layout; the page itself is never edited). `cluster`(greedy over cosine),`topics`(the subjects that are ours to answer),`authorPage`(scope → research → **write from the downloaded source text**),`sourceText`(fetch a citation and keep its bytes),`pageSpec`(**every figure must be in that text**),`emit`(data file + wrapper page + nav + i18n, all pure),`workspace`(separate clone; **app lint+tests run before the push**),`publish`(orchestrates, 1 page/run),`research`+`draft`(the fallback when publishing is refused),`refresh` |

## Express + misc
`Express/`: `ExpressSetup.ts` (default `server` export used by index.ts), `Express.ts`, `ExpressCustomSetup.ts`, `Express.interface.ts`. Also here: `ai_service.ts` (AI insights + classify, 44KB), `ai_insight_cache.ts`, `redis_cache.ts` (ioredis), `reddit.ts`, `notify.ts` (Telegram), `rate_source.ts`, `origins.ts`, `ProxyFileService.ts`, `sync_favicon.ts`, `cluster.ts`, `utils.ts`.

## Gotchas
- `sync.ts` sets `NODE_TLS_REJECT_UNAUTHORIZED=0` and `process.exit(1)` even on success (existing quirk — don't "fix" the exit code blindly).
- API process must contain NO scheduled work — the currency-server is a pm2 cluster; `tests/no_scheduler_in_api.test.ts` enforces it. Put timers/crons in a `sync_*.ts`, never in index.ts.
- Deps: axios/cheerio/puppeteer/mongoose/moment-timezone/soap/ioredis/openai. Envs: `MONGODB_URI`, `APP_MONGO_URI`, `GEMINI_API_KEY`/`GEMINI_MODEL`/`GEMINI_MIN_INTERVAL_MS`.
- Deeper: **`classes/cambios/AGENTS.md`** (scrapers), **`tests/AGENTS.md`** (tripwire + parity tests).
