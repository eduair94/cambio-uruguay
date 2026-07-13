# `/problemas-con-la-aduana-uruguay` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a symptom-first customs help hub for Uruguay — 12 problem buckets, each with the norm, a step-by-step plan of action, and real cited r/uruguay testimonies — plus 4 interactive tools, all fed by a weekly-refreshed API in the root Express backend.

**Architecture:** All data (legal facts, problem procedures, Reddit quotes) lives in the root Express backend: a `classes/aduana/*` module, a weekly pm2 job (`sync_aduana.ts`), and a public `GET /aduana` route. The AI proposes facts but never publishes them — deterministic validators + a diff gate keep the last-good value and flag changes for a human. The Nuxt page holds zero rules and zero amounts: it consumes a cached nitro proxy (`/api/aduana`) with a last-good → baseline fallback so it never blanks.

**Tech Stack:** TypeScript, Express, Mongoose (MongooseServer), pm2 cron apps, OpenAI-compatible `classes/ai_service.ts`, Reddit OAuth (`classes/reddit.ts`), vitest (root + app), Nuxt 3 / Vuetify, Playwright.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-12-problemas-aduana-uruguay-design.md`. Read it before Task 1.
- **The Nuxt page contains no rule, amount, deadline, or norm citation as a literal.** Everything renders from `/api/aduana`. The only literals allowed in `.vue` are UI copy (labels, headings, help text).
- **Never invent a legal fact.** Every fact carries `sourceUrl` (official `*.gub.uy` domain) + `article` + `verifiedAt`.
- **Do NOT "verify" anything against `aduanas.gub.uy/innovaportal/v/27950` ("Encomiendas Postales")** — it still publishes the repealed Decreto 356/014 (USD 10 minimum, USD 200 per shipment) and will happily "confirm" numbers we already know are wrong. Same for any page repeating those figures.
- **Link the PDF** (`/innovaportal/file/.../*.pdf`), never the Aduanas HTML stub pages (they are a title + a link).
- **RG DNA 09/2026's PDF is a scan with no text layer.** `pdftotext` / WebFetch return empty. It must be rendered to images to be read. An automated grep of it will silently "find nothing" — that is not evidence of absence.
- **The verified regime** (already live in `app/utils/importRules.ts`, fixed 2026-07-11 after an adversarial pass): Ley 20.446 art. 627 → Decreto 50/026 → RG DNA 09/2026. Two regimes, **mutually exclusive**: *franquicia* = USD 800/year accumulated across max 3 shipments, ≤20 kg, exempt from tariffs but **still pays IVA** except US invoices ≤ USD 200 (TIFA, Ley 18.761 art. 7 g, **all-or-nothing**); *prestación única* = 60% of invoice value, **minimum USD 20 per shipment**, applied to the **whole shipment**, never split. Threshold is measured on the **invoice total** (price + US sales tax + seller-charged shipping — Decreto art. 5).
- **Over USD 800 → general regime, and the DNA DOES require a despachante — but the law says the opposite. Ship both halves.** The rule to encode, in this order: **"La DNA exige despachante por encima de USD 800 (`v/28223`) — en la práctica vas a necesitar uno. La ley dice lo contrario: Ley 20.446 art. 627, Decreto 50/026 art. 17, CAROU art. 15 lit. A."** The DNA quote is real and verbatim (*"se requiere la contratación de un Despachante de Aduana… es preceptiva"*). The legal side is equally real: art. 627's despachante sentence is a **standalone paragraph** with an unqualified subject (two paragraphs earlier the drafter wrote *"**El referido** régimen…"* — he used anaphora when he meant to scope, and did not here); Decreto 50/026 **art. 1** defines that decree's scope **by weight only** (≤20 kg, **no USD 800 in it**), so art. 17's *"las operaciones reguladas por este Decreto"* is broad; and **CAROU art. 15 lit. A** exempts *"Envíos postales internacionales de carácter no comercial"* **with no value cap** (lit. C's USD 200 cap is for *commercial* express shipments, which is why lit. A needs none). **Never write "por ley es preceptivo". Never cite CAROU art. 14 for it** — art. 14 only defines and empowers the despachante; it is not a preceptiveness rule. And **never tell a reader they can skip the despachante**, because at the counter they cannot. Give them the practice they will hit *and* the argument they have if they want to fight it. (Research doc §3.1 and §7.6.)
- **The URSEC indemnity belongs to the IMPOSITOR, not to the recipient.** Res. URSEC 185/016 arts. 22/23/24 all read *"el **impositor** tendrá derecho a una indemnización"*, and Ley 19.009 art. 6 lit. H says *"el envío es propiedad del remitente hasta el momento de la entrega"*. So for a parcel that **never arrived**, the Uruguayan buyer never owned it and the impositor is the foreign seller: the recipient can **file** (arts. 6 and 10) but needs the seller to claim, or to **cede under art. 26**, to **collect**. No copy may say "te tienen que pagar a vos" for an undelivered shipment. (Research doc §4.3, §4.11.)
- **No article says "la franquicia no se parte".** Decreto 50/026 **art. 15** is titled *"Aplicación de prestación única en casos de **incumplimiento**"* and triggers *"en los términos previstos por el artículo 632"* — it is the right cite for **recalificación**, and the wrong one for **quota exhaustion**. The behaviour is probably right by regime design, but it ships **without an article** and with the caveat, never attributed to art. 15. `app/utils/importRules.ts` (~line 119) carries the identical mis-citation in its comment and needs the same fix upstream (code is fine; the comment is not). (Research doc §7.8.)
- **The "24 h tracking event" rule is domestic-only** (Decreto 209/017 **art. 16 lit. b**; art. 16 is titled *"Parámetros de calidad de las encomiendas **NACIONALES**"*). `demora-extrema` is entirely about international shipments — the rule does **not** go in that bucket.
- **`factura-exigida` is not what Reddit thinks it is.** RG DNA 09/2026 does **not** demand documentation from the buyer: it requires the **foreign seller** to register with the DNA — in person, through GEX, with a notarial certificate issued in Uruguay. The buyer cannot comply even if they want to. The page must not send people hunting for a document that does not exist.
- **Do not touch `classes/couriers/`.** A concurrent session owns it. Note: `sync_couriers.ts` imports `./classes/couriers/opinions`, which does not exist on disk or in git — **the root backend does not compile right now**. Your tasks must not depend on `npm run build` succeeding at the repo level until that lands; use `npx vitest run` and `npx tsc --noEmit` scoped checks instead where noted.
- **Root repo deploy is manual** (VPS: git pull + npm install + npm run build + pm2 restart). It is NOT covered by `app/scripts/deploy.sh`.
- Commit after every task. Conventional Commits.

---

## File Structure

**Root backend (new):**
- `classes/aduana/types.ts` — `AduanaDoc`, `AduanaFact`, `ProblemEntry`, `Quote`, `BucketId`, `Source`.
- `classes/aduana/baseline.ts` — the human-verified snapshot: facts, sources, the 12 problem procedures. The floor and the fallback.
- `classes/aduana/store.ts` — `MongooseServer("aduana_data")`, single doc, load/save.
- `classes/aduana/harvest.ts` — Reddit search → `aduana_reddit_posts` / `aduana_reddit_comments`, dedupe by id.
- `classes/aduana/classify.ts` — AI labels one text → bucket/lesson/quote; deterministic aggregation of labels into `quotes` + `counts`.
- `classes/aduana/norms.ts` — weekly AI fact proposal + validators + diff gate.
- `classes/aduana/payload.ts` — builds the public JSON.
- `sync_aduana.ts` — pm2 job entry.
- `tests/aduana/{baseline,classify,norms,payload}.test.ts`

**Root backend (modified):**
- `index.ts` — add `server.getJson("aduana", …)` + swagger block.
- `ecosystem.config.js` — add pm2 app `currency-aduana`.

**Nuxt app (new):**
- `app/server/api/aduana.get.ts` — cached proxy + fallback.
- `app/server/utils/aduanaFallback.ts` — the embedded baseline used when the backend is unreachable.
- `app/pages/problemas-con-la-aduana-uruguay.vue` — the page.
- `app/utils/aduanaTools.ts` — pure logic for the 4 tools (charge verifier, franchise counter, claim generator, diagnosis routing).
- `app/tests/unit/aduanaTools.test.ts`
- `app/tests/e2e/problemas-aduana.spec.ts`

**Nuxt app (modified):**
- `app/utils/siteNav.ts` — register the page (a page missing here fails the nav coverage test).

---

### Task 1: Research — the norms and procedures behind each bucket

No code. This produces the verified content every later task depends on. **Nothing may be written into `baseline.ts` that is not in this document with an official source.**

**Files:**
- Create: `docs/superpowers/research/2026-07-12-aduana-problemas-research.md`

**Interfaces:**
- Produces: for each of the 12 bucket ids (`retenido`, `factura-exigida`, `roto-o-incompleto`, `cobro-abusivo`, `franquicia-agotada`, `supera-monto`, `prohibido-o-restringido`, `decomiso-subasta`, `comercial-vs-personal`, `encomienda-regalo`, `demora-extrema`, `mudanza-y-viajero`): the governing norm (decreto/ley/RG + **article**), the official URL (PDF), the procedure (numbered steps), the legal deadline if any, the body to complain to, and the required document. Later tasks copy this verbatim.

- [ ] **Step 1: Re-read the verified regime**

Read `app/utils/importRules.ts` end to end (179 lines). It is the output of an adversarial verification pass against IMPO / Aduanas / MEF. Its constants are ground truth for the amounts; do not re-derive them from press articles.

- [ ] **Step 2: Verify the April 2026 resolution (the `factura-exigida` bucket)**

This is the hottest live pain in the corpus ("Requisitos imposibles para la exoneración de IVA en compras de USA", 214 comments). Find the actual RG DNA text on `aduanas.gub.uy` (PDF) and record: what document it demands, from whom, in what format, and from what date. Remember RG 09/2026 is a scan — render it to images if grep returns empty.

- [ ] **Step 3: Verify the complaint channels**

For each of: the courier (contractual), the DNA (Aduanas), Defensa del Consumidor (Área de Defensa del Consumidor, MEF), URSEC (postal service). Record the actual intake URL and what each one can and cannot do. A guide that sends people to the wrong desk is worse than no guide.

- [ ] **Step 4: Record what could NOT be verified**

An explicit "unverified — do not publish" section. Precedent: the IVA taxable base (Decreto art. 3 defers to Título 10 art. 13 lit. B of the TO 2023, which IMPO serves as empty shells) and the DNA's public register of exonerated sellers (RG 09 num. 9 says it "será público" but no URL exists). If a bucket's procedure cannot be sourced, it ships as "no lo pudimos verificar" — never as a confident invention.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/research/2026-07-12-aduana-problemas-research.md
git commit -m "docs(aduana): verified norms and complaint procedures per problem bucket"
```

---

### Task 2: Backend types, store, and the verified baseline

**Files:**
- Create: `classes/aduana/types.ts`, `classes/aduana/baseline.ts`, `classes/aduana/store.ts`
- Test: `tests/aduana/baseline.test.ts`

**Interfaces:**
- Consumes: the research doc from Task 1.
- Produces:
  - `types.ts`: `type BucketId = 'retenido' | 'factura-exigida' | 'roto-o-incompleto' | 'cobro-abusivo' | 'franquicia-agotada' | 'supera-monto' | 'prohibido-o-restringido' | 'decomiso-subasta' | 'comercial-vs-personal' | 'encomienda-regalo' | 'demora-extrema' | 'mudanza-y-viajero'`; interfaces `AduanaFact`, `Source`, `Quote`, `ProblemEntry`, `AduanaDoc` (exact shapes below).
  - `baseline.ts`: `export const BASELINE: AduanaDoc`, `export const FACT_RANGES: Record<string, [number, number]>`, `export const OFFICIAL_HOSTS: string[]`.
  - `store.ts`: `loadAduanaDoc(): Promise<AduanaDoc>`, `saveAduanaDoc(doc: AduanaDoc): Promise<void>`, `emptyAduanaDoc(): AduanaDoc`.

- [ ] **Step 1: Write the types**

Create `classes/aduana/types.ts`:

```ts
// Shapes for the customs problem hub (/problemas-con-la-aduana-uruguay).
//
// One AduanaDoc is the whole public payload: the legal facts (each one sourced), the twelve
// problem procedures, and the Reddit testimonies that back them. It is stored as a single Mongo
// document and served whole — the data set is small and always read in full.

export type BucketId =
  | "retenido"
  | "factura-exigida"
  | "roto-o-incompleto"
  | "cobro-abusivo"
  | "franquicia-agotada"
  | "supera-monto"
  | "prohibido-o-restringido"
  | "decomiso-subasta"
  | "comercial-vs-personal"
  | "encomienda-regalo"
  | "demora-extrema"
  | "mudanza-y-viajero";

export const BUCKET_IDS: BucketId[] = [
  "retenido",
  "factura-exigida",
  "roto-o-incompleto",
  "cobro-abusivo",
  "franquicia-agotada",
  "supera-monto",
  "prohibido-o-restringido",
  "decomiso-subasta",
  "comercial-vs-personal",
  "encomienda-regalo",
  "demora-extrema",
  "mudanza-y-viajero",
];

/** A norm we cite. `url` MUST be the PDF, never an Aduanas HTML stub page. */
export interface Source {
  id: string;
  title: string;
  norm: string; // 'Decreto 50/026'
  url: string;
  checkedAt: string; // ISO date
}

