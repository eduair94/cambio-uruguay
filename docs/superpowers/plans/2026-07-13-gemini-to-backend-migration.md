# Gemini → root Express backend: migration plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every call to Gemini leaves the Nuxt app and lands in the root Express backend. After this plan, `app/` contains zero Gemini code, zero Gemini key, and zero scheduled task that spends a Gemini call. The key lives only in the root `.env` as `GEMINI_API_KEY` (it is already there).

**Architecture:** One shared grounded-Gemini client (`classes/gemini.ts`) that the customs feature already proved. Each migrated feature becomes: a `classes/<feature>/*` module + its own **pm2 cron app** (never the API process — it runs 2 cluster instances) + a public `GET` route + a **thin cached nitro proxy** in the app that holds no business logic and falls back to a baseline so the page never blanks. Two features (price predictions, move explanations) already persist to the **Nuxt app's Mongo database**; for those the backend job writes the *same collections* through a second connection, so their history is never moved and never lost, and the app's read routes keep working untouched.

**Tech Stack:** TypeScript, Express, Mongoose (`MongooseServer`), pm2 cron apps, `classes/ai_service.ts` (OpenAI-compatible, for non-Gemini fallback narratives), axios, vitest (root + app), Nuxt 3 / Nitro, Playwright.

---

## Global Constraints

- **The rule:** the Gemini API key lives only in the root `.env` as `GEMINI_API_KEY`. Anything that uses Gemini belongs in the API repo, not in `app/`. `NUXT_GEMINI_API_KEY` is deleted from `app/.env` and from `app/nuxt.config.ts`'s `runtimeConfig` **only in Task 11**, once nothing in `app/` reads it.
- **The reference architecture is the customs feature. Read it before Task 1 and copy its shape:** `classes/aduana/gemini.ts`, `classes/aduana/store.ts`, `sync_aduana.ts`, the `currency-aduana` block in `ecosystem.config.js`, `server.getJson("aduana", …)` + its swagger block in `index.ts` (line 1359), and the Nuxt side `app/server/api/aduana.get.ts` + `app/server/utils/aduanaFallback.ts`.
- **Do NOT touch the aduana feature.** Task 1 generalises `classes/aduana/gemini.ts` by moving its body to `classes/gemini.ts` and leaving a re-export shim in place. `classes/aduana/*` imports, `tests/aduana/*.test.ts` and `sync_aduana.ts` must all keep passing **unchanged**.
- **Do NOT touch `classes/couriers/`.** A concurrent session owns it. (It does not exist on this branch yet — do not create it, do not reference it.)
- **The API runs pm2 CLUSTER mode with 2 instances** (`ecosystem.config.js` → `currency-server`). **No scheduled work may live in the API process** — it would run twice. `tests/no_scheduler_in_api.test.ts` is the tripwire and it must stay green. Every new job in this plan is its own `autorestart: false` + `cron_restart` **fork** pm2 app, exactly like `currency-aduana`.
- **`currency-sync` runs `*/5 * * * *`.** Every new cron minute in this plan is therefore **not a multiple of 5**. The Reddit-harvesting jobs to stay clear of: `currency-aduana` (`30 9 * * 1`, backend) and the nitro task `reddit:sentiment` (`10 10 * * *`).
- **The two Mongo databases are NOT the same** (verified locally, Task 0 verifies prod):
  - root backend → `MONGODB_URI` … `/cambio-uy` (host `147.93.146.232:27017`)
  - Nuxt app → `MONGO_URI` … `/cambio-uruguay` (host `localhost:27017` locally)
  `classes/database.ts:370` reads `process.env.MONGODB_URI`; `app/server/utils/db.ts` reads `useRuntimeConfig().mongoUri`. A backend job that "just writes PricePrediction" writes it to the **wrong database**. Tasks 7–9 solve this with an explicit second connection (`classes/appdb.ts`, env `APP_MONGO_URI`), never by copying the ledger.
