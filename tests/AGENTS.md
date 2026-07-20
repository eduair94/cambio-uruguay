# tests/ — AGENTS

Root **vitest** suite for the Node/Express backend (`index.ts` currency-server API + the root `sync_*.ts`/`import_*.ts` pm2 cron jobs + `classes/`). NOT the Nuxt app — that lives in `app/tests/`.

## Run / gate
- `npm run test` = `vitest run` from repo root. `npm run test:watch` for watch. Node env.
- Config: `vitest.config.ts` (`environment: "node"`, `include: ["tests/**/*.test.ts"]`). 35 files.
- CI gate: `.github/workflows/deploy.yml` job `backend-test` runs `npm test` on push to `main` (path-filtered to `classes/**`, `*.ts` root, `tests/**`, `package.json`, `tsconfig*`); `backend-deploy` `needs: backend-test`, so a red suite blocks the backend self-deploy.
- **No lockfile committed at repo root** (`package-lock.json` is gitignored here; only `app/package-lock.json` is un-ignored) → CI does `npm install`, not `npm ci`. Same for `scripts/deploy-backend.sh`.
- Almost all tests are pure unit: they mock `fetch`/stub deps, no live DB/network. The exceptions are the static tripwires below, which read source files off disk.

## Tripwires (structural tests — a rename/refactor breaks these, not a logic bug)
- **`no_scheduler_in_api.test.ts`** — `index.ts` runs pm2 **cluster mode, 2 instances** (`ecosystem.config.js`). Statically walks `index.ts`'s relative-import graph and bans `setInterval(`, `node-cron`, `cron.schedule(`, `.schedule(` unless nested in `if (isPrimaryInstance())` (`classes/cluster.ts`). An unguarded recurring job runs once PER instance = double Mongo writes / double Telegram/Discord posts / double quota spend. Fix: put the job in its own single-fork pm2 cron app (pattern: `sync_aduana.ts` + `currency-aduana` in `ecosystem.config.js`), or wrap in `isPrimaryInstance()`. `setTimeout(` is allowed (request-scoped abort timers). Asserts graph size >10 (vacuity guard).
- **`sync/connect_tripwire.test.ts`** — every root `sync_*.ts`/`import_*.ts` entrypoint whose import graph touches the DEFAULT mongoose connection (`MongooseServer.getInstance(`) MUST itself call `MongooseServer.startConnectionPromise()` — the only thing that opens it. Miss it and every Mongo op buffers + times out after 10s, silently (jobs catch-and-`exit(0)`; pm2 reports success forever). Required idiom, first in `main()`: `await withTimeout(MongooseServer.startConnectionPromise(), 15000)` then `exit(1)` on failure (bare `startConnectionPromise()` never rejects/times out on its own). The app-Mongo bridge `classes/appdb.ts` is a SEPARATE connection, not policed here. Asserts >5 entrypoints and ≥1 touches Mongo.
- **`gemini_key_ownership.test.ts`** — ONLY `classes/gemini.ts` may reference `generativelanguage.googleapis.com` (walks all repo `.ts`, excluding `node_modules/dist/.git/app/mcp/bots/docs`). One key, one owner — eight ad-hoc callers is how the app shipped the same grounding-redirect bug in 4 places. The **app-side** mirror (Gemini forbidden inside `app/`) is enforced elsewhere: `app/tests/unit/noGeminiInApp.test.ts`, NOT here.
- **`appdb/schema_parity.test.ts`** — backend `PricePredictionModel`/`MoveExplanationModel` must declare EXACTLY the top-level fields of `app/server/models/{PricePrediction,MoveExplanation}.ts`, and collection names must be `pricepredictions`/`moveexplanations`. These are append-only archives: a field the backend forgets is lost forever on every future row.
- **`figures/baseline_parity.test.ts`** — figures baseline must not diverge from the app's unreachable-backend fallback copy. Same shape: `loans/catalog.test.ts` and `banks/entities.test.ts` assert their catalogues cover exactly the ids in `app/utils/{loans,bankTierlist}.ts`.