/** One legal fact. `origin` records whether a human or the AI put the current value there. */
export interface AduanaFact {
  id: string; // 'franquicia.tope_anual_usd'
  label: string;
  value: number | string;
  unit?: "USD" | "dias" | "pct" | "kg";
  sourceId: string; // → Source.id
  article?: string; // 'art. 15'
  verifiedAt: string;
  origin: "baseline" | "ai";
}

/** A cited testimony. Text is trimmed, never rewritten. */
export interface Quote {
  text: string;
  author: string;
  date: string; // 'YYYY-MM-DD'
  score: number;
  permalink: string;
}

/** One problem bucket: what the norm says, what to do, and the claim template. */
export interface ProblemEntry {
  id: BucketId;
  title: string;
  symptom: string; // what the user would say happened to them
  norm: string; // plain-language statement of the rule
  sourceIds: string[];
  steps: string[]; // numbered plan of action
  deadline?: string; // legal deadline, when one exists
  claimBody?: "courier" | "dna" | "defensa-consumidor" | "ursec";
  claimTemplate?: string; // {{tracking}}, {{fecha}}, {{descripcion}} placeholders
  verified: boolean; // false → the page says "no lo pudimos verificar"
}

export interface AduanaDoc {
  facts: AduanaFact[];
  problems: ProblemEntry[];
  quotes: Partial<Record<BucketId, Quote[]>>;
  counts: Partial<Record<BucketId, number>>;
  sources: Source[];
  /** Fact ids the AI wanted to change and we did NOT publish. Surfaced in logs and /estado. */
  pendingReview: string[];
  updatedAt: string | null;
}
```

- [ ] **Step 2: Write the failing drift-guard test**

The amounts on this page must never contradict the calculator on `/franquicia-aduana-uruguay`. We cannot `import` from `app/` — the root `tsconfig` excludes it, and pulling it into the program would move tsc's common source root and relocate `dist/index.js`, breaking every pm2 path. So we read the file as **text** and assert against it.

Create `tests/aduana/baseline.test.ts`:

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BASELINE, FACT_RANGES, OFFICIAL_HOSTS } from "../../classes/aduana/baseline";
import { BUCKET_IDS } from "../../classes/aduana/types";

/** Read a `export const NAME = 123` numeric constant straight out of the app's rules module. */
function appConstant(name: string): number {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "..", "app", "utils", "importRules.ts"),
    "utf8"
  );
  const m = new RegExp(`export const ${name} = (\\d+(?:\\.\\d+)?)`).exec(src);
  if (!m) throw new Error(`${name} not found in app/utils/importRules.ts`);
  return Number(m[1]);
}

const factValue = (id: string): number => {
  const f = BASELINE.facts.find((x) => x.id === id);
  if (!f) throw new Error(`baseline fact missing: ${id}`);
  return Number(f.value);
};

describe("aduana baseline", () => {
  // The bug we already shipped once: a rule on one page contradicting the same rule on another.
  it("never contradicts the calculator's verified rules", () => {
    expect(factValue("franquicia.tope_anual_usd")).toBe(appConstant("FRANCHISE_ANNUAL_USD"));
    expect(factValue("franquicia.max_envios")).toBe(appConstant("FRANCHISE_MAX_SHIPMENTS"));
    expect(factValue("franquicia.peso_max_kg")).toBe(appConstant("MAX_WEIGHT_KG"));
    expect(factValue("prestacion_unica.tasa_pct")).toBe(appConstant("SIMPLIFIED_RATE_PCT"));
    expect(factValue("prestacion_unica.minimo_usd")).toBe(appConstant("SIMPLIFIED_MIN_USD"));
    expect(factValue("tifa.exoneracion_usd")).toBe(appConstant("USA_IVA_EXEMPTION_USD"));
  });

  it("sources every fact to an official domain, with an article", () => {
    for (const f of BASELINE.facts) {
      const src = BASELINE.sources.find((s) => s.id === f.sourceId);
      expect(src, `fact ${f.id} has no source`).toBeDefined();
      const host = new URL(src!.url).hostname;
      expect(OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))).toBe(true);
      expect(f.origin).toBe("baseline");
    }
  });

  it("covers all twelve buckets, and no unverified entry claims a procedure", () => {
    expect(BASELINE.problems.map((p) => p.id).sort()).toEqual([...BUCKET_IDS].sort());
    for (const p of BASELINE.problems) {
      if (p.verified) expect(p.steps.length).toBeGreaterThan(0);
      else expect(p.steps).toEqual([]);
    }
  });

  it("gives every numeric fact a plausibility range for the AI gate", () => {
    for (const f of BASELINE.facts) {
      if (typeof f.value === "number") expect(FACT_RANGES[f.id]).toBeDefined();
    }
  });
});
```

- [ ] **Step 3: Run it, watch it fail**

Run: `npx vitest run tests/aduana/baseline.test.ts`
Expected: FAIL — `Cannot find module '../../classes/aduana/baseline'`.

- [ ] **Step 4: Write `baseline.ts` from the research doc**

Create `classes/aduana/baseline.ts`. The facts below are the verified regime (Global Constraints); **the twelve `problems` entries are transcribed from Task 1's research document** — norm, steps, deadline, claim body and template. A bucket whose procedure Task 1 could not source ships `verified: false` and `steps: []`.