- **`MongooseServer.updateOne(filter, update)` bakes in `upsert: true`** and strips the filter's keys from the update before sending it (see `classes/database.ts`, and the comment in `classes/aduana/store.ts:80`). **`updateOneRaw` does not exist** — do not call it.
- **The root and the app are separate TS programs and cannot import across.** (`tsconfig` excludes `app/`; pulling it in would move tsc's common source root and relocate `dist/index.js`, breaking every pm2 path.) Where a constant must exist on both sides, the backend gets a copy and a **drift-guard test reads the app file as text** — the technique already proven in `tests/aduana/baseline.test.ts`.
- **Where a baseline can stay in the app instead of being copied, it stays in the app.** The backend owns the *Gemini call, the guardrail bands, the validation and the store*; it returns only the **validated live figures**. The proxy applies them to the catalogue the page already imports (`COST_MODEL`, `DEBT_RELIEF_BASELINE`, `LENDERS`). Applying validated overrides is not Gemini logic and it is the one thing the proxy is allowed to do.
- **CI deploys the app BEFORE the backend.** `.github/workflows/deploy.yml` → `backend-deploy` has `needs: [backend-test, changes, deploy]`, and `deploy` is the app job. So on a single push that both deletes a nitro task and adds a pm2 cron app, there is a window where neither runs. That window is minutes long and every page falls back to its baseline — acceptable, but **each feature task therefore ships as TWO commits (backend first, then app), and you push the backend commit and verify its endpoint before pushing the app commit.**
- **`scripts/deploy-backend.sh` has a hardcoded list of pm2 apps to register:** `OTHER_APPS=(currency-sync currency-aduana currency-sheet)`. **A new pm2 app that is not added to that array is never started on the VPS.** Every task that adds a pm2 app also adds it there.
- **The backend build happens on the VPS**, not in CI (`npm run build` needs the gitignored `sheet_key.json`). The app's `runtimeConfig` is **baked at `nuxt build` time** — a raw `process.env` read is empty at pm2 runtime. Removing `NUXT_GEMINI_API_KEY` only takes effect after the next app build.
- **Never regress the grounding gate.** `classes/aduana/gemini.ts#resolveUri` resolves Google's `vertexaisearch.cloud.google.com/grounding-api-redirect/...` wrapper to the real URL via the **first** redirect's `Location` header (`maxRedirects: 0`), and returns `null` — never the wrapper, never a `https://<web.title>` guess — when it cannot. The app's `extractGroundedHeadlines` does the opposite: it trusts `web.title` as the domain and publishes the **wrapper URI** as the link. The migrated client keeps the strict behaviour; see Task 1.
- Commit after every task. Conventional Commits.

---

## Verified inventory (read from the code, 2026-07-13)

**Every module that reaches Gemini.** There is **no shared caller today** — each of these eight modules inlines its own `$fetch` to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` and reads `useRuntimeConfig().geminiApiKey`. The only shared thing is the *pure parser* `app/utils/geminiGrounding.ts` (no key, no network).

| # | Module (`app/server/utils/`) | Route that serves it | Scheduled task | Where it persists TODAY |
|---|---|---|---|---|
| 1 | `banksNews.ts` | `GET /api/banks-news` (cached 24 h / stale 7 d) | **none** — on-demand | **nothing.** Only the nitro route cache. |
| 2 | `uyFiguresLive.ts` | `GET /api/uy-figures` | `figures:daily` (`50 9 * * *`) | nitro `useStorage('figures')` → keys **`live`** and **`watchdog`** → fs `app/.data/figures/` |
| 3 | `costOfLivingLive.ts` | `GET /api/cost-of-living` | `costs:daily` (`40 9 * * *`) | nitro `useStorage('costs')` → key **`live`** → fs `app/.data/costs/` |
| 4 | `debtReliefLive.ts` | `GET /api/debt-relief` | `debt-relief:monthly` (`10 10 1 * *`) | nitro `useStorage('debt-relief')` → key **`live`** → fs `app/.data/debt-relief/` |
| 5 | `loanGeminiRate.ts` ← `loanRateRefresh.ts` → `loanRatesStore.ts` | `GET /api/prestamos` (also lazily refreshes when > 2 days stale) | `loans:scrape` (`45 8 * * *`) | nitro `useStorage('loans')` → key **`rates.json`** → fs `app/.data/loans/rates.json` (`rates` + **`history`**, one entry per lender per day) |
| 6 | `externalForecasts.ts` | `GET /api/predictions/[currency]` | `predictions:daily` (`20 9 * * *`) | **app Mongo** — `PricePredictionModel.externalForecasts` |
| 7 | `pricePrediction.ts` (`fetchAiAnalysis` + calls #6) | `GET /api/predictions/[currency]`, `POST /api/predictions/ingest` | `predictions:daily` | **app Mongo** — `pricepredictions`, unique index `(currency, date)` |
| 8 | `geminiNews.ts` ← `moveExplanation.ts` | `GET /api/analysis/[currency]` (reads via `analysis.ts`) | `drivers:daily` (`15 9 * * *`) — **third stage only** | **app Mongo** — `moveexplanations`, `(currency, date)`; also written by hand via `POST /api/analysis/backfill` |

**Pages that consume it:** `/herramientas/costo-de-vida` (#3) · `/salud-financiera` (#2) · `/saldar-deudas-uruguay` (#4) · `/mejores-bancos-uruguay` (#1) · `/prestamos-uruguay` (#5) · `/historico` via `components/PricePredictionCard.vue` (#6, #7) · `/historico/[origin]/[currency]/[[type]]` and `/por-que-sube-el-dolar` via `/api/analysis/:currency` (#8).

**Things the task brief assumed that are NOT true — verified:**
1. **`blog:daily` does not use Gemini.** `app/server/utils/blog.ts` imports `generateChat` from `server/utils/ai.ts` (the OpenAI-compatible wormgpt endpoint). It is **out of scope** and must not be touched.
2. **`geminiNews.ts` is not a shared caller.** It is one of eight peers. There is nothing to "swap out" centrally; each module is migrated whole.
3. **`loans:scrape` was missing from the brief's task list** and it does spend Gemini calls (`loanGeminiRate.ts` is the fallback leg of `loanRateRefresh.ts`). It is in scope.
4. **Not everything persists through `useStorage`.** #6/#7/#8 persist to the **Nuxt app's Mongo**, in a **different database** from the backend's (see Global Constraints).
5. **`ecosystem.config.js` has no `currency-couriers` app and `classes/couriers/` does not exist on this branch.** The comments in `sync_aduana.ts` / `ecosystem.config.js` referring to a daily courier Reddit harvest at 08:15 describe the *nitro* task `couriers:scrape`, not a backend job.
6. **`banksNews.ts` has no persistence at all.** Migrating it to a cron job + a store is a strict improvement (today, the first visitor after a cache expiry pays ~36 Gemini calls in-request).

**Data continuity — what can and cannot be regenerated:**

| Feature | Stored data | Regenerable? |
|---|---|---|
| banks-news | none | n/a |
| uy-figures | `figures/live` (one snapshot) | **Yes** — next cron rewrites it. `figures/watchdog` (Telegram-dedupe key) stays in nitro anyway (Task 3). |
| cost-of-living | `costs/live` (one snapshot) | **Yes** |
| debt-relief | `debt-relief/live` (one snapshot) | **Yes** |
| lender TEAs | `loans/rates.json` → `history[lenderId][]`, **one entry per lender per day** | **NO.** A daily TEA time-series cannot be re-derived. → one-shot import script, Task 6. |
| price predictions | `pricepredictions`, one doc per `(currency, date)` | **NO.** You cannot ask Gemini today what it would have said on 2026-03-04. This is a **prediction ledger**; its whole future value is scoring past forecasts. → never moved: the backend writes the same collection (Tasks 7–8). |
| move explanations | `moveexplanations`, one doc per `(currency, date)`, **including human-researched historical backfills** written through `POST /api/analysis/backfill` | **NO.** Same reasoning, plus the backfilled rows are hand-researched with real citations. → never moved (Tasks 7, 9). |

---

## What must NOT be touched

- **`app/nuxt.config.ts`'s non-Gemini scheduled tasks**, all of which stay exactly as they are: `blog:daily`, `newsletter:daily`, `alerts:check`, `telegram:summary`, `couriers:scrape`, `withdraw:iva-check`, `casas:reviews`, `reddit:sentiment`. `drivers:daily` **stays too** — it loses only its third stage (Task 9); its driver ingest and news archive are not Gemini.
- The `blog`, `couriers`, `withdraw`, `casas-reviews` and `figures` nitro storage mounts. (Only `costs`, `debt-relief` and `loans` are removed, and only after their data is migrated or declared regenerable.)
- The whole **aduana** feature, including `tests/aduana/*`.
- **`classes/couriers/*`** — a concurrent session owns it.
- `app/utils/costOfLiving.ts`, `app/utils/debtRelief.ts`, `app/utils/loans.ts`, `app/utils/bankTierlist.ts` — these are page catalogues, they stay in the app, and the proxies keep using them as the fallback.

---

## File Structure

**Root backend (new):**
- `classes/gemini.ts` — the shared grounded client (`askGrounded`, `askPlain`, `geminiConfigured`, `groundedHeadlines`).
- `classes/appdb.ts` — a second mongoose connection to the **Nuxt app's** database (`APP_MONGO_URI`).
- `classes/models/PricePrediction.ts`, `classes/models/MoveExplanation.ts`, `classes/models/DriverSnapshot.ts`, `classes/models/PriceNews.ts` — mirrors of the app's schemas, bound to `appdb`.
- `classes/banks/{entities,news,store}.ts` + `sync_banks_news.ts`
- `classes/figures/{bands,refresh,store}.ts` + `sync_figures.ts`
- `classes/costs/{bands,refresh,store}.ts` + `sync_costs.ts`
- `classes/debt/{bands,refresh,store}.ts` + `sync_debt_relief.ts`
- `classes/loans/{catalog,scraper,gemini,refresh,store}.ts` + `sync_loans.ts` + `import_loan_history.ts` (one-shot)
- `classes/predictions/{series,prompt,refresh}.ts` + `sync_predictions.ts`
- `classes/explain/{moves,attribution,refresh}.ts` + `sync_explain.ts`
- `tests/gemini.test.ts`, `tests/banks/*`, `tests/figures/*`, `tests/costs/*`, `tests/debt/*`, `tests/loans/*`, `tests/predictions/*`, `tests/explain/*`, `tests/gemini_key_ownership.test.ts`

**Root backend (modified):**
- `classes/aduana/gemini.ts` → becomes a 4-line re-export shim.
- `index.ts` — 5 new `server.getJson` routes + swagger blocks.
- `ecosystem.config.js` — 7 new pm2 cron apps.
- `scripts/deploy-backend.sh` — `OTHER_APPS` array.
- `package.json` — `sync_*` scripts.

**Nuxt app (rewritten as thin proxies):**
- `app/server/api/banks-news.get.ts`, `cost-of-living.get.ts`, `debt-relief.get.ts`, `uy-figures.get.ts`, `prestamos.get.ts`
- `app/server/utils/{banksNewsFallback,uyFiguresFallback,costsMerge,debtReliefMerge,loansMerge}.ts`
- `app/server/tasks/figures/drift.ts` (new, **non-Gemini**: keeps the drift watchdog)

**Nuxt app (deleted):**
- `app/server/utils/{banksNews,uyFiguresLive,costOfLivingLive,debtReliefLive,loanGeminiRate,loanRateRefresh,loanRatesStore,loanScraper,externalForecasts,pricePrediction,geminiNews,moveExplanation}.ts`
- `app/utils/geminiGrounding.ts` (+ `app/tests/unit/geminiGrounding.test.ts`)
- `app/server/tasks/{costs/daily,figures/daily,debt-relief/monthly,predictions/daily,loans/scrape}.ts`
- `app/server/api/predictions/ingest.post.ts`
- `app/tests/unit/{loanGeminiRate,loanRateRefresh,loanRatesStore,externalForecasts,pricePrediction,debtReliefLive}.test.ts` (replaced by root tests + proxy tests)

---

### Task 0: Recon — prove the Mongo topology before writing a line

No code. Tasks 7–9 are built on an assumption that, if wrong, silently writes the prediction ledger into the wrong database. Prove it first.

**Files:** none. Record the answers in this document's Task 0 checklist (edit it in place).

- [x] **Step 1: Read the two connection strings** — **LOCAL ONLY, no VPS access this session.**

Ran, against the local checkout's env files (`.env` at repo root, `app/.env`), the same host/db extraction the VPS command performs (adjusted to also handle the `mongodb://` scheme prefix and an optional `user:pass@` segment, which the brief's one-liner assumes away):

```
root MONGODB_URI  → host=147.93.146.232:27017  db=cambio-uy
app  MONGO_URI    → host=localhost:27017        db=cambio-uruguay
```

`classes/database.ts:370` reads `process.env.MONGODB_URI` (confirmed by grep). `app/nuxt.config.ts:711` bakes `process.env.MONGO_URI` into `runtimeConfig.mongoUri`, read by `app/server/utils/db.ts:8`. Matches the plan's Global Constraints exactly: **the two URIs are different hosts and different database names**, confirmed from the local checkout.

**NOT PROVEN:** the VPS's actual `.env` / `app/.env` values. This session was explicitly scoped to no production credentials and no VPS access, so the `ssh -p 2223 root@104.234.204.107 …` command in this step was never run. The app's local `MONGO_URI` points at `localhost:27017`, which is a dev-only value — the VPS's real app Mongo host is unknown to me and must be confirmed by whoever runs Tasks 7–9 (or before trusting this doc for that work).

- [ ] **Step 2: Confirm the collections actually hold the ledger** — **NOT PROVEN, no VPS/production Mongo access.**

Could not run the `mongosh` count query against production. No local substitute exists (the local dev Mongo, if any, would not hold the real prediction ledger). **This must be run for real before Task 8** by someone with VPS access; until then, "counts may only ever go up" has no baseline number to check against.

- [x] **Step 3: Confirm both repos live on the same box** — **proved architecturally from the deploy scripts, not from the live VPS filesystem.**

`scripts/deploy-backend.sh:46` computes `REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"` (its own repo root) and is invoked as `cd /root/cambio-uruguay && bash scripts/deploy-backend.sh`. `app/scripts/deploy.sh:18-19` computes `APP_DIR` as its own parent, then `REPO_DIR="$(cd "$APP_DIR/.." && pwd)"` — i.e. `app/` is a subdirectory of the same backend repo checkout, not a separate clone. This is a structural (monorepo-nesting) guarantee, not a race: as long as both scripts are invoked the way their own headers document, "same box, same filesystem" follows from `app/` being nested inside the backend's working tree. Locally, `app/.data/loans/rates.json` exists in this worktree's `app/` subdirectory, consistent with that layout.

**NOT PROVEN:** that the VPS's `/root/cambio-uruguay/app/.data/loans/rates.json` actually exists (i.e. that a real deploy has populated it there, and that no VPS-side symlink/mount trickery breaks the "same filesystem" assumption). Requires VPS access to confirm literally.

- [x] **Step 4: Decide `APP_MONGO_URI`** — **decision recorded, NOT applied to any `.env` file.**

Per Step 1's local evidence, the two URIs are host- and db-distinct (not identical), so `APP_MONGO_URI` is a genuine second connection, not a same-place duplicate. The value to use, when this is wired up: **copy `app/.env`'s `MONGO_URI` verbatim** into the root `.env` as `APP_MONGO_URI` (both locally and on the VPS), with the comment block from the brief. I did **not** write this key into any `.env` file in this session, for two reasons: (a) this worktree (`.claude/worktrees/aduana-problemas`) has **no `.env` or `app/.env` at all** — they exist only in the main checkout (`C:\Users\airau\Documents\GitHub\cambio-uruguay`), which is outside this task's scope and shared with concurrent sessions; (b) writing it locally without also writing it on the VPS (which I cannot reach) would leave the two environments out of sync, which is exactly the kind of silent drift this task exists to prevent. **Action item for whoever implements Tasks 7–9:** add `APP_MONGO_URI` to the root `.env` in the main checkout and on the VPS, using the exact value of `app/.env`'s `MONGO_URI`, before `classes/appdb.ts` is written.

---

### Task 1: The shared grounded Gemini client

**Files:**
- Create: `classes/gemini.ts`
- Modify: `classes/aduana/gemini.ts` (becomes a shim)
- Test: `tests/gemini.test.ts`

**Interfaces:**
- Produces: `geminiConfigured(): boolean`; `askGrounded(prompt: string): Promise<GroundedReply | null>`; `askPlain(prompt: string, timeoutMs?: number): Promise<string | null>`; `groundedHeadlines(reply: GroundedReply, limit?: number): GroundedHeadline[]`.
- `interface GroundedReply { text: string; sourceUris: string[]; chunks: GroundingChunk[]; supports: GroundingSupport[] }`
- `interface GroundedHeadline { title: string; source: string; link: string }`
- Consumed by: `classes/aduana/norms.ts` (unchanged — it only reads `text` + `sourceUris`), and every feature in Tasks 2–9.

**Decision: generalise `classes/aduana/gemini.ts`, do not write a second client.** Its body is already the right contract — grounded, key from `process.env`, `null` on every failure, never throws, and (uniquely) it *resolves Google's redirect wrappers* so a citation the model never opened cannot pass as grounding. Writing a second client would mean two places to get that wrong. It moves to `classes/gemini.ts`; `classes/aduana/gemini.ts` stays as a re-export so `classes/aduana/norms.ts`, `sync_aduana.ts` and `tests/aduana/gemini.test.ts` keep working **without a single edit**.

Two things are **added** (purely additive — nothing aduana reads changes):
1. `GroundedReply` gains `chunks` and `supports`. `askGrounded` throws them away today; `banksNews`, `externalForecasts` and `loanGeminiRate` all need them to build cited headlines.
2. `groundedHeadlines()` — the port of `app/utils/geminiGrounding.ts#extractGroundedHeadlines`, with **one deliberate behaviour change**: `link` is the **resolved** URL, not the `vertexaisearch` wrapper, and a chunk whose redirect did not resolve is **dropped**. Today every "source" link the app publishes is a Google redirect wrapper, and `loanGeminiRate`'s host check trusts `web.title` — which `classes/aduana/gemini.ts`'s own comment calls out as "not verified, and not a security boundary".

- [ ] **Step 1: Write the failing test**

Create `tests/gemini.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const post = vi.fn();
const get = vi.fn();
vi.mock("axios", () => ({ default: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) } }));

import { askGrounded, askPlain, geminiConfigured, groundedHeadlines } from "../classes/gemini";

const reply = (text: string, chunks: unknown[], supports: unknown[] = []) => ({
  data: {
    candidates: [
      { content: { parts: [{ text }] }, groundingMetadata: { groundingChunks: chunks, groundingSupports: supports } },
    ],
  },
});

describe("classes/gemini", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
    process.env.GEMINI_API_KEY = "k";
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.NUXT_GEMINI_API_KEY;
  });

  it("is configured from GEMINI_API_KEY, and still from NUXT_GEMINI_API_KEY", () => {
    expect(geminiConfigured()).toBe(true);
    delete process.env.GEMINI_API_KEY;
    expect(geminiConfigured()).toBe(false);
    process.env.NUXT_GEMINI_API_KEY = "legacy";
    expect(geminiConfigured()).toBe(true);
  });

  it("returns the text, the RESOLVED source uris, and the raw chunks/supports", async () => {
    post.mockResolvedValue(
      reply("hola", [{ web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/A", title: "bcu.gub.uy" } }])
    );
    get.mockResolvedValue({ headers: { location: "https://www.bcu.gub.uy/tasas" }, status: 302 });

    const out = await askGrounded("p");

    expect(out!.text).toBe("hola");
    expect(out!.sourceUris).toEqual(["https://www.bcu.gub.uy/tasas"]); // never the wrapper
    expect(out!.chunks).toHaveLength(1);
  });

  it("builds headlines whose link is the RESOLVED url, and drops a chunk that never resolved", async () => {
    post.mockResolvedValue(
      reply(
        "El BCU subió la tasa.",
        [
          { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/A", title: "bcu.gub.uy" } },
          { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/B", title: "elpais.com.uy" } },
        ],
        [{ segment: { text: "El BCU subió la tasa.", endIndex: 20 }, groundingChunkIndices: [0] }]
      )
    );
    // A resolves; B answers 405 with no Location (Google's redirect endpoint does this routinely).
    get.mockImplementation((url: string) =>
      url.endsWith("/A")
        ? Promise.resolve({ headers: { location: "https://www.bcu.gub.uy/tasas" }, status: 302 })
        : Promise.resolve({ headers: {}, status: 405 })
    );

    const heads = groundedHeadlines((await askGrounded("p"))!);

    expect(heads).toHaveLength(1); // B is dropped, never published as a vertexaisearch link
    expect(heads[0]).toEqual({
      title: "El BCU subió la tasa.",
      source: "bcu.gub.uy",
      link: "https://www.bcu.gub.uy/tasas",
    });
  });

  it("never throws: no key, an HTTP error and an empty candidate are all null", async () => {
    delete process.env.GEMINI_API_KEY;
    expect(await askGrounded("p")).toBeNull();
    expect(await askPlain("p")).toBeNull();

    process.env.GEMINI_API_KEY = "k";
    post.mockRejectedValue(new Error("429"));
    expect(await askGrounded("p")).toBeNull();

    post.mockResolvedValue({ data: { candidates: [] } });
    expect(await askGrounded("p")).toBeNull();
  });

  it("askPlain sends NO google_search tool", async () => {
    post.mockResolvedValue(reply("resumen", []));
    expect(await askPlain("p")).toBe("resumen");
    expect(post.mock.calls[0]![1]).not.toHaveProperty("tools");
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/gemini.test.ts`
Expected: FAIL — `Cannot find module '../classes/gemini'`.

- [ ] **Step 3: Move the client**

Create `classes/gemini.ts`. **Copy `classes/aduana/gemini.ts` verbatim** (all of it, including every comment — those comments are the record of three real bugs and must not be lost), then apply exactly these changes:

- widen `GroundedReply` with `chunks` / `supports` and return them from `askGrounded`,
- add `askPlain`,
- add `groundedHeadlines`,
- change the `console.warn` prefix from `[aduana]` to `[gemini]`.

The parts that must be preserved **unchanged**: `resolveUri` (`maxRedirects: 0`, read `Location` off the first hop, `null` — never the wrapper, never a `title` fallback), `geminiConfigured` accepting both env names, the `MAX_CHUNKS` cap, `TIMEOUT_MS`, `RESOLVE_TIMEOUT_MS`, and the "never throws" contract.

The new parts:

```ts
export interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

export interface GroundingSupport {
  segment: { text: string; startIndex?: number; endIndex: number };
  groundingChunkIndices: number[];
}

export interface GroundedHeadline {
  title: string;
  source: string;
  link: string;
}

export interface GroundedReply {
  /** The model's raw text. Still needs fence-stripping + JSON.parse — we never hand-repair it. */
  text: string;
  /** URIs the model actually retrieved, RESOLVED past Google's redirect wrapper. Empty admits nothing. */
  sourceUris: string[];
  /** Raw chunks, index-aligned with `supports`' groundingChunkIndices. For groundedHeadlines(). */
  chunks: GroundingChunk[];
  supports: GroundingSupport[];
}