## Dominant pattern: AI guardrail + refresh-idempotency tests
Most suites exist to prove a hallucinated/ungrounded AI value NEVER ships and a failed re-run never blanks good data:
- **Band guards** (`figures/bands`, `costs/bands`, `debt/caps`): out-of-band / null / NaN / string values are rejected, baseline kept, shared baseline singleton not mutated.
- **Grounding guards** (`aduana/norms`, `loans/gemini`): a proposal is refused unless cited on the fact's OWN official source host, within range, actually retrieved (grounding chunks present); homepage/other-host/off-range citations rejected even if the value happens to match.
- **Refresh idempotency** (`explain/refresh`, `predictions/refresh`): omit `ai`/`narrative` from `$set` when Gemini fails (never write null); never send an update that blanks a same-day row's good narrative on a failed re-run.
- **Spend guards** (`banks/news`): zero Gemini calls when key missing; synthesis called exactly once and only when an entity produced an insight.

## Subdir → coverage
| Path | Covers |
|---|---|
| `tests/aduana/*` (11) | Customs/import self-updating pipeline: `alerts`, `baseline` (verified facts + AI plausibility ranges + denylist + Oct seller-registry date), `classify` (Reddit label aggregation/quoting), `discover` (RG-2026 norm discovery), `gemini` (`geminiConfigured`/`resolveUri` redirect), `harvest` (Reddit), `norms` (`applyProposals` gate), `payload`, `store` (`mergeAduanaDoc` baseline-vs-Mongo precedence), `window` (decree window) |
| `tests/banks/` | `entities` parity vs app tierlist; `news` (`buildBanksBriefing`) |
| `tests/costs/` | `applyCostBands` (cost-of-living live refresh) |
| `tests/couriers/` | Reddit client: auth, token reuse/throttle, no-op without creds, `[]` on outage |
| `tests/debt/` | `applyLiveCaps` usury-cap guardrails |
| `tests/explain/` | `detectMoves`/`attributeMove`/driver series + `recordTodayExplanation` |
| `tests/figures/` | `applyFigureBands` + baseline parity |
| `tests/loans/` | lender catalogue parity; `gemini` (own-site-only rate); `refresh` (regex > Gemini > `ok:false`) |
| `tests/predictions/` | `computePeriodChanges`/`parseAiReply`/`isPredictableCurrencyCode` (drops UI/UR), series anchors, `recordTodayPrediction` |
| `tests/appdb/` | app-Mongo schema parity (tripwire above) |
| `tests/*.ts` (root) | `ai_public_rates` (drop BCU/interbank from AI prompt), `bcu_scraper` (SOAP-primary, HTML fallback), `bcu_soap` (SOAP parsing/date), `bcu_backfill` (`detectGaps`/`chunkDateRange`/`buildUpsertOps`), `gemini` (`askGrounded`/`askPlain`, resolved-uri headlines), `gemini_key_ownership`, `notify` (`notifyAdmin` Telegram) |

## Gotchas
- Static tripwires resolve `.ts` via relative imports only (npm imports skipped by construction). Renaming `index.ts`, a `classes/*` file, or a `sync_*` entrypoint can silently shrink the walked graph — the vacuity guards (`>10`, `>5`) are there to fail loudly instead of rubber-stamping.
- `connect_tripwire` regex is anchored: `^(sync_|import_)[a-z0-9_]*\.ts$` at repo ROOT only. A cron entrypoint placed elsewhere or named differently is NOT policed — keep new jobs at root with this prefix.
- `no_scheduler` brace/comment stripping is a heuristic parser (not a real AST); it assumes `classes/*`/`index.ts` don't put bare `{`/`}` inside template-literal text.
- Deeper context: the maintainer's memory notes `gemini-backend-migration` (why all Gemini moved to `classes/gemini.ts` + the connect tripwire), `backend-deploy-dist` (pm2 cluster / self-deploy), `aduana-self-updating` (the guardrail design the `aduana/` suite encodes).