```ts
// The human-verified snapshot: the floor under everything the AI may later propose, and the
// fallback the API serves when Mongo or the sync job has nothing. Every number here was checked
// against the norm (decreto/ley/RG + article), not against a press article and not against
// aduanas.gub.uy/innovaportal/v/27950 — that page still publishes the REPEALED Decreto 356/014.
import type { AduanaDoc } from "./types";

/** Hosts we accept as a source of law. Anything else is rejected by the norms gate. */
export const OFFICIAL_HOSTS = ["gub.uy", "impo.com.uy"];

/** Plausible range per numeric fact. A proposal outside its range is rejected, never published. */
export const FACT_RANGES: Record<string, [number, number]> = {
  "franquicia.tope_anual_usd": [100, 5000],
  "franquicia.max_envios": [1, 12],
  "franquicia.peso_max_kg": [1, 100],
  "prestacion_unica.tasa_pct": [1, 100],
  "prestacion_unica.minimo_usd": [1, 200],
  "tifa.exoneracion_usd": [50, 1000],
};

export const BASELINE: AduanaDoc = {
  sources: [
    // ...from the research doc; PDF urls only.
  ],
  facts: [
    {
      id: "franquicia.tope_anual_usd",
      label: "Tope anual de la franquicia",
      value: 800,
      unit: "USD",
      sourceId: "decreto-50-026",
      article: "art. 3",
      verifiedAt: "2026-07-11",
      origin: "baseline",
    },
    // franquicia.max_envios = 3, franquicia.peso_max_kg = 20,
    // prestacion_unica.tasa_pct = 60, prestacion_unica.minimo_usd = 20,
    // tifa.exoneracion_usd = 200 — same shape, articles from the research doc.
  ],
  problems: [
    // The twelve ProblemEntry objects, transcribed from the research doc.
  ],
  quotes: {},
  counts: {},
  pendingReview: [],
  updatedAt: null,
};
```

- [ ] **Step 5: Write the store**

Create `classes/aduana/store.ts` — same single-document shape as `classes/couriers/store.ts` (read it first, mirror it; do not modify it):

```ts
// One Mongo document (`aduana_data`) holding the whole public payload. Small, always read whole,
// always written whole by the weekly job — the same shape as the courier store.
import { Schema } from "mongoose";
import { MongooseServer } from "../database";
import { BASELINE } from "./baseline";
import type { AduanaDoc } from "./types";

const KEY = "aduana_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("aduana_data", schema);

/** What every reader falls back to before the first sync has run: the verified baseline. */
export function emptyAduanaDoc(): AduanaDoc {
  return JSON.parse(JSON.stringify(BASELINE)) as AduanaDoc;
}

export async function loadAduanaDoc(): Promise<AduanaDoc> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  const doc = rows[0]?.doc as Partial<AduanaDoc> | undefined;
  return { ...emptyAduanaDoc(), ...(doc ?? {}) };
}

export async function saveAduanaDoc(doc: AduanaDoc): Promise<void> {
  await server().updateOneRaw({ key: KEY }, { $set: { key: KEY, doc } }, { upsert: true });
}
```

Check the exact upsert helper name on `MongooseServer` in `classes/database.ts` and mirror what `classes/couriers/store.ts` calls — use that, not the name guessed here.

- [ ] **Step 6: Run the test**

Run: `npx vitest run tests/aduana/baseline.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add classes/aduana/types.ts classes/aduana/baseline.ts classes/aduana/store.ts tests/aduana/baseline.test.ts
git commit -m "feat(aduana): verified fact baseline, problem procedures and store"
```

---

### Task 3: Harvest r/uruguay into the aduana corpus

**Files:**
- Create: `classes/aduana/harvest.ts`
- Test: `tests/aduana/harvest.test.ts`

**Interfaces:**
- Consumes: `classes/reddit.ts` (already in main): `searchSubreddit(sub, q, opts)`, `fetchComments(postId, known)`, `redditConfigured()`, types `RedditPostRaw` / `RedditCommentRaw`. Read it before writing — do not re-port it.
- Produces: `harvestAduana(opts?: { window?: 'year' | 'all' }): Promise<{ posts: number; comments: number }>`; `AduanaPostModel`, `AduanaCommentModel` (own collections, so the concurrent couriers work cannot collide).

- [ ] **Step 1: Write the failing test**

Create `tests/aduana/harvest.test.ts`. Mock the Reddit client — a unit test must never hit the network:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchSubreddit = vi.fn();
const fetchComments = vi.fn();
vi.mock("../../classes/reddit", () => ({
  redditConfigured: () => true,
  searchSubreddit: (...a: unknown[]) => searchSubreddit(...a),
  fetchComments: (...a: unknown[]) => fetchComments(...a),
}));

const upserted: unknown[] = [];
vi.mock("../../classes/aduana/corpus", () => ({
  upsertPosts: (rows: unknown[]) => {
    upserted.push(...rows);
    return Promise.resolve(rows.length);
  },
  upsertComments: (rows: unknown[]) => Promise.resolve(rows.length),
  knownCommentIds: () => Promise.resolve(new Set<string>()),
}));

import { ADUANA_QUERIES, harvestAduana } from "../../classes/aduana/harvest";