/**
 * Cited headlines from one grounded reply.
 *
 * Gemini's `groundingChunks[].web.title` is the bare DOMAIN, not a headline — the API has no
 * headline field. So the title is built from `groundingSupports`: the segment of the model's own
 * grounded narrative that cites this chunk most specifically (fewest chunks on that segment;
 * earliest wins ties), falling back to the domain. This is the port of the app's
 * utils/geminiGrounding.ts — with ONE deliberate difference: `link` is the RESOLVED url, and a
 * chunk whose redirect did not resolve is DROPPED. The app publishes the vertexaisearch wrapper as
 * the link, which is not a source and cannot be verified; and loanGeminiRate.ts gates on
 * `web.title` as if it were the host, which is a convention, not a guarantee (see resolveUri).
 */
export function groundedHeadlines(reply: GroundedReply, limit = 3): GroundedHeadline[] {
  const best = new Map<number, GroundingSupport>();
  for (const support of reply.supports) {
    for (const idx of support.groundingChunkIndices) {
      const current = best.get(idx);
      if (!current || support.groundingChunkIndices.length < current.groundingChunkIndices.length) {
        best.set(idx, support);
      }
    }
  }

  const out: GroundedHeadline[] = [];
  reply.chunks.forEach((chunk, idx) => {
    const link = reply.sourceUris[idx]; // index-aligned; undefined ⇒ this chunk never resolved
    if (!link) return;
    const domain = (chunk.web?.title ?? "").replace(/^www\./i, "");
    const raw = best.get(idx)?.segment.text?.trim();
    const title = truncate(raw || domain, 140);
    if (!title) return;
    out.push({ title, source: domain || hostOf(link), link });
  });
  return out.slice(0, limit);
}

const truncate = (t: string, max: number): string => (t.length > max ? t.slice(0, max - 3) + "..." : t);
const hostOf = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
};

/** One NON-grounded question (no google_search). For synthesis passes over text we already have. */
export async function askPlain(prompt: string, timeoutMs = TIMEOUT_MS): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await axios.post<GeminiResponse>(
      ENDPOINT,
      { contents: [{ parts: [{ text: prompt }] }] },
      { params: { key: apiKey }, timeout: timeoutMs, headers: { "Content-Type": "application/json" } }
    );
    const text = (res.data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    return text || null;
  } catch (error: any) {
    console.warn("[gemini] plain call failed:", error?.message || error);
    return null;
  }
}
```

**`sourceUris` must stay index-aligned with `chunks`** for `groundedHeadlines` to work. Today `askGrounded` filters out the nulls, which destroys the alignment. Fix it by keeping the nulls internally and exposing both:

```ts
    const resolved = (await Promise.allSettled(webChunks.map(resolveUri))).map((s) =>
      s.status === "fulfilled" ? s.value : null
    );
    // sourceUris is index-aligned with chunks (a hole = a chunk that never resolved). Aduana's
    // norms.ts only ever asks "is this citation in the list?", so holes are invisible to it; but
    // groundedHeadlines needs the alignment to pair a chunk with its real url.
    return {
      text,
      sourceUris: resolved.filter((u): u is string => !!u),
      chunks: webChunks.map((web) => ({ web })),
      supports: candidate?.groundingMetadata?.groundingSupports ?? [],
    };
```

⚠️ **Careful:** the snippet above filters, which breaks alignment. Return **both**: keep `sourceUris` as the filtered list (aduana's contract — an empty list must admit nothing) and add a separate index-aligned `resolvedByChunk: (string | null)[]` that `groundedHeadlines` reads. Adjust the interface and the test accordingly:

```ts
export interface GroundedReply {
  text: string;
  /** Resolved URIs, compacted. `norms.ts` asks "did the model open this?" — holes would lie. */
  sourceUris: string[];
  chunks: GroundingChunk[];
  supports: GroundingSupport[];
  /** Index-aligned with `chunks`: the resolved url, or null when the redirect never resolved. */
  resolvedByChunk: Array<string | null>;
}
```

and `groundedHeadlines` reads `reply.resolvedByChunk[idx]`.

- [ ] **Step 4: Turn `classes/aduana/gemini.ts` into a shim**

Replace the whole file with:

```ts
// The customs norms gate's Gemini client now lives in classes/gemini.ts — one grounded client for
// the whole backend (bank news, lender TEAs, price predictions, move explanations, and this).
// Kept as a re-export so classes/aduana/norms.ts, sync_aduana.ts and tests/aduana/gemini.test.ts
// need no edit: the contract they depend on (grounded, resolved source URIs, null on every failure,
// never throws) is unchanged.
export { askGrounded, geminiConfigured } from "../gemini";
export type { GroundedReply } from "../gemini";
```

- [ ] **Step 5: Run the whole root suite**

Run: `npx vitest run`
Expected: PASS — `tests/gemini.test.ts` (5) **and every existing `tests/aduana/*` test, unchanged**. If any aduana test fails, the shim is wrong; fix the shim, never the aduana test.

- [ ] **Step 6: Commit**

```bash
git add classes/gemini.ts classes/aduana/gemini.ts tests/gemini.test.ts
git commit -m "feat(gemini): one grounded Gemini client for the backend, aduana's kept working via a shim"
```

---

### Task 2: Bank news — prove the whole pattern with nothing at stake

Lowest risk on purpose: **no stored data today, no scheduled task today**. If this feature breaks, a card on `/mejores-bancos-uruguay` says "sin novedades". Everything after this task copies its shape.

**Files:**
- Create: `classes/banks/entities.ts`, `classes/banks/news.ts`, `classes/banks/store.ts`, `sync_banks_news.ts`
- Test: `tests/banks/entities.test.ts`, `tests/banks/news.test.ts`
- Modify: `index.ts`, `ecosystem.config.js`, `package.json`, `scripts/deploy-backend.sh`
- Then (second commit): rewrite `app/server/api/banks-news.get.ts`, create `app/server/utils/banksNewsFallback.ts`, delete `app/server/utils/banksNews.ts`
- Test: `app/tests/unit/banksNewsProxy.test.ts`

**Interfaces:**
- Consumes: `classes/gemini.ts`.
- Produces: `buildBanksBriefing(lang: 'es'|'en'|'pt'): Promise<BanksBriefing>` (same shape the app already renders: `{ items: Array<{id,name,insight,headlines}>; analysis: string|null; asOf: string; unavailable: boolean }`), `loadBriefing(lang)` / `saveBriefing(lang, doc)`, `GET /banks-news?lang=es`.

- [ ] **Step 1: Write the failing drift-guard test**

The backend needs the entity list (id, name, kind) that lives in `app/utils/bankTierlist.ts`. That is a copy, and a copy drifts. Guard it the way `tests/aduana/baseline.test.ts` guards the import figures — read the app file as **text**.

Create `tests/banks/entities.test.ts`:

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BANK_ENTITIES, KIND_LABELS } from "../../classes/banks/entities";

describe("bank entities", () => {
  // A bank the tier list shows but this list forgets is a bank that silently never gets news.
  it("covers exactly the ids in app/utils/bankTierlist.ts", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "..", "app", "utils", "bankTierlist.ts"),
      "utf8"
    );
    // BANKS entries look like: { id: 'itau', name: 'Itaú', kind: 'banco', ... }
    const appIds = [...src.matchAll(/^\s{2}\{\s*$\n\s{4}id:\s*'([a-z0-9-]+)'/gm)].map((m) => m[1]);
    expect(appIds.length).toBeGreaterThan(5); // the regex still matches something
    expect(BANK_ENTITIES.map((e) => e.id).sort()).toEqual([...appIds].sort());
  });

  it("labels every kind it uses", () => {
    for (const e of BANK_ENTITIES) expect(KIND_LABELS[e.kind]).toBeTruthy();
  });
});
```

Open `app/utils/bankTierlist.ts` first and make the regex match its **actual** formatting — if the entries are on one line, adjust it. The test must fail for the right reason (missing module), not because the regex found nothing; that is what the `toBeGreaterThan(5)` assertion is for.

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/banks/entities.test.ts`
Expected: FAIL — cannot find `classes/banks/entities`.

- [ ] **Step 3: Write the entities + the news builder + the store**

`classes/banks/entities.ts` — `export interface BankEntity { id: string; name: string; kind: string }`, `export const BANK_ENTITIES: BankEntity[]` (transcribed from `app/utils/bankTierlist.ts`'s `BANKS`, ids/names/kinds only — **not** the scoring dimensions, which stay in the app), `export const KIND_LABELS: Record<string, string>` (copy from the app).

`classes/banks/news.ts` — a straight port of `app/server/utils/banksNews.ts` with the Gemini plumbing replaced by `classes/gemini.ts`. Keep `mapPool` (bounded concurrency, 4), keep `trimInsight`, keep the "SIN NOTICIAS" sentinel, keep the two-pass structure (one grounded call per entity, then one **plain** synthesis pass over what was found).

```ts
// Live, grounded "recent news + AI analysis" per Uruguayan bank / fintech, for the tier list on
// /mejores-bancos-uruguay. One grounded search per entity (bounded concurrency), then ONE plain
// synthesis pass over the headlines we actually found — the synthesis must not search, it must only
// summarise what the grounded pass returned, or it will "find" things nobody cited.
//
// Moved out of the Nuxt app (server/utils/banksNews.ts), where it ran ON DEMAND: the first visitor
// after a 24h cache expiry paid ~36 Gemini calls in-request. Here it is a weekly-ish cron job into
// Mongo, and the page reads a store.
import { askGrounded, askPlain, geminiConfigured, groundedHeadlines, type GroundedHeadline } from "../gemini";
import { BANK_ENTITIES, KIND_LABELS } from "./entities";

export type Lang = "es" | "en" | "pt";
const LANG_NAME: Record<Lang, string> = { es: "español", en: "English", pt: "português" };

export interface BankNewsItem { id: string; name: string; insight: string | null; headlines: GroundedHeadline[] }
export interface BanksBriefing { items: BankNewsItem[]; analysis: string | null; asOf: string; unavailable: boolean }

const isNoNews = (t: string): boolean => /^\s*sin\s+noticias/i.test(t);
```

`buildBanksBriefing(lang)` returns `{ items: [], analysis: null, asOf, unavailable: true }` when `!geminiConfigured()` — same graceful shape the page already handles.

`classes/banks/store.ts` — mirror `classes/aduana/store.ts` exactly (`MongooseServer.getInstance("banks_news_data", schema)`, one doc **per language**, `updateOne({ key }, { key, doc })` — remember `updateOne` upserts and `updateOneRaw` does not exist):

```ts
const KEY = (lang: Lang) => `banks_news:${lang}`;
export async function loadBriefing(lang: Lang): Promise<BanksBriefing | null> { … }
export async function saveBriefing(lang: Lang, doc: BanksBriefing): Promise<void> { … }
```

- [ ] **Step 4: Write the news test**

Create `tests/banks/news.test.ts` — mock `../../classes/gemini` and assert: (a) `unavailable: true` and **zero** calls when the key is missing; (b) an entity whose reply is `SIN NOTICIAS` is dropped from `items`; (c) the synthesis is `askPlain`, called **once**, and never called when no entity produced an insight.

- [ ] **Step 5: Run both**

Run: `npx vitest run tests/banks`
Expected: PASS.

- [ ] **Step 6: The job, the pm2 app, the route**

Create `sync_banks_news.ts` (mirror `sync_aduana.ts`: `dotenv.config()` first, each language independent in its own try/catch, **never blank a stored briefing on a failure**, `process.exit(0)`).

```ts
// Bank/fintech news briefing (pm2 app `currency-banks-news`, daily 10:37 UTC ≈ 07:37 Uruguay).
//
// Three languages, each independent: a failed language keeps its previous stored briefing rather
// than blanking it. 10:37 is not a multiple of 5 (currency-sync is */5) and sits clear of the Reddit
// jobs (nitro reddit:sentiment at 10:10, currency-aduana Mondays 09:30).
import dotenv from "dotenv";
dotenv.config();

import { buildBanksBriefing, type Lang } from "./classes/banks/news";
import { geminiConfigured } from "./classes/gemini";
import { saveBriefing } from "./classes/banks/store";

const LANGS: Lang[] = ["es", "en", "pt"];

async function main(): Promise<void> {
  if (!geminiConfigured()) {
    console.warn("[banks-news] no GEMINI_API_KEY — nothing to do, keeping the stored briefings");
    process.exit(0);
  }
  for (const lang of LANGS) {
    try {
      const briefing = await buildBanksBriefing(lang);
      if (!briefing.items.length) {
        console.warn(`[banks-news] ${lang}: nothing found, keeping the previous briefing`);
        continue;
      }
      await saveBriefing(lang, briefing);
      console.log(`[banks-news] ${lang}: ${briefing.items.length} entities, analysis=${!!briefing.analysis}`);
    } catch (e) {
      console.error(`[banks-news] ${lang} failed, keeping the previous briefing`, e);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[banks-news] sync failed", e);
  process.exit(1);
});
```

`ecosystem.config.js`, after the `currency-aduana` block:

```js
    {
      // Bank/fintech news briefing for /mejores-bancos-uruguay (3 languages).
      // Daily 10:37 UTC ≈ 07:37 America/Montevideo. Minute 37 is deliberately NOT a multiple of 5
      // (currency-sync runs */5) and sits after nitro's reddit:sentiment (10:10) so the two never
      // contend. This is the heaviest Gemini job in the fleet (~36 grounded calls per run).
      name: "currency-banks-news",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_banks_news.js",
      cron_restart: "37 10 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

`scripts/deploy-backend.sh`: `OTHER_APPS=(currency-sync currency-aduana currency-sheet currency-banks-news)`.

`package.json`: `"sync_banks_news": "ts-node sync_banks_news.ts"`.

`index.ts`, next to the aduana route (mirror it, including the swagger JSDoc block):

```ts
  server.getJson("banks-news", async (req: Request): Promise<any> => {
    const raw = String(req.query.lang ?? "es").slice(0, 2);
    const lang = (["es", "en", "pt"].includes(raw) ? raw : "es") as Lang;
    return await redisCache.getOrSet(`banks-news:${lang}`, async () => {
      return (await loadBriefing(lang)) ?? { items: [], analysis: null, asOf: new Date().toISOString(), unavailable: true };
    }, 1800);
  });
```

Swagger: summary `Novedades y análisis del sector bancario uruguayo (búsqueda con grounding, citada)`; document `lang` (es|en|pt), that `unavailable: true` means the briefing has never been generated, and that `headlines[].link` is the **real source url**, not a redirect.

- [ ] **Step 7: Typecheck + test, then commit the backend half**

```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
git add classes/banks classes/gemini.ts sync_banks_news.ts tests/banks index.ts ecosystem.config.js package.json scripts/deploy-backend.sh
git commit -m "feat(banks): grounded bank-news briefing in the backend + GET /banks-news"
```

**Push this commit and verify `https://api.cambio-uruguay.com/banks-news?lang=es` returns a briefing before doing Step 8** (the CI deploys the app *before* the backend — see Global Constraints).

- [ ] **Step 8: The app half — a proxy that holds nothing**

Create `app/server/utils/banksNewsFallback.ts`:

```ts
// What /api/banks-news serves when the backend is unreachable. Deliberately empty, not fabricated:
// the page renders the tier list from its own static data and simply shows no news cards. There is
// no honest offline substitute for "what happened to Itaú this month".
export interface GroundedHeadline { title: string; source: string; link: string }
export interface BankNewsItem { id: string; name: string; insight: string | null; headlines: GroundedHeadline[] }
export interface BanksBriefing { items: BankNewsItem[]; analysis: string | null; asOf: string; unavailable: boolean }

export const BANKS_NEWS_FALLBACK: BanksBriefing = {
  items: [],
  analysis: null,
  asOf: new Date(0).toISOString(),
  unavailable: true,
}
```

Rewrite `app/server/api/banks-news.get.ts`:

```ts
// Bank/fintech news, proxied from the backend (pm2 `currency-banks-news` generates it daily) and
// cached at the edge. Zero business logic, zero Gemini: this route only forwards and falls back.
import { BANKS_NEWS_FALLBACK, type BanksBriefing } from '../utils/banksNewsFallback'

const LANGS = ['es', 'en', 'pt']

export default defineCachedEventHandler(
  async (event): Promise<BanksBriefing> => {
    let lang = String(getQuery(event).lang || 'es').slice(0, 2)
    if (!LANGS.includes(lang)) lang = 'es'
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<BanksBriefing>(`${base}/banks-news`, { query: { lang }, timeout: 8000 })
      return res?.items?.length ? res : BANKS_NEWS_FALLBACK
    } catch {
      return BANKS_NEWS_FALLBACK
    }
  },
  {
    maxAge: 60 * 60 * 6,
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'banks-news-uy',
    getKey: event => 'banks-' + String(getQuery(event).lang || 'es').slice(0, 2),
  }
)
```

Delete `app/server/utils/banksNews.ts`.

Create `app/tests/unit/banksNewsProxy.test.ts` — assert `BANKS_NEWS_FALLBACK.unavailable === true` and `items` is `[]` (the page's `v-if` already handles it; this test is the contract).

- [ ] **Step 9: Verify the page still renders**

Run (from `app/`): `npx vitest run tests/unit/banksNewsProxy.test.ts` → PASS.
Then `npm run dev` and load `/mejores-bancos-uruguay` — the news section must render from the backend, and with the backend stopped it must render the tier list with no news cards and **no error**.

- [ ] **Step 10: Commit the app half**

```bash
git add app/server/api/banks-news.get.ts app/server/utils/banksNewsFallback.ts app/tests/unit/banksNewsProxy.test.ts
git rm app/server/utils/banksNews.ts
git commit -m "refactor(banks): /api/banks-news is a thin proxy — no Gemini in the app"
```

---

### Task 3: UY key figures — and the drift watchdog stays behind

`figures:daily` does **two** things: a Gemini refresh (`refreshUyFigures`) and a **Telegram drift watchdog** (`checkFiguresDrift`). Only the first is Gemini. The watchdog needs the app's Telegram config (`runtimeConfig.telegram.adminChatId`, `server/utils/telegram.ts`) and its own dedupe state (`useStorage('figures')` key `watchdog`) — none of which exists in the backend. **Split them:** Gemini goes, the watchdog stays as a new non-Gemini nitro task fed by the proxy.

**Files:**
- Create: `classes/figures/{bands,refresh,store}.ts`, `sync_figures.ts`, `tests/figures/bands.test.ts`
- Modify: `index.ts`, `ecosystem.config.js`, `package.json`, `scripts/deploy-backend.sh`
- Then: `app/server/api/uy-figures.get.ts` (rewrite), `app/server/utils/uyFiguresFallback.ts` (new), `app/server/tasks/figures/drift.ts` (new), `app/nuxt.config.ts` (swap `figures:daily` → `figures:drift`), delete `app/server/utils/uyFiguresLive.ts` and `app/server/tasks/figures/daily.ts`

**Interfaces:**
- Produces: `applyFigureBands(current: UyFigures, data: Record<string, unknown>): { figures: UyFigures; updated: string[] }` (pure — this is the whole guardrail and it is what the test hits); `refreshUyFigures(): Promise<UyFigures>`; `GET /uy-figures`.
- `UyFigures` = `{ salarioMinimo, bpc, boletoStm, inflacionAnual, asOf: string|null, updated: string[], sources: Array<{label,url}> }` — **the exact shape the page already consumes.** Do not change it.

- [ ] **Step 1: Write the failing guardrail test**

Create `tests/figures/bands.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyFigureBands, BASELINE_FIGURES } from "../../classes/figures/bands";

describe("applyFigureBands", () => {
  it("takes a plausible value and records that it was updated", () => {
    const out = applyFigureBands(BASELINE_FIGURES, { salarioMinimo: 26500, bpc: 6900 });
    expect(out.figures.salarioMinimo).toBe(26500);
    expect(out.figures.bpc).toBe(6900);
    expect(out.updated.sort()).toEqual(["bpc", "salarioMinimo"]);
  });

  it("rejects an out-of-band value and keeps the baseline — a hallucinated number never ships", () => {
    const out = applyFigureBands(BASELINE_FIGURES, { salarioMinimo: 2_500_000, bpc: 6900 });
    expect(out.figures.salarioMinimo).toBe(BASELINE_FIGURES.salarioMinimo);
    expect(out.updated).toEqual(["bpc"]);
  });

  it("rejects nulls, strings and NaN without touching anything", () => {
    const out = applyFigureBands(BASELINE_FIGURES, { salarioMinimo: null, bpc: "6900", boletoStm: NaN });
    expect(out.updated).toEqual([]);
    expect(out.figures).toEqual(BASELINE_FIGURES);
  });

  it("rounds inflación to one decimal and the rest to integers", () => {
    const out = applyFigureBands(BASELINE_FIGURES, { inflacionAnual: 4.37, boletoStm: 52.6 });
    expect(out.figures.inflacionAnual).toBe(4.4);
    expect(out.figures.boletoStm).toBe(53);
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/figures/bands.test.ts` → FAIL, cannot find the module.

- [ ] **Step 3: Port the module**

`classes/figures/bands.ts` — copy `BASELINE`, `BANDS`, `inBand` and the update loop **verbatim** from `app/server/utils/uyFiguresLive.ts` (lines 24–37 and 100–111), exported as `BASELINE_FIGURES`, `FIGURE_BANDS`, `applyFigureBands`. The numbers are already verified; do not re-derive them.

`classes/figures/refresh.ts` — the Gemini leg: the `PROMPT` verbatim, `askGrounded`, `parseJsonLoose` (verbatim), `applyFigureBands`, then `groundedHeadlines(reply, 6)` → `sources`. Returns the baseline unchanged when the key is missing, the reply is unparseable, or nothing passed a band.

`classes/figures/store.ts` — single doc `uy_figures_data`, mirror `classes/aduana/store.ts`.

- [ ] **Step 4: Run it** → `npx vitest run tests/figures` → PASS (4).

- [ ] **Step 5: Job, pm2, route**

`sync_figures.ts` (mirror `sync_banks_news.ts`). pm2:

```js
    {
      // Uruguay's key national figures (salario mínimo, BPC, boleto STM, inflación) via grounded
      // search. Daily 09:52 UTC ≈ 06:52 America/Montevideo. Minute 52: not a multiple of 5.
      // The DRIFT WATCHDOG is not here — it stayed in the app (nitro task figures:drift), because
      // it needs the app's Telegram config and its own dedupe state, and it spends no Gemini call.
      name: "currency-figures",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_figures.js",
      cron_restart: "52 9 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

`index.ts`: `server.getJson("uy-figures", …)` → `redisCache.getOrSet("uy-figures", () => loadFigures(), 1800)`, falling back to `BASELINE_FIGURES` with `asOf: null` when the store is empty. Swagger block: summary `Indicadores clave de Uruguay (salario mínimo, BPC, boleto, inflación)`; document that `updated[]` lists which fields came from a live search this cycle and that everything else is the verified baseline.

Add to `OTHER_APPS` and to `package.json` scripts. **Commit, push, verify the endpoint.**

- [ ] **Step 6: The app half**

`app/server/utils/uyFiguresFallback.ts` — the `UyFigures` type + `UY_FIGURES_FALLBACK` (the same verified 2026 baseline constants that are in `uyFiguresLive.ts` today, `asOf: null`, `updated: []`, `sources: []`).

`app/server/api/uy-figures.get.ts` — proxy + fallback (copy the shape from `banks-news.get.ts` above; `maxAge: 60 * 60`, `staleMaxAge: 60 * 60 * 24 * 7`, `name: 'uy-figures-v2'` — **bump the cache name**, the old cached payloads are still live).

`app/server/tasks/figures/drift.ts` — **new, non-Gemini**:

```ts
// The drift watchdog. NOT Gemini: it fetches the figures the backend already refreshed and compares
// them with the constants baked into this app's prose/data (SALARY_REFERENCE, UY_FACTS, the FAQ),
// pinging the admin once per distinct drift so a human updates them. It stayed in the app because
// the numbers it watches live in the app, the Telegram creds live in the app's runtimeConfig, and
// it spends no AI call at all.
import { checkFiguresDrift } from '../../utils/figuresDrift'

export default defineTask({
  meta: { name: 'figures:drift', description: 'Compare live UY figures with the constants baked into the site' },
  async run() {
    const figures = await $fetch<UyFigures>('/api/uy-figures')
    const { drift, notified } = await checkFiguresDrift(figures)
    return { result: { drift, notified } }
  },
})
```

Move `WATCHED`, `WatchState` and `checkFiguresDrift` **verbatim** out of `uyFiguresLive.ts` into a new `app/server/utils/figuresDrift.ts` (it keeps `useStorage('figures')` key `watchdog` — that mount **stays** in `nuxt.config.ts`). Delete `app/server/utils/uyFiguresLive.ts` and `app/server/tasks/figures/daily.ts`.

`app/nuxt.config.ts` `scheduledTasks`: replace

```
      // 09:50 UTC ≈ 06:50 Uruguay: refresh national key figures + drift watchdog.
      '50 9 * * *': ['figures:daily'],
```

with

```
      // 10:05 UTC ≈ 07:05 Uruguay: compare the backend's freshly-refreshed figures (pm2
      // currency-figures, 09:52 UTC) with the constants baked into this app, and ping the admin
      // when they drift. Spends no AI call — the Gemini refresh moved to the backend.
      '5 10 * * *': ['figures:drift'],
```

- [ ] **Step 7: Test + commit**

`app/tests/unit/figuresDrift.test.ts` — port the existing coverage: a >3% drift produces a message; the same drift twice notifies once.

```bash
git add app/server/api/uy-figures.get.ts app/server/utils/uyFiguresFallback.ts app/server/utils/figuresDrift.ts app/server/tasks/figures/drift.ts app/nuxt.config.ts app/tests/unit/figuresDrift.test.ts
git rm app/server/utils/uyFiguresLive.ts app/server/tasks/figures/daily.ts
git commit -m "refactor(figures): Gemini refresh moves to the backend, the drift watchdog stays"
```

---

### Task 4: Cost of living

Same shape as Task 3, one wrinkle: today the backend of this feature stores the **whole merged `COST_MODEL`**. Copying `COST_MODEL` into the root repo would duplicate a large table of numbers that the page also imports. **It does not move.** The backend stores and serves only the five validated live figures; the proxy applies them to the app's own `COST_MODEL` with the exact arithmetic that lives in `costOfLivingLive.ts` today.

**Files:**
- Create: `classes/costs/{bands,refresh,store}.ts`, `sync_costs.ts`, `tests/costs/bands.test.ts`
- Then: `app/server/utils/costsMerge.ts` (new, pure), `app/server/api/cost-of-living.get.ts` (rewrite), `app/tests/unit/costsMerge.test.ts` (new); delete `app/server/utils/costOfLivingLive.ts`, `app/server/tasks/costs/daily.ts`; drop the `costs` storage mount from `nuxt.config.ts`

**Interfaces:**
- Backend produces `GET /cost-of-living` → `{ figures: { salarioMinimo?: number; boletoStm?: number; rentMono?: number; rent1?: number; rent2?: number }; asOf: string|null; updated: string[]; sources: Array<{label,url}> }`.
- App produces `applyCostOverrides(live): LiveCosts` — the **same `LiveCosts` shape the page already consumes** (`{ model, salary, asOf, updated, sources }`). The page changes by zero lines.

- [ ] **Step 1: Backend bands test** — `tests/costs/bands.test.ts`, same three cases as Task 3 (in-band accepted, out-of-band rejected, garbage ignored), using `BANDS` copied verbatim from `costOfLivingLive.ts:29-35`.

- [ ] **Step 2: Run it, watch it fail.**

- [ ] **Step 3: Port** `classes/costs/bands.ts` (`COST_BANDS`, `applyCostBands(data) → { figures, updated }` — note it returns **only the five figures**, no model), `classes/costs/refresh.ts` (the `PROMPT` verbatim + `askGrounded` + `parseJsonLoose` + `groundedHeadlines`), `classes/costs/store.ts` (`costs_data`, single doc).

- [ ] **Step 4: Run it** → PASS.

- [ ] **Step 5: `sync_costs.ts` + pm2 `currency-costs` (`43 9 * * *`) + `GET /cost-of-living` + swagger + `OTHER_APPS` + `package.json`.** Commit, push, verify.

- [ ] **Step 6: The app half — the merge, extracted not reinvented**

`app/server/utils/costsMerge.ts`:

```ts
// Apply the backend's validated live figures to this app's verified cost model.
//
// This is NOT Gemini logic and it is not new logic: it is the exact arithmetic that used to sit in
// server/utils/costOfLivingLive.ts (transporte = boleto × 2 tramos × 22 días, rents rounded to the
// nearest 500). It stays here because COST_MODEL stays here — the page imports it, and copying that
// table into the root repo would create a second source of truth for numbers we have already shipped
// wrong once elsewhere.
import { COST_MODEL, SALARY_REFERENCE } from '../../utils/costOfLiving'
import type { DwellingType } from '../../utils/costOfLiving'

export interface LiveCostFigures {
  salarioMinimo?: number
  boletoStm?: number
  rentMono?: number
  rent1?: number
  rent2?: number
}
export interface LiveCostsResponse {
  figures: LiveCostFigures
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}
export interface LiveCosts {
  model: typeof COST_MODEL
  salary: { minimoNacional: number; medianaLiquidoAprox: number }
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

const cloneBaseline = (): typeof COST_MODEL => ({
  ...COST_MODEL,
  rentMontevideo: { ...COST_MODEL.rentMontevideo },
})

export function baselineCosts(): LiveCosts {
  return { model: cloneBaseline(), salary: { ...SALARY_REFERENCE }, asOf: null, updated: [], sources: [] }
}

export function applyCostOverrides(live: LiveCostsResponse | null): LiveCosts {
  const out = baselineCosts()
  if (!live?.updated?.length) return out

  const f = live.figures ?? {}
  if (typeof f.salarioMinimo === 'number') out.salary.minimoNacional = f.salarioMinimo
  if (typeof f.boletoStm === 'number') {
    out.model.transportPerAdult = Math.round((f.boletoStm * 2 * 22) / 100) * 100
  }
  const rents: Array<[keyof LiveCostFigures, DwellingType]> = [
    ['rentMono', 'monoambiente'],
    ['rent1', '1_dormitorio'],
    ['rent2', '2_dormitorios'],
  ]
  for (const [key, dwelling] of rents) {
    const v = f[key]
    if (typeof v === 'number') out.model.rentMontevideo[dwelling] = Math.round(v / 500) * 500
  }

  out.asOf = live.asOf
  out.updated = live.updated
  out.sources = live.sources ?? []
  return out
}
```

`app/server/api/cost-of-living.get.ts` — fetch `${base}/cost-of-living`, run it through `applyCostOverrides`, return the baseline on any failure. **Delete the `inFlight` background-refresh dance**: the backend cron is the only refresher now, and a GET handler must not spend Gemini calls (it no longer can). Bump the cache name to `cost-of-living-v3`.

`app/tests/unit/costsMerge.test.ts` — the same guardrail behaviour the page depends on: no overrides → pure baseline; a boleto of 52 → `transportPerAdult === 2300`; a rent of 26 300 → rounded to 26 500; a null/absent field leaves the baseline value.

- [ ] **Step 7: Remove the `costs` storage mount** from `app/nuxt.config.ts` (the `costs: { driver: 'fs', base: './.data/costs' }` block) and the `'40 9 * * *': ['costs:daily']` line. **`app/.data/costs/live.json` is a single regenerable snapshot — it is dropped on purpose; the backend regenerates it on its first run at 09:43 UTC.**

- [ ] **Step 8: Commit** the app half.

---

### Task 5: Debt relief (monthly)

Identical to Task 4 in every respect except cadence and payload. `applyLiveCaps` in `app/server/utils/debtReliefLive.ts` is **already pure and already unit-tested** (`app/tests/unit/debtReliefLive.test.ts`) — port it and its test to the root **verbatim**.

**Files:** `classes/debt/{bands,refresh,store}.ts`, `sync_debt_relief.ts`, `tests/debt/caps.test.ts`; then `app/server/utils/debtReliefMerge.ts`, `app/server/api/debt-relief.get.ts` (rewrite); delete `app/server/utils/debtReliefLive.ts`, `app/server/tasks/debt-relief/monthly.ts`, `app/tests/unit/debtReliefLive.test.ts`; drop the `debt-relief` mount and the `'10 10 1 * *'` line.

- Backend serves `GET /debt-relief` → `{ usuryCaps: UsuryCap[]; asOf: string|null; updated: string[]; sources: [] }` — **only the caps**, because `refiRates` and `period` are static page content that stays in `app/utils/debtRelief.ts`.
- The proxy returns `{ ...DEBT_RELIEF_BASELINE, usuryCaps: live?.usuryCaps ?? DEBT_RELIEF_BASELINE.usuryCaps, asOf, updated, sources }` — the `LiveDebtRelief` shape the page already renders.
- pm2 `currency-debt-relief`, `cron_restart: "13 10 1 * *"` (monthly, the 1st, 10:13 UTC ≈ 07:13 Uruguay; minute 13 is not a multiple of 5).
- **`.data/debt-relief/live.json` is a regenerable snapshot** — dropped. Worst case the page shows the verified baseline caps for up to a month; the caps in the baseline are the last human-verified ones, so this is safe. If that month matters, run `npm run sync_debt_relief` once on the VPS right after deploying.

---

### Task 6: Lender TEAs — the first feature whose data must be carried

`refreshAllLenderRates` is a **fallback chain**: a cheap regex parser (`loanScraper.ts`, covers oca/pronto/cash) and then Gemini for everyone else. The Gemini leg cannot move without the regex leg — they are two halves of one decision. Both move.

And `loans/rates.json` holds `history[lenderId][]`, **one entry per lender per day**. That is a time series. It cannot be regenerated. It gets imported.

**Files:**
- Create: `classes/loans/{catalog,scraper,gemini,refresh,store}.ts`, `sync_loans.ts`, `import_loan_history.ts`, `tests/loans/{catalog,refresh,gemini}.test.ts`
- Modify: `index.ts`, `ecosystem.config.js`, `package.json`, `scripts/deploy-backend.sh`
- Then: `app/server/utils/loansMerge.ts`, `app/server/api/prestamos.get.ts` (rewrite); delete `app/server/utils/{loanGeminiRate,loanRateRefresh,loanRatesStore,loanScraper}.ts`, `app/server/tasks/loans/scrape.ts`, `app/tests/unit/{loanGeminiRate,loanRateRefresh,loanRatesStore,courierScraper?}.test.ts` (keep `courierScraper.test.ts` — it is a different feature); drop the `loans` mount

**Interfaces:**
- `classes/loans/catalog.ts` — `LOAN_LENDERS: Array<{ id, name, website, source }>` (only the fields the scrape needs), guarded by a drift test against `app/utils/loans.ts`.
- `refreshAllLenderRates(): Promise<LenderRateResult[]>` — the port, unchanged semantics: `{ id, teaPct, ok, method: 'regex'|'gemini', sourceUrl? }`, degrades to `ok: false` rather than throwing.
- `GET /loan-rates` → `{ rates: Record<string, { teaPct: number; scrapedAt: string }>; history: Record<string, HistoryEntry[]>; updatedAt: string }`.
- App: `mergeLenders(catalogue, rates)` — what `getMergedLenders()` does today.

- [ ] **Step 1: Write the failing host-gate test** (this is the one that gets money wrong)

Create `tests/loans/gemini.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const askGrounded = vi.fn();
vi.mock("../../classes/gemini", async (orig) => ({
  ...(await orig<typeof import("../../classes/gemini")>()),
  geminiConfigured: () => true,
  askGrounded: (...a: unknown[]) => askGrounded(...a),
}));

import { fetchLenderRateFromGemini } from "../../classes/loans/gemini";

const LENDER = { id: "creditel", name: "Creditel", website: "https://www.creditel.com.uy", source: "https://www.creditel.com.uy/tasas" };

const reply = (text: string, links: string[]) => ({
  text,
  sourceUris: links,
  resolvedByChunk: links,
  chunks: links.map((l) => ({ web: { uri: "https://vertexaisearch.cloud.google.com/x", title: new URL(l).hostname } })),
  supports: [],
});

describe("fetchLenderRateFromGemini", () => {
  beforeEach(() => askGrounded.mockReset());

  it("takes a rate cited on the lender's own site", async () => {
    askGrounded.mockResolvedValue(reply("TEA: 89.5%", ["https://www.creditel.com.uy/tasas"]));
    const out = await fetchLenderRateFromGemini(LENDER);
    expect(out).toEqual({ teaPct: 89.5, sourceUrl: "https://www.creditel.com.uy/tasas" });
  });

  it("REFUSES a rate whose only citation is somebody else's site", async () => {
    // The bug this prevents: a comparison blog quoting a rival's rate, attributed to this lender.
    askGrounded.mockResolvedValue(reply("TEA: 42.0%", ["https://elpais.com.uy/prestamos"]));
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull();
  });

  it("REFUSES a rate the model never cited at all", async () => {
    askGrounded.mockResolvedValue(reply("TEA: 42.0%", []));
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull();
  });

  it("refuses an implausible TEA and a 'not found' reply", async () => {
    askGrounded.mockResolvedValue(reply("TEA: 900%", ["https://www.creditel.com.uy/tasas"]));
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull();
    askGrounded.mockResolvedValue(reply("TEA: NO ENCONTRADO", ["https://www.creditel.com.uy/tasas"]));
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull();
  });
});
```

Note what changed versus the app: the host gate now compares against the **resolved** url's hostname, not `chunk.web.title`. The app's version trusts a field that `classes/gemini.ts`'s own comment says "is the source domain only by convention, is not verified, and is not a security boundary".

- [ ] **Step 2: Run it, watch it fail.**

- [ ] **Step 3: Port the four modules.** `scraper.ts` (`TEA_PARSERS`, `TEA_MIN`, `TEA_MAX`, `toNum`, `scrapeAllLenderRates` — the app version uses `$fetch`; use `axios` here, same timeouts, same graceful-null), `gemini.ts` (the prompt verbatim + the strict host gate above), `refresh.ts` (the chain, verbatim), `store.ts` (`loan_rates_data`, single doc holding `rates` + `history`; the golden rule from `loanRatesStore.ts` moves with it: **only a fresh successful scrape overwrites a TEA**).

- [ ] **Step 4: Run** `npx vitest run tests/loans` → PASS.

- [ ] **Step 5: The one-shot history import**

Create `import_loan_history.ts` — reads the fs store the app wrote, writes it into Mongo, **never overwrites a newer entry**, idempotent:

```ts
// One-shot: carry the lender-TEA history out of the Nuxt app's filesystem store and into Mongo.
//
// app/.data/loans/rates.json holds `history[lenderId][]` — one entry per lender per UTC day, going
// back to the day loans:scrape first ran. That is a TIME SERIES: it cannot be regenerated, because
// nobody can tell you what Creditel's advertised TEA was on 2026-06-03 today. Everything else this
// migration drops (costs/live, figures/live, debt-relief/live) is a single snapshot the next cron
// rewrites; this is not.
//
// Run ONCE on the VPS, after `npm run build`, BEFORE the app half of Task 6 is deployed:
//   cd /root/cambio-uruguay && node dist/import_loan_history.js
// Idempotent: re-running it merges by (lenderId, date) and never overwrites an entry Mongo already
// has with a different value — the fs file is the past, the cron owns the present.
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { loadLoanRates, saveLoanRates, type HistoryEntry } from "./classes/loans/store";

const FS_PATH = path.join(__dirname, "..", "app", ".data", "loans", "rates.json");

async function main(): Promise<void> {
  if (!fs.existsSync(FS_PATH)) {
    console.warn(`[loans-import] ${FS_PATH} does not exist — nothing to carry over. This is fine on a fresh box.`);
    process.exit(0);
  }
  const fsDoc = JSON.parse(fs.readFileSync(FS_PATH, "utf8")) as {
    rates?: Record<string, { teaPct: number; scrapedAt: string }>;
    history?: Record<string, HistoryEntry[]>;
    updatedAt?: string;
  };

  const mongoDoc = await loadLoanRates();
  let carried = 0;

  for (const [lenderId, entries] of Object.entries(fsDoc.history ?? {})) {
    const have = new Map((mongoDoc.history[lenderId] ?? []).map((e) => [e.date, e]));
    for (const entry of entries) {
      if (have.has(entry.date)) continue; // Mongo wins: the cron already owns that day
      have.set(entry.date, entry);
      carried++;
    }
    mongoDoc.history[lenderId] = [...have.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Only seed `rates` if Mongo has never been written — the cron is authoritative once it has run.
  if (!Object.keys(mongoDoc.rates).length && fsDoc.rates) {
    mongoDoc.rates = fsDoc.rates;
    mongoDoc.updatedAt = fsDoc.updatedAt ?? new Date().toISOString();
  }

  await saveLoanRates(mongoDoc);
  console.log(`[loans-import] carried ${carried} history entries across ${Object.keys(mongoDoc.history).length} lenders`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[loans-import] failed — the fs file is untouched, safe to retry", e);
  process.exit(1);
});
```

Add `"import_loan_history": "ts-node import_loan_history.ts"` to `package.json`.

- [ ] **Step 6: Job, pm2, route.** `sync_loans.ts`; pm2 `currency-loans`, `cron_restart: "47 8 * * *"` (08:47 UTC ≈ 05:47 Uruguay — minute 47, not a multiple of 5; the old nitro `loans:scrape` ran 08:45, which **is**, and therefore raced `currency-sync` every single day); `GET /loan-rates` + swagger; `OTHER_APPS`. Commit, push, **run the import on the VPS**, verify `GET /loan-rates` shows the carried `history`.

- [ ] **Step 7: The app half.** `app/server/utils/loansMerge.ts` (`mergeLenders(rates)` — exactly `getMergedLenders()`'s body, reading the proxied rates instead of `useStorage`); `app/server/api/prestamos.get.ts` becomes a proxy over `${base}/loan-rates` + merge + `{ lenders: LENDERS, updatedAt: null }` on failure (**the seed catalogue with its static `teaPct`s — the page never blanks**). Delete the four app modules, the `loans:scrape` task, the `loans` mount and the `'45 8 * * *'` line. Bump the cache name to `prestamos-v2`.

- [ ] **Step 8: Verify + commit.** `/prestamos-uruguay` must render the same TEAs it renders today, with the same `updatedAt`.

---

### Task 7: The bridge to the app's Mongo

Tasks 8 and 9 write two collections that already exist, already hold history, and live in a **different database** from the backend's. They are not moved. The backend reaches into the app's database explicitly.

**Files:**
- Create: `classes/appdb.ts`, `classes/models/PricePrediction.ts`, `classes/models/MoveExplanation.ts`, `classes/models/DriverSnapshot.ts`, `classes/models/PriceNews.ts`
- Test: `tests/appdb/schema_parity.test.ts`

**Interfaces:**
- `appConnection(): Promise<mongoose.Connection>` — a lazily-created, memoised `mongoose.createConnection(process.env.APP_MONGO_URI)`. **Never `mongoose.connect`** — that would hijack the default connection that `classes/database.ts` owns.
- Models are bound to that connection, with the **exact collection names Mongoose already derived for the app** (`pricepredictions`, `moveexplanations`, `driversnapshots`, `pricenews`) — pass them explicitly, do not rely on pluralisation matching.

- [ ] **Step 1: Write the failing parity test**

The whole plan rests on these schemas matching the app's. If a field name drifts, the ledger silently grows rows the app cannot read.

Create `tests/appdb/schema_parity.test.ts`:

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { PricePredictionModel } from "../../classes/models/PricePrediction";
import { MoveExplanationModel } from "../../classes/models/MoveExplanation";

const appModel = (name: string): string =>
  fs.readFileSync(path.join(__dirname, "..", "..", "app", "server", "models", `${name}.ts`), "utf8");

/** Top-level field names declared in the app's `new Schema<...>({ ... })` block. */
function appFields(src: string): string[] {
  const body = /new Schema<[^>]+>\(\s*\{([\s\S]*?)\n  \},/.exec(src)?.[1] ?? "";
  return [...body.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]!);
}

describe("app-Mongo schema parity", () => {
  // These two collections are an ARCHIVE. A field the backend forgets is a field the app stops
  // seeing on every row written from today on — and there is no way to recompute it later.
  it("PricePrediction declares exactly the app's top-level fields", () => {
    expect(Object.keys(PricePredictionModel.schema.obj).sort()).toEqual(appFields(appModel("PricePrediction")).sort());
  });

  it("MoveExplanation declares exactly the app's top-level fields", () => {
    expect(Object.keys(MoveExplanationModel.schema.obj).sort()).toEqual(appFields(appModel("MoveExplanation")).sort());
  });

  it("writes the collections the app already reads — not mongoose's guess", () => {
    expect(PricePredictionModel.collection.name).toBe("pricepredictions");
    expect(MoveExplanationModel.collection.name).toBe("moveexplanations");
  });
});
```

- [ ] **Step 2: Run it, watch it fail.**

- [ ] **Step 3: Write the bridge**

```ts
// classes/appdb.ts
//
// A SECOND mongoose connection, to the NUXT APP's database — not the backend's.
//
// The prediction ledger (`pricepredictions`) and the move-explanation archive (`moveexplanations`)
// were written by the app for months and cannot be regenerated: nobody can tell you today what a
// grounded model would have forecast on 2026-03-04, and `moveexplanations` also holds rows a human
// researched by hand (POST /api/analysis/backfill). So they are NOT copied into cambio-uy. The
// backend's cron jobs write the very same collections the app already reads, and the app's
// /api/predictions/:currency and /api/analysis/:currency keep working with ZERO changes.
//
// MONGODB_URI (…/cambio-uy) and APP_MONGO_URI (the app's) are different databases — verified. Using
// mongoose.connect() here would hijack the default connection classes/database.ts owns; createConnection
// keeps them separate and lets a single process talk to both.
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

let conn: mongoose.Connection | null = null;

export function appDbConfigured(): boolean {
  return !!process.env.APP_MONGO_URI;
}

export function appConnection(): mongoose.Connection {
  if (conn) return conn;
  const uri = process.env.APP_MONGO_URI;
  if (!uri) {
    throw new Error(
      "APP_MONGO_URI is not set. The prediction ledger and the move-explanation archive live in the " +
        "Nuxt app's database; without this the job would write them to the WRONG database. Copy the " +
        "value from app/.env's MONGO_URI."
    );
  }
  conn = mongoose.createConnection(uri, { maxPoolSize: 5 });
  return conn;
}
```

Each model: `appConnection().model<Doc>('PricePrediction', schema, 'pricepredictions')` — **schema transcribed field-for-field from `app/server/models/*.ts`**, third argument pins the collection name. Wrap the model creation in a lazy getter so importing the module never opens a connection (the unit tests must not need Mongo).

- [ ] **Step 4: Run** `npx vitest run tests/appdb` → PASS (3).

- [ ] **Step 5: Commit.**

---

### Task 8: Price predictions — the ledger

**Highest-value data in this migration.** One doc per `(currency, date)`, unique index, written every day since the feature shipped. It exists so that a future feature can score past forecasts. **It is never moved and never dropped.**

**Files:**
- Create: `classes/predictions/{series,prompt,refresh}.ts`, `sync_predictions.ts`, `tests/predictions/{prompt,series}.test.ts`
- Modify: `ecosystem.config.js`, `package.json`, `scripts/deploy-backend.sh`
- Then: delete `app/server/utils/pricePrediction.ts`, `app/server/utils/externalForecasts.ts`, `app/server/tasks/predictions/daily.ts`, `app/server/api/predictions/ingest.post.ts`, `app/tests/unit/{pricePrediction,externalForecasts}.test.ts`; remove `predictionsIngestToken` from `nuxt.config.ts`; remove the `'20 9 * * *'` line
- **`app/server/api/predictions/[currency].get.ts` is NOT touched.** It reads Mongo; the backend now writes the same rows. That is the whole point.

**Interfaces:**
- `parseAiReply(text): AiPredictionParsed | null` and `computePeriodChanges(series): PeriodChange[]` — pure, ported verbatim from `pricePrediction.ts` (they already have app-side tests; port those too).
- `recordTodayPrediction(currency, asOfOverride?): Promise<{ recorded: boolean; date: string }>` — same contract, same upsert on `(currency, date)`.
- `listActiveCurrencies()` — same, but reading the backend's own rate data **in-process** (`cambio_info` / the same source `server.getJson("/")` serves) instead of HTTP-fetching its own API. The `isPredictableCurrencyCode` filter (drop `UI`/`UR` — they are index units, not currencies) moves with it, comment intact.
- The recent series: the backend **is** the evolution source. Read it from Mongo directly rather than `$fetch`-ing `/evolution/...`.

- [ ] **Step 1: Port the pure tests first**

Create `tests/predictions/prompt.test.ts` — copy the `parseAiReply` and `computePeriodChanges` cases out of `app/tests/unit/pricePrediction.test.ts` verbatim, plus:

```ts
it("never predicts a unit that has no market: UI and UR are dropped", () => {
  expect(isPredictableCurrencyCode("UI")).toBe(false);
  expect(isPredictableCurrencyCode("UR")).toBe(false);
  expect(isPredictableCurrencyCode("USD")).toBe(true);
});
```

- [ ] **Step 2: Run, fail, implement, run, pass.**

- [ ] **Step 3: The job**

`sync_predictions.ts` — one currency at a time, **each in its own try/catch** (today's `predictions:daily` already does this: "a single bad currency can't block the rest"), logging a per-currency summary. Then:

```js
    {
      // Daily AI directional lean + external forecast comparison per live currency.
      // 09:23 UTC ≈ 06:23 America/Montevideo. Minute 23: not a multiple of 5.
      //
      // Writes `pricepredictions` in the NUXT APP's database (classes/appdb.ts) — the same rows
      // app/server/api/predictions/[currency].get.ts already reads. This is a LEDGER: one doc per
      // (currency, date), unique, kept forever so past forecasts can be scored. It is never
      // regenerated and never truncated.
      name: "currency-predictions",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_predictions.js",
      cron_restart: "23 9 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

`sync_predictions.ts` must **refuse to run** when `APP_MONGO_URI` is unset (`appDbConfigured()` → log loudly, `process.exit(1)`). A prediction job that silently writes to the wrong database is worse than one that doesn't run: the app would show nothing, the ledger would fork in two, and nobody would notice for weeks.

- [ ] **Step 4: Verify against the count from Task 0**

Before deploying the app half, on the VPS:

```bash
cd /root/cambio-uruguay && npm run build && node dist/sync_predictions.js
mongosh "$APP_MONGO_URI" --quiet --eval 'db.pricepredictions.countDocuments({})'
```

The count must be **≥ Task 0's count** (it grows by one per currency for today, or stays equal if today's rows already existed — the upsert is idempotent). If it dropped, stop: something wrote the wrong collection.

- [ ] **Step 5: The app half.** Delete the four modules + the task + the ingest route. Remove `predictionsIngestToken` from `runtimeConfig` (its only consumer is the deleted route) and `NUXT_PREDICTIONS_INGEST_TOKEN` from `app/.env`. The manual trigger it provided is replaced by, on the VPS: `cd /root/cambio-uruguay && node dist/sync_predictions.js`. Say so in the commit message.

- [ ] **Step 6: Commit both halves separately.**

---

### Task 9: Move explanations — the archive, and the surgery on `drivers:daily`

`drivers:daily` has three stages: `ingestDrivers` (FRED/argentinadatos — **not Gemini**), `archiveTodayNews` (RSS — **not Gemini**), and `recordTodayExplanation` (**Gemini**). Only the third moves. The task itself stays in nitro with two stages.

`moveexplanations` also holds **hand-researched historical rows** written through `POST /api/analysis/backfill` (real WebSearch citations, never fabricated). Those are irreplaceable. Same treatment as the ledger: the backend writes the same collection.

**Files:**
- Create: `classes/explain/{moves,news,refresh}.ts`, `sync_explain.ts`, `tests/explain/{moves,refresh}.test.ts`
- Modify: `ecosystem.config.js`, `package.json`, `scripts/deploy-backend.sh`
- Then: `app/server/tasks/drivers/daily.ts` (drop the third stage), delete `app/server/utils/{geminiNews,moveExplanation}.ts`
- **`app/server/api/analysis/[currency].get.ts`, `app/server/utils/analysis.ts` and `POST /api/analysis/backfill` are NOT touched.** They read the collection; the backfill route still writes it by hand.

**Interfaces:**
- `recordTodayExplanation(currency, asOfOverride?)` — same contract. Grounded news search first (`classes/gemini.ts`), falling back to the archived-headline + `classes/ai_service.ts` narrative path exactly as the app does today (`chatTextWithFallback` → `aiService`).
- Inputs it needs, and where they come from **in the backend**:
  - the notable-move list → recomputed from the backend's own rate series (it is the rates backend; `buildAnalysis`'s move detection is pure and ports directly),
  - the day's driver values → `classes/models/DriverSnapshot.ts` (app Mongo, read-only — nitro's `drivers:daily` still writes it),
  - the archived headlines for the fallback path → `classes/models/PriceNews.ts` (app Mongo, read-only),
  - `attributeMove` → port `app/utils/attribution.ts` (pure; port its test too).

- [ ] **Step 1: Write the failing test** — `tests/explain/refresh.test.ts`, mocking `classes/gemini` and `classes/ai_service`:
  - a grounded reply with real headlines → the doc stores the **grounded** narrative and those headlines;
  - Gemini returns `null` (no key / "SIN NOTICIAS" / a failure) → it falls back to the archived headlines + the `aiService` narrative, and **still writes the doc** (a missed explanation day is a permanent gap in the archive — that is why the fallback exists);
  - the target date is not a notable move → `{ recorded: false }` and **nothing is written**;
  - both AI paths fail → the doc is written with `narrative: null` and the measured `drivers` (the attribution is real data and is worth keeping even with no prose).

- [ ] **Step 2: Run, fail, implement, run, pass.**

- [ ] **Step 3: The job + pm2**

```js
    {
      // Move explanations for /por-que-sube-el-dolar and the histórico chart markers.
      // 10:07 UTC ≈ 07:07 America/Montevideo — comfortably AFTER nitro's drivers:daily (09:15 UTC),
      // which still ingests the driver snapshots and archives the news this job reads. Minute 7: not
      // a multiple of 5. Clear of currency-aduana (Mondays 09:30) so two Gemini jobs never overlap.
      //
      // Writes `moveexplanations` in the NUXT APP's database (classes/appdb.ts) — an ARCHIVE that
      // also holds rows a human researched by hand via POST /api/analysis/backfill. Never truncated.
      name: "currency-explain",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_explain.js",
      cron_restart: "7 10 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

Currencies: `['USD', 'EUR', 'ARS']` — the same `EXPLAINED_CURRENCIES` list, comment intact.

⚠️ **The decoupling risk, stated plainly:** today the explanation runs in the same process, immediately after the ingest, so it always sees fresh drivers. Now there is a 52-minute gap and two processes. If `drivers:daily` fails or is slow, `currency-explain` attributes the move using yesterday's driver snapshot and the attribution is weaker (or empty). It still records the move and the narrative. It is idempotent — re-running it later that day (`node dist/sync_explain.js`) repairs the row. Log it explicitly when the newest `DriverSnapshot` is older than the target date.

- [ ] **Step 4: Surgery on `drivers:daily`** — delete the `recordTodayExplanation` import, the `EXPLAINED_CURRENCIES` explanation loop and the `result.explanations` block. **Keep** `ingestDrivers(['USD','EUR','ARS'])` and `archiveTodayNews('USD')` and their comments verbatim (they explain why the currency lists differ — that comment is load-bearing). Update the task's `description` and the `nuxt.config.ts` comment above `'15 9 * * *'` to say the explanations moved to the backend.

- [ ] **Step 5: Verify** — on the VPS, after deploying: `node dist/sync_explain.js`, then check `/api/analysis/USD` still returns explanations for recent notable days, and `db.moveexplanations.countDocuments({})` is **≥ Task 0's count**.

- [ ] **Step 6: Commit both halves separately.**

---

### Task 10: The cutover — prove the app cannot reach Gemini

Only now is the key removed. The proof is two tests and a grep, not a memory.

**Files:**
- Create: `app/tests/unit/noGeminiInApp.test.ts`, `tests/gemini_key_ownership.test.ts`
- Modify: `app/nuxt.config.ts` (delete `geminiApiKey` from `runtimeConfig`), `app/.env` and the VPS's `app/.env` (delete `NUXT_GEMINI_API_KEY`)
- Delete: `app/utils/geminiGrounding.ts`, `app/tests/unit/geminiGrounding.test.ts`

- [ ] **Step 1: Write the gate — it must FAIL first**

Create `app/tests/unit/noGeminiInApp.test.ts`:

```ts
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// The rule: the Gemini key lives ONLY in the root .env, and anything that uses Gemini lives in the
// root Express backend. This test is what makes that a fact instead of an intention. It fails the
// moment somebody adds a Gemini call back into app/ — which is exactly how the first one got here.
const APP_ROOT = path.resolve(__dirname, '..', '..')
const SKIP = new Set(['node_modules', '.nuxt', '.output', '.data', 'dist', '.git', 'coverage', 'test-results'])
const EXTS = new Set(['.ts', '.js', '.vue', '.mjs', '.cjs'])

const BANNED: Array<[RegExp, string]> = [
  [/generativelanguage\.googleapis\.com/, 'a direct call to the Gemini API'],
  [/\bgeminiApiKey\b/, 'a read of the Gemini key from runtimeConfig'],
  [/\bNUXT_GEMINI_API_KEY\b/, 'a read of the Gemini key from the environment'],
  [/google_search/, 'a Gemini grounding tool declaration'],
]

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (EXTS.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

describe('no Gemini in the Nuxt app', () => {
  it('has no file that calls Gemini or reads its key', () => {
    const self = path.resolve(__filename)
    const hits: string[] = []
    for (const file of walk(APP_ROOT)) {
      if (path.resolve(file) === self) continue // this test names the patterns it bans
      const src = fs.readFileSync(file, 'utf8')
      for (const [re, why] of BANNED) {
        if (re.test(src)) hits.push(`${path.relative(APP_ROOT, file)} — ${why}`)
      }
    }
    expect(hits, `Gemini belongs in the root Express backend (classes/gemini.ts), not in app/:\n${hits.join('\n')}`).toEqual([])
  })
})
```

- [ ] **Step 2: Run it — it must fail, listing exactly what is left**

Run (from `app/`): `npx vitest run tests/unit/noGeminiInApp.test.ts`
Expected: FAIL, listing `nuxt.config.ts`, `utils/geminiGrounding.ts` and `tests/unit/geminiGrounding.test.ts` — **and nothing else.** If it lists anything else, a task above was left half-done: go finish it. Do not delete the leftover to make the test pass.

- [ ] **Step 3: Remove the last three**

- `app/nuxt.config.ts`: delete the `geminiApiKey: process.env.NUXT_GEMINI_API_KEY || '',` line **and its comment block** (lines ~705–709).
- `git rm app/utils/geminiGrounding.ts app/tests/unit/geminiGrounding.test.ts` — its only consumers were the four modules deleted in Tasks 2–9. Confirm with `grep -rn "geminiGrounding" app/ --exclude-dir=node_modules` returning nothing.

- [ ] **Step 4: Run the gate again** → PASS.

- [ ] **Step 5: The backend's half of the same promise**

Create `tests/gemini_key_ownership.test.ts`:

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");

describe("the Gemini key has exactly one owner", () => {
  // One client, one key read. Eight modules each rolling their own $fetch to
  // generativelanguage.googleapis.com is how the app ended up with an unresolved-redirect grounding
  // bug in four places at once. In the backend there is one file, and it is classes/gemini.ts.
  it("only classes/gemini.ts talks to the Gemini endpoint", () => {
    const callers: string[] = [];
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", "dist", ".git", "app", "mcp", "bots", "docs"].includes(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
          if (/generativelanguage\.googleapis\.com/.test(fs.readFileSync(full, "utf8"))) {
            callers.push(path.relative(ROOT, full));
          }
        }
      }
    };
    walk(ROOT);
    expect(callers).toEqual(["classes/gemini.ts"]);
  });
});
```

**Note:** `classes/aduana/gemini.ts` is now a re-export shim with no endpoint string in it, so it does not match. If it does, the shim was not applied.

- [ ] **Step 6: Remove the key from the environments**

Local: delete the `NUXT_GEMINI_API_KEY` line (and its comment) from `app/.env`.
VPS: `ssh -p 2223 root@104.234.204.107` → edit `/root/cambio-uruguay/app/.env`, delete the same line. **Do this only after the app half of every task above is deployed** — `runtimeConfig` is baked at `nuxt build` time, so an app still running an older build keeps using the value baked into it, and a *rebuild* without the key is what actually turns the old code off.

Confirm the backend still has it: `grep -c '^GEMINI_API_KEY=' /root/cambio-uruguay/.env` → `1`.

**Do NOT remove `NUXT_GEMINI_API_KEY` from `classes/gemini.ts#geminiConfigured`.** It is a harmless second env name the backend accepts, `tests/aduana/gemini.test.ts` asserts it, and it is the reason the customs norms gate survived the months when the root `.env` had no `GEMINI_API_KEY` at all.

- [ ] **Step 7: Run everything**

```bash
npx vitest run                    # root
cd app && npx vitest run && npm run lint
```

(`npm run typecheck` in `app/` crashes on `vue-tsc` — a known repo issue. Use `npm run lint`.)

- [ ] **Step 8: Commit**

```bash
git add app/nuxt.config.ts app/tests/unit/noGeminiInApp.test.ts tests/gemini_key_ownership.test.ts app/.env.example
git rm app/utils/geminiGrounding.ts app/tests/unit/geminiGrounding.test.ts
git commit -m "refactor(gemini)!: the app can no longer reach Gemini — key and client live only in the backend"
```

---

### Task 11: Deploy and verify

- [ ] **Step 1: Final `ecosystem.config.js` review** — seven new fork/cron apps, none `exec_mode: "cluster"`, none `autorestart: true`, every minute not a multiple of 5:

| pm2 app | cron (UTC) | ≈ Montevideo | Gemini calls / run |
|---|---|---|---|
| `currency-loans` | `47 8 * * *` | 05:47 | ~8 (only lenders with no regex parser) |
| `currency-predictions` | `23 9 * * *` | 06:23 | ~2 × live currencies (the heaviest after banks) |
| `currency-costs` | `43 9 * * *` | 06:43 | 1 |
| `currency-figures` | `52 9 * * *` | 06:52 | 1 |
| `currency-explain` | `7 10 * * *` | 07:07 | ≤ 3 |
| `currency-banks-news` | `37 10 * * *` | 07:37 | ~36 (3 langs × 11 entities + 3 synthesis) |
| `currency-debt-relief` | `13 10 1 * *` | 07:13, 1st | 1 |

Existing, unchanged: `currency-sync` (`*/5`), `currency-aduana` (`30 9 * * 1`), `currency-server` (cluster ×2), `currency-sheet`, `currency-mcp`, the bots. Nitro keeps: `drivers:daily` 09:15 (2 stages), `blog:daily` 09:30, `figures:drift` 10:05 (new, no AI), `reddit:sentiment` 10:10, `telegram:summary` 11:00, `newsletter:daily` 12:00, `alerts:check` */10, `couriers:scrape` 08:15, `withdraw:iva-check` Mon 09:00, `casas:reviews` Mon 07:30.

- [ ] **Step 2: `scripts/deploy-backend.sh`** — the array reads:

```bash
OTHER_APPS=(currency-sync currency-aduana currency-sheet currency-banks-news currency-figures currency-costs currency-debt-relief currency-loans currency-predictions currency-explain)
```

- [ ] **Step 3: `tests/no_scheduler_in_api.test.ts` must still pass.** Nothing in this plan adds a timer to `index.ts` — the five new routes are pure reads. Run `npx vitest run tests/no_scheduler_in_api.test.ts` and confirm.

- [ ] **Step 4: Deploy and smoke-test each endpoint**

```bash
for p in banks-news uy-figures cost-of-living debt-relief loan-rates; do
  echo "--- /$p"; curl -fsS "https://api.cambio-uruguay.com/$p" | head -c 200; echo;
done
```

Then each page: `/mejores-bancos-uruguay`, `/salud-financiera`, `/herramientas/costo-de-vida`, `/saldar-deudas-uruguay`, `/prestamos-uruguay`, `/historico`, `/por-que-sube-el-dolar`.

- [ ] **Step 5: Prove the fallbacks.** Stop the backend (`pm2 stop currency-server`), reload each of the seven pages, confirm every one renders its baseline with **no error and no empty shell**, restart (`pm2 start currency-server`). This is the only way to know the fallbacks are real.

- [ ] **Step 6: Commit + update the memory note.**

---

## Risks

**If the backend is unreachable**, each page degrades to a named, tested state — never a blank:

| Page | Degrades to |
|---|---|
| `/mejores-bancos-uruguay` | full tier list (static), **no news cards, no sector analysis** |
| `/salud-financiera` | the verified 2026 figures baseline (salario mínimo 25 383, BPC 6 864, boleto 52, inflación 4,3 %) with no "actualizado" stamp |
| `/herramientas/costo-de-vida` | the verified `COST_MODEL` baseline; the tool works fully, the numbers are the last human-verified ones |
| `/saldar-deudas-uruguay` | `DEBT_RELIEF_BASELINE`'s usury caps; every calculator still runs |
| `/prestamos-uruguay` | `LENDERS`' seed catalogue TEAs, `updatedAt: null` |
| `/historico`, `/por-que-sube-el-dolar` | **unaffected** — they read Mongo directly, and Mongo is not the backend API |

Note the asymmetry, and that it is deliberate: the two features whose data is irreplaceable are also the two the backend's availability cannot break, because the app keeps reading them straight from the database.

**A task interrupted mid-migration.** The window that matters is between "the nitro task is deleted" and "the pm2 cron app runs for the first time". CI deploys the app *before* the backend (`backend-deploy` `needs: deploy`), so a single push can open that window — hence the two-commit-per-task rule. Inside the window nothing is lost: the fs snapshots and the Mongo rows from the last successful nitro run are still there, the proxies serve them or the baseline, and the first cron run overwrites them. The one thing you must not do is delete `app/.data/loans/rates.json` before `import_loan_history.ts` has run.

**Is any of this heavy enough to matter for the API's 2-instance cluster?** No — **because none of it runs in the API process.** That is the entire reason for the seven pm2 cron apps. What the API gains is a route that reads one small Mongo document behind a 30-minute Redis cache; what it loses is nothing. Two numbers make the point: `/api/banks-news` today can cost a *single visitor* ~36 Gemini calls in-request (the first one after the 24 h cache expires), and `predictions:daily` fans out ~2 calls per live currency. Neither ever touches `currency-server` again. `tests/no_scheduler_in_api.test.ts` is the tripwire that keeps it that way — and if any of these jobs is ever "temporarily" moved into `index.ts`, it will run **twice a day, not once**, because there are two instances.

**The one thing that can still go quietly wrong:** `APP_MONGO_URI` pointing at the wrong database. Then `sync_predictions` and `sync_explain` would append to a *fork* of the ledger — the app would show yesterday's rows forever, and the damage would be invisible for weeks. That is why Task 0 records the counts, Task 7 has a schema-parity test that pins the collection names, and Task 8's job **refuses to start** rather than guess.