describe("harvestAduana", () => {
  beforeEach(() => {
    upserted.length = 0;
    searchSubreddit.mockReset();
    fetchComments.mockReset();
  });

  it("searches every query and dedupes a thread surfaced by two of them", async () => {
    const post = {
      id: "abc",
      sub: "uruguay",
      title: "paquete retenido",
      selftext: "",
      author: "u1",
      score: 5,
      numComments: 2,
      permalink: "https://reddit.com/x",
      createdUtc: 1700000000,
      url: "",
    };
    searchSubreddit.mockResolvedValue([post]);
    fetchComments.mockResolvedValue([]);

    const out = await harvestAduana();

    expect(searchSubreddit).toHaveBeenCalledTimes(ADUANA_QUERIES.length);
    expect(out.posts).toBe(1); // surfaced by N queries, stored once
    expect(upserted).toHaveLength(1);
  });

  it("is a silent no-op without credentials", async () => {
    vi.doMock("../../classes/reddit", () => ({ redditConfigured: () => false }));
    const { harvestAduana: h } = await import("../../classes/aduana/harvest");
    await expect(h()).resolves.toEqual({ posts: 0, comments: 0 });
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/aduana/harvest.test.ts`
Expected: FAIL — cannot find `classes/aduana/harvest`.

- [ ] **Step 3: Write the corpus models and the harvester**

Create `classes/aduana/corpus.ts` (Mongo access, kept separate so `harvest.ts` stays testable):

```ts
// The harvest ledger. `redditId` / `commentId` are unique — that index IS the dedupe: a thread we
// already hold is never downloaded again, and the ids we already have are fed back to Reddit's
// paginator so it does not even send them.
import { Schema } from "mongoose";
import { MongooseServer } from "../database";
import type { RedditCommentRaw, RedditPostRaw } from "../reddit";

const postSchema = new Schema(
  {
    redditId: { type: String, required: true, unique: true },
    title: String,
    selftext: String,
    author: String,
    score: Number,
    numComments: Number,
    permalink: String,
    createdUtc: Number,
    queries: [String],
  },
  { timestamps: true }
);

const commentSchema = new Schema(
  {
    commentId: { type: String, required: true, unique: true },
    postId: { type: String, required: true },
    author: String,
    body: String,
    score: Number,
    createdUtc: Number,
    permalink: String,
  },
  { timestamps: true }
);

const posts = () => MongooseServer.getInstance("aduana_reddit_posts", postSchema);
const comments = () => MongooseServer.getInstance("aduana_reddit_comments", commentSchema);

export async function upsertPosts(rows: Array<RedditPostRaw & { queries: string[] }>): Promise<number> {
  for (const p of rows) {
    await posts().updateOneRaw(
      { redditId: p.id },
      {
        $set: {
          redditId: p.id,
          title: p.title,
          selftext: p.selftext,
          author: p.author,
          score: p.score,
          numComments: p.numComments,
          permalink: p.permalink,
          createdUtc: p.createdUtc,
        },
        $addToSet: { queries: { $each: p.queries } },
      },
      { upsert: true }
    );
  }
  return rows.length;
}

export async function upsertComments(postId: string, rows: RedditCommentRaw[]): Promise<number> { /* same shape, keyed by commentId */ }
export async function knownCommentIds(postId: string): Promise<Set<string>> { /* ids already stored, fed back to fetchComments */ }
export async function allPosts(): Promise<Array<{ redditId: string; title: string; selftext: string; author: string; score: number; createdUtc: number; permalink: string }>>;
export async function allComments(): Promise<Array<{ commentId: string; postId: string; author: string; body: string; score: number; createdUtc: number; permalink: string }>>;
```

Use the same `MongooseServer` method names `classes/couriers/store.ts` uses — read it, don't guess.

Create `classes/aduana/harvest.ts`:

```ts
// Search r/uruguay for everything customs-shaped, store it, and never download it twice.
//
// The query list is not intuition: it is what actually surfaces the corpus (1161 threads on the
// first sweep). Broad queries like `importar` also drag in political rants — that is fine and
// expected; the classifier is allowed to return null, and it is what filters them out. Better a
// noisy net and a strict filter than a narrow net that misses "me robaron el paquete".
import { fetchComments, redditConfigured, searchSubreddit } from "../reddit";
import { knownCommentIds, upsertComments, upsertPosts } from "./corpus";

export const ADUANA_QUERIES = [
  "aduana",
  "aduana paquete",
  "paquete retenido",
  "despachante",
  "DUA",
  "courier compra exterior",
  "franquicia 200",
  "importar",
  "encomienda",
  "traer del exterior",
];

const SUB = "uruguay";

export async function harvestAduana(
  opts: { window?: "year" | "all" } = {}
): Promise<{ posts: number; comments: number }> {
  if (!redditConfigured()) return { posts: 0, comments: 0 };

  const byId = new Map<string, { post: Awaited<ReturnType<typeof searchSubreddit>>[number]; queries: string[] }>();
  for (const q of ADUANA_QUERIES) {
    for (const post of await searchSubreddit(SUB, q, { t: opts.window ?? "year", sort: "new" })) {
      const hit = byId.get(post.id);
      if (hit) hit.queries.push(q);
      else byId.set(post.id, { post, queries: [q] });
    }
  }

  const rows = [...byId.values()].map(({ post, queries }) => ({ ...post, queries }));
  const posts = await upsertPosts(rows);

  let comments = 0;
  for (const { post } of byId.values()) {
    const known = await knownCommentIds(post.id);
    const fresh = await fetchComments(post.id, known);
    comments += await upsertComments(post.id, fresh);
  }
  return { posts, comments };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/aduana/harvest.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add classes/aduana/harvest.ts classes/aduana/corpus.ts tests/aduana/harvest.test.ts
git commit -m "feat(aduana): harvest r/uruguay customs threads into a deduped corpus"
```

---

### Task 4: Classify — the AI labels, the code aggregates

**Files:**
- Create: `classes/aduana/classify.ts`
- Test: `tests/aduana/classify.test.ts`

**Interfaces:**
- Consumes: `classes/ai_service.ts` (OpenAI-compatible; read how `classes/couriers` or `ai_insight_cache.ts` calls it and reuse that path), `classes/aduana/corpus.ts`, `BucketId`/`Quote` from `types.ts`.
- Produces: `labelText(input: { id: string; text: string }): Promise<AduanaLabel | null>`; `aggregate(labels: AduanaLabel[], texts: Map<string, Quote>): { quotes: Partial<Record<BucketId, Quote[]>>; counts: Partial<Record<BucketId, number>> }`; `refreshLabels(): Promise<{ labeled: number }>`.
- `interface AduanaLabel { key: string; bucket: BucketId; outcome: 'resuelto' | 'pago' | 'perdio' | 'sin-resolver'; lesson: string; confident: boolean }`

Keyword scoring is **not** enough — we already learned that on the courier tierlist. The AI labels; the aggregation is deterministic so the same corpus always produces the same page.

- [ ] **Step 1: Write the failing test**

Create `tests/aduana/classify.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aggregate } from "../../classes/aduana/classify";
import type { Quote } from "../../classes/aduana/types";

const q = (author: string, score: number): Quote => ({
  text: "me retuvieron el paquete tres semanas",
  author,
  date: "2026-05-01",
  score,
  permalink: "https://reddit.com/r/uruguay/comments/x",
});

describe("aggregate", () => {
  it("counts every confident label but quotes only the top-scoring ones", () => {
    const texts = new Map<string, Quote>([
      ["a", q("juan", 5)],
      ["b", q("ana", 90)],
      ["c", q("leo", 40)],
      ["d", q("sol", 10)],
    ]);
    const labels = ["a", "b", "c", "d"].map((key) => ({
      key,
      bucket: "retenido" as const,
      outcome: "sin-resolver" as const,
      lesson: "",
      confident: true,
    }));

    const out = aggregate(labels, texts);

    expect(out.counts.retenido).toBe(4);
    expect(out.quotes.retenido!.map((x) => x.author)).toEqual(["ana", "leo", "sol"]); // top 3 by score
  });

  it("never quotes a deleted author, and never counts an unconfident label", () => {
    const texts = new Map<string, Quote>([
      ["a", q("[deleted]", 500)],
      ["b", q("ana", 3)],
      ["c", q("leo", 400)],
    ]);
    const labels = [
      { key: "a", bucket: "retenido" as const, outcome: "perdio" as const, lesson: "", confident: true },
      { key: "b", bucket: "retenido" as const, outcome: "perdio" as const, lesson: "", confident: true },
      { key: "c", bucket: "retenido" as const, outcome: "perdio" as const, lesson: "", confident: false },
    ];

    const out = aggregate(labels, texts);

    expect(out.counts.retenido).toBe(1); // only 'b' — 'c' is unconfident, 'a' is unquotable
    expect(out.quotes.retenido!.map((x) => x.author)).toEqual(["ana"]);
  });

  it("returns nothing for a bucket nobody talked about", () => {
    expect(aggregate([], new Map()).quotes.decomiso).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/aduana/classify.test.ts`
Expected: FAIL — cannot find `classes/aduana/classify`.

- [ ] **Step 3: Implement**

Create `classes/aduana/classify.ts`:

```ts
// The AI labels one text at a time; the code does every count and every choice of quote.
//
// Why the split: keyword scoring cannot tell "la aduana me retuvo el paquete" from "retuve la
// respiración" and cannot read sarcasm, so the label has to come from a model. But a model asked
// to "summarise what Reddit thinks" produces a different page every run and cites whatever it
// liked. So the model only ever answers a closed question about ONE text, and the aggregation
// below is pure and deterministic: same corpus, same page.
import type { AduanaLabel, BucketId, Quote } from "./types";

const MAX_QUOTES_PER_BUCKET = 3;
const MIN_QUOTE_CHARS = 60;
const MAX_QUOTE_CHARS = 420;

const unquotable = (author: string): boolean =>
  !author || author === "[deleted]" || author === "AutoModerator";

export function aggregate(
  labels: AduanaLabel[],
  texts: Map<string, Quote>
): { quotes: Partial<Record<BucketId, Quote[]>>; counts: Partial<Record<BucketId, number>> } {
  const quotes: Partial<Record<BucketId, Quote[]>> = {};
  const counts: Partial<Record<BucketId, number>> = {};

  for (const label of labels) {
    if (!label.confident) continue;
    const quote = texts.get(label.key);
    if (!quote || unquotable(quote.author)) continue;

    counts[label.bucket] = (counts[label.bucket] ?? 0) + 1;
    (quotes[label.bucket] ??= []).push(quote);
  }

  for (const bucket of Object.keys(quotes) as BucketId[]) {
    quotes[bucket] = quotes[bucket]!
      .filter((q) => q.text.length >= MIN_QUOTE_CHARS)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_QUOTES_PER_BUCKET)
      .map((q) => ({ ...q, text: trim(q.text) }));
  }
  return { quotes, counts };
}

/** Cut on a word boundary. The text is trimmed, never rewritten — it is somebody's words. */
function trim(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_QUOTE_CHARS) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", MAX_QUOTE_CHARS)) + "…";
}
```

Then `labelText()` — one closed question, strict JSON, `null` on anything unexpected:

```ts
const PROMPT = `Sos un clasificador. Te paso UN texto de r/uruguay.
Si NO habla de un problema real con la aduana uruguaya o con una compra importada, devolvé exactamente: null
Si habla, devolvé SOLO este JSON, sin markdown, sin explicación:
{"bucket":"<uno de: ${BUCKET_IDS.join("|")}>","outcome":"resuelto|pago|perdio|sin-resolver","lesson":"<=140 caracteres, qué aprender","confident":true|false}
"confident" es false si dudás del bucket.`;
```

`labelText` must: call the AI service, strip the junk the provider emits (LaTeX, `<think>…</think>`, `WormGPT:` prefixes — a sanitizer for this already exists in the codebase; find it and reuse it), `JSON.parse` inside a try, validate `bucket` is in `BUCKET_IDS`, and return `null` on any failure. Never repair malformed output by hand.

`refreshLabels()` reads posts+comments from `corpus.ts`, skips keys already in the `aduana_labels` collection (that is what makes the weekly run cheap — only new text costs a call), labels the rest, stores them, and returns the count.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/aduana/classify.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add classes/aduana/classify.ts tests/aduana/classify.test.ts
git commit -m "feat(aduana): AI-labelled, deterministically aggregated Reddit evidence"
```

---

### Task 5: The norms gate — the AI proposes, it never publishes

> **SUPERSEDED — this task's steps below describe the FIRST draft of the gate, kept for history.**
> The contract that actually shipped (`classes/aduana/norms.ts` + `classes/aduana/gemini.ts`) is
> different in three ways later tasks must respect:
>
> 1. **Grounding is gate 1, and it is not optional.** `classes/aduana/gemini.ts#askGrounded` calls
>    Gemini with the Google Search tool ON and returns the URIs it actually retrieved
>    (`sourceUris`). `applyProposals` takes those as a required `groundingUris: string[]` param and
>    refuses any proposal whose citation the model never opened — an ungrounded proposal is a plain
>    chat completion answering from memory, indistinguishable from a hallucination. Host-only
>    matching on its own is too coarse (any page on an official domain would pass), so two more
>    deterministic checks ride along with it: a citation cannot be a bare homepage, and it must be
>    on THIS fact's own `sources[].url` host, not merely *some* official host.
>    **Real signature:** `applyProposals(current: AduanaFact[], raw: unknown, groundingUris: string[], sources: Source[]): { facts: AduanaFact[]; pendingReview: string[] }`.
> 2. **`verifiedAt` is HUMAN-ONLY and is never written by the refresh.** The draft below has
>    `applyProposals` "re-stamp verifiedAt" on a confirmation — that shipped differently on
>    purpose. `verifiedAt` means a human opened the decree and read the number; a machine's
>    re-read is not that. A grounded, correctly-sourced, in-range, unchanged confirmation instead
>    sets a **second, separate field**: `aiCheckedAt` (see `types.ts`'s `AduanaFact`). `value` and
>    `verifiedAt` are the two fields no code path in `norms.ts` may ever write — that is the
>    invariant the whole module is built around.
> 3. **`pendingReview` discharges.** A fact flagged in an earlier run whose dispute is resolved
>    this run (grounded + own-sourced + in-range + unchanged, i.e. actually reconfirmed) is removed
>    from `pendingReview` when `refreshNorms` rebuilds it. It is a union of "still open" items, not
>    a pure ratchet that only ever grows.
>
> **Task 9 must render `verifiedAt` and `aiCheckedAt` differently — do not conflate them on the
> page.** `verifiedAt` → "verificado contra la norma" (a human read it). `aiCheckedAt` → "último
> control automático" (a grounded model re-read it and found no change). Showing either as the
> other overstates what actually happened; the whole point of splitting the fields is that a page
> whose every date is a model's shrug is worse than a page with an honestly old human-verified date.

**Files:**
- Create: `classes/aduana/norms.ts`, `classes/aduana/gemini.ts`
- Test: `tests/aduana/norms.test.ts`, `tests/aduana/gemini.test.ts`

**Interfaces:**
- Consumes: `BASELINE`, `FACT_RANGES`, `OFFICIAL_HOSTS` from `baseline.ts`; `AduanaFact`/`Source` from `types.ts`; `askGrounded`/`geminiConfigured` from `gemini.ts` (NOT the plain `classes/ai_service.ts` — that has no web access, so it can only ever answer from memory).
- Produces (real contract): `applyProposals(current: AduanaFact[], raw: unknown, groundingUris: string[], sources: Source[]): { facts: AduanaFact[]; pendingReview: string[] }` (pure — this is the whole gate, and it is what the tests hit); `refreshNorms(doc: AduanaDoc): Promise<AduanaDoc>` (calls Gemini grounded, batches, then `applyProposals`, then discharges resolved `pendingReview` ids).

This is the task where money gets lost if we are sloppy. We have already shipped wrong import figures once.

---
**Historical draft below (superseded — see the note above before using any of this as a reference):**

- [ ] **Step 1: Write the failing test**

Create `tests/aduana/norms.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyProposals } from "../../classes/aduana/norms";
import type { AduanaFact, Source } from "../../classes/aduana/types";

const SOURCES: Source[] = [
  { id: "decreto-50-026", title: "Decreto 50/026", norm: "Decreto 50/026", url: "https://www.impo.com.uy/bases/decretos/50-2026", checkedAt: "2026-07-11" },
];

const current: AduanaFact[] = [
  { id: "franquicia.tope_anual_usd", label: "Tope anual", value: 800, unit: "USD", sourceId: "decreto-50-026", article: "art. 3", verifiedAt: "2026-07-11", origin: "baseline" },
];

const proposal = (over: Record<string, unknown>) => [
  { id: "franquicia.tope_anual_usd", value: 800, sourceUrl: "https://www.impo.com.uy/bases/decretos/50-2026", article: "art. 3", ...over },
];

describe("applyProposals", () => {
  it("keeps the last-good value and flags a changed fact instead of publishing it", () => {
    const out = applyProposals(current, proposal({ value: 1200 }), SOURCES);
    expect(out.facts[0].value).toBe(800); // NOT 1200 — a human confirms a change of law
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  it("rejects a fact sourced to a domain that is not official", () => {
    const out = applyProposals(current, proposal({ value: 900, sourceUrl: "https://elpais.com.uy/nota" }), SOURCES);
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  it("rejects a value outside its plausible range", () => {
    const out = applyProposals(current, proposal({ value: 999999 }), SOURCES);
    expect(out.facts[0].value).toBe(800);
  });

  it("keeps everything when the AI returns garbage", () => {
    expect(applyProposals(current, "<think>hmm</think>", SOURCES).facts).toEqual(current);
    expect(applyProposals(current, null, SOURCES).facts).toEqual(current);
    expect(applyProposals(current, [{ nonsense: true }], SOURCES).facts).toEqual(current);
  });

  it("re-stamps verifiedAt when the AI confirms the value we already had", () => {
    const out = applyProposals(current, proposal({ value: 800 }), SOURCES);
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toEqual([]);
    expect(out.facts[0].origin).toBe("baseline"); // confirmation does not make it AI-authored
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/aduana/norms.test.ts`
Expected: FAIL — cannot find `classes/aduana/norms`.

- [ ] **Step 3: Implement the gate**

Create `classes/aduana/norms.ts`:

```ts
// The weekly legal-fact refresh. The AI's job here is to NOTICE a change, not to make one.
//
// Every proposal runs three deterministic gates before it can touch a value:
//   1. its source must be an official domain (a newspaper is not the law),
//   2. its value must be inside the plausible range for that fact,
//   3. if it DIFFERS from what we publish, it is not published — the last-good value stays and
//      the fact id goes to pendingReview for a human.
// So the worst an hallucination can do is nag us. It cannot put a wrong number in front of
// somebody about to pay it. We have shipped wrong import figures once; not twice.
import { FACT_RANGES, OFFICIAL_HOSTS } from "./baseline";
import type { AduanaDoc, AduanaFact, Source } from "./types";

interface Proposal {
  id: string;
  value: number | string;
  sourceUrl: string;
  article?: string;
}

const isOfficial = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    return OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
};

const inRange = (id: string, value: number | string): boolean => {
  if (typeof value !== "number") return true;
  const range = FACT_RANGES[id];
  if (!range) return false; // a numeric fact with no declared range is not publishable
  return value >= range[0] && value <= range[1];
};

function parseProposals(raw: unknown): Proposal[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is Proposal =>
      !!p &&
      typeof (p as Proposal).id === "string" &&
      typeof (p as Proposal).sourceUrl === "string" &&
      ["number", "string"].includes(typeof (p as Proposal).value)
  );
}

export function applyProposals(
  current: AduanaFact[],
  raw: unknown,
  _sources: Source[]
): { facts: AduanaFact[]; pendingReview: string[] } {
  const proposals = parseProposals(raw);
  const pendingReview: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const facts = current.map((fact) => {
    const p = proposals.find((x) => x.id === fact.id);
    if (!p) return fact;

    if (!isOfficial(p.sourceUrl) || !inRange(fact.id, p.value)) {
      pendingReview.push(fact.id);
      return fact;
    }
    if (p.value !== fact.value) {
      pendingReview.push(fact.id); // a real change of law is confirmed by a human, never by us
      return fact;
    }
    return { ...fact, verifiedAt: today }; // confirmed — same value, fresh timestamp
  });

  return { facts, pendingReview };
}
```

Then `refreshNorms(doc)`: build the grounded prompt (ask, per fact id, for `{id, value, sourceUrl, article}` from the current norm), call the AI, `JSON.parse` in a try (return `doc` untouched on any throw), and run `applyProposals`. A `pendingReview` non-empty must `console.warn` the ids — that log is how a human finds out the law moved.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/aduana/norms.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add classes/aduana/norms.ts tests/aduana/norms.test.ts
git commit -m "feat(aduana): AI proposes legal facts, deterministic gates publish them"
```

---

### Task 6: Payload, the weekly job, the pm2 app and the public route

**Files:**
- Create: `classes/aduana/payload.ts`, `sync_aduana.ts`
- Test: `tests/aduana/payload.test.ts`
- Modify: `index.ts` (add the route + swagger), `ecosystem.config.js` (add the pm2 app), `package.json` (add a `sync_aduana` script)

**Interfaces:**
- Consumes: everything from Tasks 2–5.
- Produces: `buildAduanaPayload(doc: AduanaDoc): PublicAduanaPayload` — what `GET /aduana` returns and what the Nuxt page consumes. Shape:
  `{ facts: AduanaFact[]; problems: Array<ProblemEntry & { quotes: Quote[]; reports: number }>; sources: Source[]; updatedAt: string | null; stale: boolean }`

- [ ] **Step 1: Write the failing test**

Create `tests/aduana/payload.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BASELINE } from "../../classes/aduana/baseline";
import { buildAduanaPayload } from "../../classes/aduana/payload";

describe("buildAduanaPayload", () => {
  it("joins each problem with its quotes and its report count", () => {
    const doc = {
      ...BASELINE,
      quotes: { retenido: [{ text: "x".repeat(80), author: "ana", date: "2026-05-01", score: 9, permalink: "https://reddit.com/x" }] },
      counts: { retenido: 12 },
      updatedAt: new Date().toISOString(),
    };

    const out = buildAduanaPayload(doc);
    const retenido = out.problems.find((p) => p.id === "retenido")!;

    expect(retenido.quotes).toHaveLength(1);
    expect(retenido.reports).toBe(12);
    expect(out.stale).toBe(false);
  });

  it("marks a payload stale when the last sync is over two weeks old, and never drops a problem", () => {
    const old = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString();
    const out = buildAduanaPayload({ ...BASELINE, updatedAt: old });

    expect(out.stale).toBe(true);
    expect(out.problems).toHaveLength(12); // a problem with no Reddit evidence still ships its norm
    expect(out.problems.every((p) => Array.isArray(p.quotes))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/aduana/payload.test.ts`
Expected: FAIL — cannot find `classes/aduana/payload`.

- [ ] **Step 3: Implement `payload.ts`**

```ts
// The public shape. A problem with zero Reddit evidence still ships — the norm and the procedure
// are the point; the testimonies are corroboration, not the content.
import type { AduanaDoc, ProblemEntry, Quote, Source, AduanaFact } from "./types";

const STALE_MS = 14 * 24 * 60 * 60 * 1000;

export interface PublicAduanaPayload {
  facts: AduanaFact[];
  problems: Array<ProblemEntry & { quotes: Quote[]; reports: number }>;
  sources: Source[];
  updatedAt: string | null;
  stale: boolean;
}

export function buildAduanaPayload(doc: AduanaDoc): PublicAduanaPayload {
  return {
    facts: doc.facts,
    problems: doc.problems.map((p: ProblemEntry) => ({
      ...p,
      quotes: doc.quotes[p.id] ?? [],
      reports: doc.counts[p.id] ?? 0,
    })),
    sources: doc.sources,
    updatedAt: doc.updatedAt,
    stale: !doc.updatedAt || Date.now() - new Date(doc.updatedAt).getTime() > STALE_MS,
  };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/aduana/payload.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the job entry**

Create `sync_aduana.ts`, mirroring `sync_couriers.ts` (read it). Every stage degrades on its own; nothing blanks good data:

```ts
// Weekly customs sync (pm2 app `currency-aduana`, Mondays 08:40 UTC ≈ 05:40 Uruguay).
//
// Three stages, each independent: harvest new r/uruguay threads → label only what is new →
// re-check the legal facts. If Reddit is down the facts still get checked; if the AI is down the
// old quotes keep serving. No stage ever blanks good data, and the norms gate means the AI can
// flag a change of law but not publish one.
import dotenv from "dotenv";
dotenv.config();

import { refreshLabels, aggregateFromCorpus } from "./classes/aduana/classify";
import { harvestAduana } from "./classes/aduana/harvest";
import { refreshNorms } from "./classes/aduana/norms";
import { loadAduanaDoc, saveAduanaDoc } from "./classes/aduana/store";

async function main(): Promise<void> {
  let doc = await loadAduanaDoc();

  try {
    const { posts, comments } = await harvestAduana();
    console.log(`[aduana] harvested posts=${posts} comments=${comments}`);
  } catch (e) {
    console.error("[aduana] harvest failed, keeping the stored corpus", e);
  }

  try {
    const { labeled } = await refreshLabels();
    const { quotes, counts } = await aggregateFromCorpus();
    doc.quotes = quotes;
    doc.counts = counts;
    console.log(`[aduana] labeled=${labeled}`);
  } catch (e) {
    console.error("[aduana] labelling failed, keeping the previous quotes", e);
  }

  try {
    doc = await refreshNorms(doc);
  } catch (e) {
    console.error("[aduana] norms check failed, keeping the last-good facts", e);
  }

  doc.updatedAt = new Date().toISOString();
  await saveAduanaDoc(doc);

  if (doc.pendingReview.length) {
    console.warn(`[aduana] NEEDS A HUMAN — facts the AI wants to change: ${doc.pendingReview.join(", ")}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[aduana] sync failed", e);
  process.exit(1);
});
```

`aggregateFromCorpus()` is a thin helper in `classify.ts`: load posts+comments+labels from Mongo, build the `Map<string, Quote>`, call `aggregate()`. Add it there.

- [ ] **Step 6: Register the pm2 app**

In `ecosystem.config.js`, after the `currency-couriers` block:

```js
    {
      // Customs problem hub for /problemas-con-la-aduana-uruguay: Reddit corpus + AI labels every
      // run, legal facts re-checked against the norm (the AI can flag a change, never publish one).
      // Mondays 08:40 UTC ≈ 05:40 America/Montevideo — after the courier sync, so the two jobs do
      // not compete for the same Reddit rate limit.
      name: "currency-aduana",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_aduana.js",
      cron_restart: "40 8 * * 1",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

Add to `package.json` scripts: `"sync_aduana": "ts-node sync_aduana.ts"`.

- [ ] **Step 7: Add the public route**

In `index.ts`, next to the `couriers` route (find `server.getJson("couriers"…)` and mirror it exactly, including the swagger JSDoc block above it):

```ts
  server.getJson("aduana", async (): Promise<any> => {
    const doc = await loadAduanaDoc();
    return buildAduanaPayload(doc);
  });
```

Import `loadAduanaDoc` from `./classes/aduana/store` and `buildAduanaPayload` from `./classes/aduana/payload`. Write the swagger block: summary "Guía de problemas con la aduana (normas, procedimientos y testimonios citados)", and document that `facts` carry their source and `stale` means the weekly job has not run in over two weeks.

- [ ] **Step 8: Typecheck the new module only**

The repo build is broken by an unrelated missing file (`classes/couriers/opinions.ts`, Global Constraints). Scope the check:

Run: `npx tsc --noEmit classes/aduana/*.ts sync_aduana.ts --esModuleInterop --skipLibCheck --module commonjs --target es2019 --moduleResolution node`
Expected: no errors from `classes/aduana/*` or `sync_aduana.ts`.

Then run the whole suite: `npx vitest run tests/aduana`
Expected: PASS (all four test files).

- [ ] **Step 9: Commit**

```bash
git add classes/aduana/payload.ts sync_aduana.ts tests/aduana/payload.test.ts index.ts ecosystem.config.js package.json
git commit -m "feat(aduana): weekly sync job, pm2 app and public GET /aduana"
```

---

### Task 7: The nitro proxy — cached, and it never blanks

**Files:**
- Create: `app/server/api/aduana.get.ts`, `app/server/utils/aduanaFallback.ts`
- Test: `app/tests/unit/aduanaFallback.test.ts`

**Interfaces:**
- Consumes: `GET {apiBaseServer}/aduana` (runtime config `apiBaseServer`, already defined in `app/nuxt.config.ts:664`).
- Produces: `/api/aduana` returning `PublicAduanaPayload` (structurally identical to the backend's — the page has one shape to render). `aduanaFallback.ts` exports `ADUANA_FALLBACK: PublicAduanaPayload` and `type PublicAduanaPayload`.

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/aduanaFallback.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ADUANA_FALLBACK } from '../../server/utils/aduanaFallback'

describe('aduana fallback', () => {
  // If the backend is down, the page must still be a useful page — not an empty shell.
  it('carries every problem and every fact, so a dead backend still renders the guide', () => {
    expect(ADUANA_FALLBACK.problems).toHaveLength(12)
    expect(ADUANA_FALLBACK.facts.length).toBeGreaterThan(0)
    expect(ADUANA_FALLBACK.problems.every(p => Array.isArray(p.quotes))).toBe(true)
    expect(ADUANA_FALLBACK.stale).toBe(true) // it is a snapshot, and it says so
  })

  it('sources every fact', () => {
    for (const f of ADUANA_FALLBACK.facts) {
      expect(ADUANA_FALLBACK.sources.some(s => s.id === f.sourceId)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run it, watch it fail**

Run (from `app/`): `npx vitest run tests/unit/aduanaFallback.test.ts`
Expected: FAIL — cannot find `../../server/utils/aduanaFallback`.

- [ ] **Step 3: Write the fallback and the proxy**

`app/server/utils/aduanaFallback.ts`: the `PublicAduanaPayload` type plus a **copy of the backend baseline** (facts, problems, sources; `quotes: []`, `reports: 0`, `stale: true`). Copy it from `classes/aduana/baseline.ts` — the root and the app are separate TS programs and cannot import across (Task 2, Step 2). Add a header comment saying exactly that, and pointing at `tests/aduana/baseline.test.ts` as the drift guard.

`app/server/api/aduana.get.ts` — mirror `app/server/api/couriers.get.ts`:

```ts
// The customs guide, proxied from the backend and cached at the edge.
//
// Fallback in cascade: live backend → whatever the cache still holds → the embedded baseline. The
// page must never render an empty shell: somebody arrives here because a package is stuck, and a
// blank page is worse than a slightly stale one.
import { ADUANA_FALLBACK, type PublicAduanaPayload } from '../utils/aduanaFallback'

export default defineCachedEventHandler(
  async (): Promise<PublicAduanaPayload> => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<PublicAduanaPayload>(`${base}/aduana`, { timeout: 8000 })
      if (!res?.problems?.length) return ADUANA_FALLBACK
      return res
    } catch {
      return ADUANA_FALLBACK
    }
  },
  { maxAge: 60 * 30, name: 'aduana', getKey: () => 'all' }
)
```

- [ ] **Step 4: Run the test**

Run (from `app/`): `npx vitest run tests/unit/aduanaFallback.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/server/api/aduana.get.ts app/server/utils/aduanaFallback.ts app/tests/unit/aduanaFallback.test.ts
git commit -m "feat(aduana): cached /api/aduana proxy with a baseline fallback"
```

---

### Task 8: The four tools (pure logic, fully tested)

**Files:**
- Create: `app/utils/aduanaTools.ts`
- Test: `app/tests/unit/aduanaTools.test.ts`

**Interfaces:**
- Consumes: `PublicAduanaPayload` / `AduanaFact` from `app/server/utils/aduanaFallback.ts` (re-export the types from there; do not redeclare them).
- Produces:
  - `verifyCharges(input: { charges: Charge[]; facts: AduanaFact[] }): ChargeVerdict[]` where `interface Charge { id: ChargeId; amountUsd: number }`, `type ChargeId = 'iva' | 'prestacion_unica' | 'gestion_courier' | 'deposito' | 'flete' | 'otro'`, `interface ChargeVerdict { id: ChargeId; amountUsd: number; backing: 'norma' | 'contrato' | 'sin-respaldo'; explain: string; sourceId?: string }`
  - `franchiseStatus(input: { purchases: Array<{ valueUsd: number }>; facts: AduanaFact[] }): { usedUsd: number; remainingUsd: number; shipmentsUsed: number; shipmentsLeft: number; exhausted: boolean; nextPurchaseWarning: string | null }`
  - `buildClaim(input: { problem: ProblemLike; tracking: string; date: string; description: string }): string`
  - `diagnose(symptom: BucketId, problems: ProblemLike[]): ProblemLike | null`

Every number these functions use comes from `facts` — never a literal. That is the whole point of the API.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/aduanaTools.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildClaim, franchiseStatus, verifyCharges } from '../../utils/aduanaTools'

const facts = [
  { id: 'franquicia.tope_anual_usd', label: 'Tope anual', value: 800, unit: 'USD', sourceId: 'decreto-50-026', verifiedAt: '2026-07-11', origin: 'baseline' },
  { id: 'franquicia.max_envios', label: 'Envíos', value: 3, sourceId: 'decreto-50-026', verifiedAt: '2026-07-11', origin: 'baseline' },
  { id: 'prestacion_unica.minimo_usd', label: 'Mínimo', value: 20, unit: 'USD', sourceId: 'decreto-50-026', verifiedAt: '2026-07-11', origin: 'baseline' },
] as const

describe('verifyCharges', () => {
  it('separates what the norm backs from what the courier invented', () => {
    const out = verifyCharges({
      charges: [
        { id: 'iva', amountUsd: 44 },
        { id: 'gestion_courier', amountUsd: 25 },
        { id: 'deposito', amountUsd: 15 },
      ],
      facts: [...facts],
    })

    expect(out.find(c => c.id === 'iva')!.backing).toBe('norma')
    // The courier may charge a fee — but it is a price in a contract, not a tax. The page must
    // not let people believe "la aduana me cobró 25 dólares" when the courier did.
    expect(out.find(c => c.id === 'gestion_courier')!.backing).toBe('contrato')
    expect(out.find(c => c.id === 'deposito')!.backing).toBe('contrato')
  })

  it('flags a charge with no basis at all', () => {
    const out = verifyCharges({ charges: [{ id: 'otro', amountUsd: 30 }], facts: [...facts] })
    expect(out[0].backing).toBe('sin-respaldo')
    expect(out[0].explain).toBeTruthy()
  })
})

describe('franchiseStatus', () => {
  it('counts the year against the tope and the shipment limit', () => {
    const out = franchiseStatus({ purchases: [{ valueUsd: 300 }, { valueUsd: 250 }], facts: [...facts] })
    expect(out.usedUsd).toBe(550)
    expect(out.remainingUsd).toBe(250)
    expect(out.shipmentsUsed).toBe(2)
    expect(out.shipmentsLeft).toBe(1)
    expect(out.exhausted).toBe(false)
  })

  it('is exhausted after three shipments even with money left', () => {
    const out = franchiseStatus({
      purchases: [{ valueUsd: 10 }, { valueUsd: 10 }, { valueUsd: 10 }],
      facts: [...facts],
    })
    expect(out.remainingUsd).toBe(770)
    expect(out.shipmentsLeft).toBe(0)
    expect(out.exhausted).toBe(true) // three shipments is three shipments, cheap or not
    expect(out.nextPurchaseWarning).toBeTruthy()
  })

  it('warns that the two regimes do not mix', () => {
    // 700 used, 100 left, buying 500: it is NOT "IVA on 100 + 60% on 400" — the whole 500 goes to
    // the prestación única. The costliest misunderstanding of the regime.
    // NOTE: do NOT cite "Decreto 50/026 art. 15" for this — art. 15 is the *incumplimiento* rule
    // (art. 632). No article states the no-split rule; it follows from the regime's design
    // (art. 3: a franchise "de hasta USD 800", no partial-application mechanism anywhere; art. 2:
    // the 60% applies to the whole invoice value). Research doc §7.8. The warning copy must not
    // attribute it to an article.
    const out = franchiseStatus({ purchases: [{ valueUsd: 700 }], facts: [...facts] })
    expect(out.remainingUsd).toBe(100)
    expect(out.nextPurchaseWarning).toMatch(/entero|no se parte|prestación única/i)
  })
})

describe('buildClaim', () => {
  it('fills the template and leaves no placeholder behind', () => {
    const text = buildClaim({
      problem: { id: 'retenido', title: 'Paquete retenido', claimTemplate: 'Guía {{tracking}}, fecha {{fecha}}. {{descripcion}}' },
      tracking: 'ABC123',
      date: '2026-07-01',
      description: 'Sigue retenido.',
    })
    expect(text).toContain('ABC123')
    expect(text).not.toMatch(/\{\{/)
  })
})
```

- [ ] **Step 2: Run them, watch them fail**

Run (from `app/`): `npx vitest run tests/unit/aduanaTools.test.ts`
Expected: FAIL — cannot find `../../utils/aduanaTools`.

- [ ] **Step 3: Implement `app/utils/aduanaTools.ts`**

Pure functions, no Vue, no fetch. Key behaviours the tests pin down:

- `verifyCharges` maps each `ChargeId` to a backing: `iva` and `prestacion_unica` → `'norma'` (attach the `sourceId` of the fact that backs it); `gestion_courier`, `deposito` and `flete` → `'contrato'` with an `explain` that says plainly this is the courier's price list, not a tax, and that it is negotiable/comparable between couriers; anything else → `'sin-respaldo'`.
- `franchiseStatus` reads the tope and the shipment cap **from `facts`** (`franquicia.tope_anual_usd`, `franquicia.max_envios`). `exhausted` is true when *either* limit is spent. `nextPurchaseWarning` explains the all-or-nothing rule when the remaining quota is smaller than a typical purchase.
- `buildClaim` replaces `{{tracking}}`, `{{fecha}}`, `{{descripcion}}` and asserts (in code, by regex) that no `{{` survives.
- `diagnose` returns the `ProblemEntry` for the chosen bucket, or `null`.

- [ ] **Step 4: Run the tests**

Run (from `app/`): `npx vitest run tests/unit/aduanaTools.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/utils/aduanaTools.ts app/tests/unit/aduanaTools.test.ts
git commit -m "feat(aduana): charge verifier, franchise counter and claim generator"
```

---

### Task 9: The page

**Files:**
- Create: `app/pages/problemas-con-la-aduana-uruguay.vue`
- Modify: `app/utils/siteNav.ts`

**Interfaces:**
- Consumes: `/api/aduana` (Task 7), `app/utils/aduanaTools.ts` (Task 8).
- Produces: the route `/problemas-con-la-aduana-uruguay`.

- [ ] **Step 1: Register the page in the nav (or the coverage test fails)**

Add an entry to `app/utils/siteNav.ts` — it is the single source of truth for the header, drawer, footer, sitemap and the ⌘K palette. Read a neighbouring entry (e.g. `/franquicia-aduana-uruguay`) and mirror its shape: title "Problemas con la aduana", a description that says *symptom*, not *norm*, and the same section grouping as the other import pages.

- [ ] **Step 2: Run the nav coverage test to confirm it is registered**

Run (from `app/`): `npx vitest run tests/unit/siteNav.test.ts`
Expected: PASS. (If it fails with "page not in siteNav", the entry is wrong — fix it before writing the page.)

- [ ] **Step 3: Build the page**

`app/pages/problemas-con-la-aduana-uruguay.vue`. Data: `const { data } = await useFetch('/api/aduana')` — SSR, so the content is in the HTML for Google. **No literal rule, amount or deadline in the template.**

Sections, in order:

1. **Hero** — h1 "Problemas con la aduana en Uruguay: qué hacer en cada caso". Subtitle framing it as a plan of action, not a law lecture.
2. **Diagnóstico** — a `VSelect`/chip group of the 12 symptoms (`problems[].symptom`). On pick, render that problem's `steps` (numbered), `deadline` if present, and the body to complain to. A problem with `verified: false` renders an honest "no lo pudimos verificar contra la norma" note instead of invented steps.
3. **Verificador de cobro** — inputs per `ChargeId`, calls `verifyCharges`, renders each verdict with a colour: `norma` (neutral/green, cites the source), `contrato` (amber — "esto lo cobra el courier, no la aduana"), `sin-respaldo` (red).
4. **Contador de franquicias** — add purchases, shows `usedUsd` / `remainingUsd` / `shipmentsLeft` and the `nextPurchaseWarning`.
5. **Generador de reclamo** — problem + tracking + date + description → `buildClaim`, in a read-only textarea with a copy button. Say plainly that we do not send anything; the user sends it.
6. **The twelve problems** — one section each: **La norma** (with the cited `Source`, linking the PDF) → **Qué hacer** (steps) → **Lo que cuenta la gente** (`quotes`, each with author, date, score, and a link to the thread; plus `reports` as "N personas contaron algo parecido en r/uruguay"). The testimony block must be visually distinct from the norm block — a quote is not law, and the page has to make that unmissable.
7. **Cross-links**: `/franquicia-aduana-uruguay` (rules + calculator), `/couriers-uruguay`, `/franquicia-viajero-uruguay`, `/estafas-uruguay`.
8. **Footer note**: `updatedAt`, and when `stale` is true, a quiet "estos datos no se actualizan hace más de dos semanas".

SEO: `useSeoMeta` (title/description/OG), `FAQPage` schema built from the 12 problems (question = `symptom`, answer = first steps), `HowTo` schema for the diagnosis flow, and the OG image (the site generates one per public page — follow `/franquicia-aduana-uruguay`).

- [ ] **Step 4: Run the page**

Run (from `app/`): `npm run dev`, open `http://localhost:3000/problemas-con-la-aduana-uruguay`.
Expected: 12 problem sections render, the 4 tools respond, no console errors. If `.nuxt` is stale after a restart, run `npx nuxi prepare`.

Verify the fallback too: stop the backend (or point `NUXT_API_BASE_SERVER` at a dead port) and reload. Expected: the page still renders the full guide from the baseline, with the "stale" note.

- [ ] **Step 5: Commit**

```bash
git add app/pages/problemas-con-la-aduana-uruguay.vue app/utils/siteNav.ts
git commit -m "feat(aduana): symptom-first customs problem hub with cited Reddit evidence"
```

---

### Task 10: Verify it end to end

**Files:**
- Create: `app/tests/e2e/problemas-aduana.spec.ts`

- [ ] **Step 1: Write the e2e test**

The page is Suspense-driven; a click before hydration silently does nothing (a latent bug we already found on `/mapa`). Gate on hydration with retries:

```ts
import { expect, test } from '@playwright/test'

test('the diagnosis tool answers, and the guide survives a dead backend', async ({ page }) => {
  await page.goto('/problemas-con-la-aduana-uruguay')

  // Hydration gate: retry until the app is interactive, or the first click is swallowed.
  await expect(async () => {
    await page.getByRole('button', { name: /paquete retenido/i }).first().click({ timeout: 1000 })
    await expect(page.getByTestId('plan-de-accion')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  await expect(page.getByTestId('plan-de-accion').getByRole('listitem').first()).toBeVisible()
  await expect(page.getByTestId('testimonios')).toContainText('reddit.com')
})
```

Add the `data-testid` attributes to the page as you go.

- [ ] **Step 2: Run it**

Run (from `app/`): `npx playwright test tests/e2e/problemas-aduana.spec.ts`
Expected: PASS.

- [ ] **Step 3: Full check**

Run, from `app/`: `npm run lint` (NOT `npm run typecheck` — vue-tsc crashes on this repo) and `npx vitest run`.
Run, from the repo root: `npx vitest run tests/aduana`.
Expected: all pass. Fix anything that does not.

- [ ] **Step 4: Contrast sweep, both themes**

Run (from `app/`): the light-mode axe sweep (`app/scripts/lightmode-axe.mjs`) against the new route. Expected: 0 contrast violations in light and dark. The site is dark-first; a new page tends to ship light-mode contrast bugs.

- [ ] **Step 5: Commit and write the deploy note**

```bash
git add app/tests/e2e/problemas-aduana.spec.ts
git commit -m "test(aduana): e2e hydration-gated diagnosis flow"
```

Then state plainly, in the PR body, what the reviewer must do by hand — the app deploys on push to main, **the backend does not**:

```
Backend (manual, on the VPS):
  ssh root@104.234.204.107 -p 2223
  cd /root/cambio-uruguay && git pull && npm install && npm run build
  pm2 restart currency-server && pm2 start ecosystem.config.js --only currency-aduana
  pm2 logs currency-aduana --lines 50   # first run: expect harvested>0, labeled>0
Blocked until `classes/couriers/opinions.ts` (a concurrent session's work) lands — the root build
does not compile without it.
```

---

## Self-Review

**Spec coverage:** §2 buckets → Tasks 1–2 (research + baseline) and 9 (rendering). §3 architecture → Tasks 2–7. §4 data model → Task 2 (`types.ts`), Task 3 (corpus collections). §5 AI guardrails → Task 5 (all five gates tested). §6 classification → Task 4 (AI labels + deterministic aggregation). §7 page + 4 tools → Tasks 8–9. §8 tests → every task is TDD; Task 10 closes e2e + a11y. §9 risks → Global Constraints (broken build, manual deploy, moving norms, corpus noise).

**Placeholders:** the only deliberately unwritten content is the legal text itself — `baseline.ts`'s `sources`/`problems` arrays and the research doc. That is not a placeholder dodge: those are the facts, and Task 1 exists precisely because inventing them is the one failure mode that costs a reader money. Everything else ships real code.

**Type consistency:** `AduanaDoc`, `AduanaFact`, `ProblemEntry`, `Quote`, `Source`, `BucketId`, `AduanaLabel` are declared once in `classes/aduana/types.ts` and used unchanged in `store`/`classify`/`norms`/`payload`. `PublicAduanaPayload` is declared in `payload.ts` and re-declared once, deliberately, in `app/server/utils/aduanaFallback.ts` (the two TS programs cannot import across — Task 2 Step 2 explains why, and `tests/aduana/baseline.test.ts` is the drift guard). `aggregate()` / `aggregateFromCorpus()` / `refreshLabels()` are named identically in Task 4, Task 6 and `sync_aduana.ts`.

## Deploy

The Nuxt app (`app/`) deploys itself on push to `main` (CI runs `app/scripts/deploy.sh`). **The root
Express backend and the weekly sync job do not** — that half is manual, on the VPS:

```
ssh root@104.234.204.107 -p 2223
cd /root/cambio-uruguay && git pull && npm install && npm run build
pm2 restart currency-server
pm2 start ecosystem.config.js --only currency-aduana   # first deploy only; a redeploy is `pm2 reload`
pm2 logs currency-aduana --lines 50
```

`currency-aduana` runs `dist/sync_aduana.js` on pm2's own cron (`cron_restart: "30 9 * * 1"` in
`ecosystem.config.js` — Mondays 09:30 UTC / ~06:30 Montevideo; note `sync_aduana.ts`'s header
comment says 08:40 UTC — that comment has drifted from the actual cron and should be corrected in a
follow-up, it does not affect behavior). `autorestart: false`, so it is meant to run once per cron
tick and exit, not stay up.

**GEMINI_API_KEY is not in the root `.env`.** `classes/aduana/gemini.ts` reads
`process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY`, but the actual key value lives only
in `app/.env` as `NUXT_GEMINI_API_KEY` — a separate process, separate env file, that the root
backend never loads. Until someone adds a `GEMINI_API_KEY=` (or `NUXT_GEMINI_API_KEY=`) line to the
root `.env` on the VPS, `classes/aduana/norms.ts`'s weekly re-check is a deliberate no-op: it logs
`[aduana] norms: no GEMINI_API_KEY — se omite el control de normas` and skips, by design (see the
header comment on `refreshNorms`) — it does not crash the job, block the harvest, or blank the page.

**REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET**: `classes/reddit.ts` reads these (plus
`REDDIT_USER_AGENT`) for `installed_client` auth, and the aduana harvest (`classes/aduana/harvest.ts`)
reuses that same client. This worktree has no root `.env` to inspect directly (gitignored, VPS-only),
so this could not be confirmed by reading a file — but the existing daily `reddit:sentiment` task
(couriers tier-list work, already live in production per prior sessions) uses this exact client and
these exact env vars today, which is strong indirect evidence they are already set on the VPS.
Confirm with `pm2 env <id-of-a-running-reddit-consuming-process>` or by checking the root `.env`
directly before assuming the aduana harvest will authenticate on first run.

**The `classes/couriers/opinions.ts` blocker described earlier in this plan did not reproduce in
this worktree.** Running `npx tsc -p tsconfig.production.json --noEmit` here produces exactly 8
errors, all `Cannot find module './sheet_key.json'` (TS2307) in unrelated scraper scripts
(`add_cambilex.ts`, `add_itau.ts`, `add_new.ts`, `autocomplete_sheet.ts`, `sync_bcu_single.ts`,
`sync_locations_sheet.ts`, `sync_sheet.ts`, `update_coordinates.ts`) — a gitignored Google Sheets
credentials file that is expected to be missing on a dev machine and present only on the VPS. No
file in this worktree imports `classes/couriers/opinions.ts` or anything named `opinions` from that
path. Either that blocker was already resolved by a merge, or it never applied to this branch's
checkout. Do not skip the real build on the VPS on the assumption it's still blocked — verify there,
where `sheet_key.json` actually exists, and treat a clean `npm run build` as the real signal.

**First run of `currency-aduana`**: watch for the `sync_aduana.ts` summary line —
`[aduana] sync summary: threads=X comments=Y labeled=Z facts=N confirmed=M flagged=K` — and expect
`threads`/`comments` (the harvest) and `labeled` to be greater than 0. If `flagged` (== `pendingReview`)
is non-empty, the very next line is `[aduana] NEEDS A HUMAN — facts the AI wants to change: <ids>` —
that is the alarm that the law may have moved and a human must read the cited source and confirm or
correct the fact by hand; it is not a bug and the job does not crash because of it.
