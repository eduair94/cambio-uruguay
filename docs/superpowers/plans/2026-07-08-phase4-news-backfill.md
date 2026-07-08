# Phase 4 — News Backfill + AI Narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give notable price moves real, honest content — a `MoveExplanation` Mongo collection joined into `AnalysisResult.moves`, populated automatically going forward (daily task) and seedable for the past via a token-gated admin endpoint the controller drives with real researched citations. No UI changes — the existing placeholders in `MovesTimeline` and the historico tooltip fill in once data exists.

**Architecture:** One new Mongo model. `buildAnalysis`'s internal driver-series loading is extracted into an exported `loadDriverSeries` helper (shared by the forward job and the backfill-seed endpoint, so both compute attribution identically and neither hand-types a number). `AnalysisResult.moves` becomes `EnrichedMove[]` (adds `headlines`/`narrative`, joined from `MoveExplanation`). The daily task gains a per-currency forward step; a new admin endpoint lets the controller persist real research without ever hand-computing attribution.

**Tech Stack:** Nuxt 4 + Nitro, Mongoose, `chatTextWithFallback` (existing AI util), vitest.

## Global Constraints

- All work under `app/`; run tests from `app/`. Unit: `npm run test:unit`.
- New model follows the exact `PriceNews`/`DriverSnapshot` pattern: `(mongoose.models.X as Model<Doc>) || mongoose.model<Doc>('X', Schema)`, `{ timestamps: true }`, unique compound index.
- **Persisted `MoveExplanation.drivers` shape is `{ key: string; dayMovePct: number }[]`** — simplified from the original design doc's `{key,r,dayMove}` wording. Nothing currently reads a stored `r` back (the join only surfaces `headlines`/`narrative` to the UI); adding it would require an extra correlations cross-reference for zero present payoff. Do not add `r` — if a future task needs it, add it then.
- **Forward news is USD-only.** `archiveTodayNews` archives the "Uruguay dólar/economía" RSS feed — genuinely dollar-focused, not per-currency. Attributing that feed's headlines to an EUR or ARS move would misattribute unrelated news. EUR/ARS forward explanations get `headlines: []` (honest — no dedicated feed exists yet) but MAY still get an AI narrative grounded purely in the measured attribution (never fabricates news).
- **Known pre-existing gap, fixed as part of Task 3**: `ingestDrivers(['USD'])` (in both `daily.ts` and `/api/drivers/ingest`) never fetches `eurusd` (EUR-only) or `arOfficial` (ARS-only) drivers, because `driversFor()` gates them to currencies not in that array. Since Phase 4's forward step already needs the daily task to loop over `['USD','EUR','ARS']`, fix this in the same call: `ingestDrivers(['USD', 'EUR', 'ARS'])`.
- `attributeMove(date, driverSeries)` (existing, `app/utils/attribution.ts`) and `chatTextWithFallback(opts)` (existing, `app/server/utils/ai.ts`) are reused as-is — do not modify either.
- Network/DB glue (Tasks 2-4) follows repo convention: no unit test, verified via a live dev-server run. Only the new Mongo model (Task 1) gets a unit test (`validateSync()`, matching `server-models.test.ts`/`driver-models.test.ts`).
- TypeScript strict `noUncheckedIndexedAccess`. Commit after each task.
- **This plan covers engineering only.** The actual WebSearch-driven backfill (45 real research tasks) happens after Task 4 ships, as a separate controller-driven activity — not part of this plan's tasks.

---

## File Structure

- Create: `app/server/models/MoveExplanation.ts`
- Test: `app/tests/unit/move-explanation-model.test.ts`
- Modify: `app/server/utils/analysis.ts` (export `loadDriverSeries`, enrich `moves`)
- Create: `app/server/utils/moveExplanation.ts` (`recordTodayExplanation`)
- Modify: `app/server/tasks/drivers/daily.ts` (forward loop + driver-ingest fix)
- Create: `app/server/api/analysis/backfill.post.ts` (admin seed endpoint)

---

## Task 1: MoveExplanation Mongo model

**Files:**
- Create: `app/server/models/MoveExplanation.ts`
- Test: `app/tests/unit/move-explanation-model.test.ts`

**Interfaces:**
- Produces: `MoveExplanationModel: Model<MoveExplanationDoc>` where
  `MoveExplanationDoc = { currency: string; date: string; pctChange: number; direction: 'up'|'down'; drivers: {key:string; dayMovePct:number}[]; narrative: string|null; headlines: {title:string; source:string; link:string}[] }`.
  Unique compound index `(currency, date)`.

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/move-explanation-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MoveExplanationModel } from '../../server/models/MoveExplanation'

describe('MoveExplanation model', () => {
  it('requires currency, date, pctChange, direction', () => {
    const doc = new MoveExplanationModel({})
    const err = doc.validateSync()
    expect(err?.errors.currency).toBeTruthy()
    expect(err?.errors.date).toBeTruthy()
    expect(err?.errors.pctChange).toBeTruthy()
    expect(err?.errors.direction).toBeTruthy()
  })

  it('rejects an unknown direction', () => {
    const doc = new MoveExplanationModel({
      currency: 'USD',
      date: '2026-06-01',
      pctChange: 1.2,
      direction: 'sideways',
    })
    expect(doc.validateSync()?.errors.direction).toBeTruthy()
  })

  it('accepts a full valid document with drivers/narrative/headlines', () => {
    const doc = new MoveExplanationModel({
      currency: 'USD',
      date: '2026-06-01',
      pctChange: 1.2,
      direction: 'up',
      drivers: [{ key: 'brl', dayMovePct: 0.9 }],
      narrative: 'El dólar subió por el real brasileño.',
      headlines: [{ title: 't', source: 's', link: 'l' }],
    })
    expect(doc.validateSync()).toBeUndefined()
  })

  it('defaults narrative to null and headlines/drivers to empty arrays', () => {
    const doc = new MoveExplanationModel({
      currency: 'USD',
      date: '2026-06-01',
      pctChange: 1.2,
      direction: 'up',
    })
    expect(doc.validateSync()).toBeUndefined()
    expect(doc.narrative).toBeNull()
    expect(doc.drivers).toEqual([])
    expect(doc.headlines).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- move-explanation-model`
Expected: FAIL — cannot resolve `../../server/models/MoveExplanation`.

- [ ] **Step 3: Write minimal implementation**

Create `app/server/models/MoveExplanation.ts`:

```ts
import mongoose, { Schema, type Model } from 'mongoose'

export interface MoveExplanationDoc {
  currency: string
  date: string // 'YYYY-MM-DD'
  pctChange: number
  direction: 'up' | 'down'
  drivers: { key: string; dayMovePct: number }[]
  narrative: string | null
  headlines: { title: string; source: string; link: string }[]
}

const MoveExplanationSchema = new Schema<MoveExplanationDoc>(
  {
    currency: { type: String, required: true },
    date: { type: String, required: true },
    pctChange: { type: Number, required: true },
    direction: { type: String, required: true, enum: ['up', 'down'] },
    drivers: {
      type: [{ _id: false, key: String, dayMovePct: Number }],
      default: [],
    },
    narrative: { type: String, default: null },
    headlines: {
      type: [{ _id: false, title: String, source: String, link: String }],
      default: [],
    },
  },
  { timestamps: true }
)

MoveExplanationSchema.index({ currency: 1, date: 1 }, { unique: true })

export const MoveExplanationModel: Model<MoveExplanationDoc> =
  (mongoose.models.MoveExplanation as Model<MoveExplanationDoc>) ||
  mongoose.model<MoveExplanationDoc>('MoveExplanation', MoveExplanationSchema)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- move-explanation-model`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add app/server/models/MoveExplanation.ts app/tests/unit/move-explanation-model.test.ts
git commit -m "feat(analysis): MoveExplanation Mongo model"
```

---

## Task 2: `analysis.ts` — export `loadDriverSeries`, enrich `moves` with headlines/narrative

**Files:**
- Modify: `app/server/utils/analysis.ts`

**Interfaces:**
- Consumes: `MoveExplanationModel` (Task 1).
- Produces:
  - `export async function loadDriverSeries(currency: string): Promise<{ key: string; points: SeriesPoint[] }[]>` — the driver-series loading logic already inlined in `buildAnalysis`, extracted so Task 3/4 can reuse it without duplicating Mongo reads.
  - `export interface EnrichedMove extends Move { headlines: {title:string;source:string;link:string}[]; narrative: string | null }`
  - `AnalysisResult.moves: EnrichedMove[]` (was `Move[]`).

- [ ] **Step 1: Replace the file content**

Current `app/server/utils/analysis.ts` (full file, for reference — CANONICAL/`fetchCanonicalSeries` unchanged from Phase 3):

```ts
import { connectDb } from './db'
import { DriverSnapshotModel } from '../models/DriverSnapshot'
import { PriceNewsModel } from '../models/PriceNews'
import { toSeries } from '../../utils/dollarSeries'
import { montevideoToday } from '../../utils/blog'
import { driversFor } from '../../utils/drivers/config'
import { snapshotsToDriverSeries, type DateValueMap } from '../../utils/drivers/pivot'
import { rankDrivers, detectMoves, type Correlation, type Move } from '../../utils/correlation'
import type { SeriesPoint } from '../../utils/rateStats'

export interface AnalysisResult {
  currency: string
  asOf: string
  base: SeriesPoint[]
  correlations: Correlation[]
  moves: Move[]
  headlines: { title: string; source: string; link: string; pubDate: string }[]
}

const CANONICAL: Record<string, { origin: string; code: string; type: string }> = {
  USD: { origin: 'bcu', code: 'USD', type: 'BILLETE' },
  EUR: { origin: 'brou', code: 'EUR', type: '' },
  ARS: { origin: 'bcu', code: 'ARS', type: 'BILLETE' },
}

async function fetchCanonicalSeries(currency: string): Promise<SeriesPoint[]> {
  const anchor = CANONICAL[currency] ?? CANONICAL.USD!
  const base = useRuntimeConfig().apiBaseServer
  const path = anchor.type
    ? `/evolution/${anchor.origin}/${anchor.code}/${anchor.type}`
    : `/evolution/${anchor.origin}/${anchor.code}`
  const res = await $fetch<{ evolution?: { date?: string; buy?: number; sell?: number }[] }>(path, {
    baseURL: base,
    query: { period: 60 },
  })
  return toSeries(res?.evolution, 'sell').map(p => ({ date: p.date.slice(0, 10), value: p.value }))
}

export async function buildAnalysis(currency: string): Promise<AnalysisResult> {
  await connectDb()
  const asOf = montevideoToday()

  const [base, snapshotDocs, newsDoc] = await Promise.all([
    fetchCanonicalSeries(currency),
    DriverSnapshotModel.find({}).lean(),
    PriceNewsModel.findOne({ currency, date: asOf }).lean(),
  ])

  const snapshots: DateValueMap[] = snapshotDocs.map(d => ({
    date: d.date,
    values: (d.values as unknown as Record<string, number>) ?? {},
  }))
  const driverSeries = snapshotsToDriverSeries(snapshots, driversFor(currency))

  return {
    currency,
    asOf,
    base,
    correlations: rankDrivers(base, driverSeries),
    moves: detectMoves(base, 1),
    headlines: newsDoc?.headlines ?? [],
  }
}
```

Replace it with:

```ts
import { connectDb } from './db'
import { DriverSnapshotModel } from '../models/DriverSnapshot'
import { PriceNewsModel } from '../models/PriceNews'
import { MoveExplanationModel } from '../models/MoveExplanation'
import { toSeries } from '../../utils/dollarSeries'
import { montevideoToday } from '../../utils/blog'
import { driversFor } from '../../utils/drivers/config'
import { snapshotsToDriverSeries, type DateValueMap } from '../../utils/drivers/pivot'
import { rankDrivers, detectMoves, type Correlation, type Move } from '../../utils/correlation'
import type { SeriesPoint } from '../../utils/rateStats'

export interface EnrichedMove extends Move {
  headlines: { title: string; source: string; link: string }[]
  narrative: string | null
}

export interface AnalysisResult {
  currency: string
  asOf: string
  base: SeriesPoint[]
  correlations: Correlation[]
  moves: EnrichedMove[]
  headlines: { title: string; source: string; link: string; pubDate: string }[]
}

const CANONICAL: Record<string, { origin: string; code: string; type: string }> = {
  USD: { origin: 'bcu', code: 'USD', type: 'BILLETE' },
  EUR: { origin: 'brou', code: 'EUR', type: '' },
  ARS: { origin: 'bcu', code: 'ARS', type: 'BILLETE' },
}

async function fetchCanonicalSeries(currency: string): Promise<SeriesPoint[]> {
  const anchor = CANONICAL[currency] ?? CANONICAL.USD!
  const base = useRuntimeConfig().apiBaseServer
  const path = anchor.type
    ? `/evolution/${anchor.origin}/${anchor.code}/${anchor.type}`
    : `/evolution/${anchor.origin}/${anchor.code}`
  const res = await $fetch<{ evolution?: { date?: string; buy?: number; sell?: number }[] }>(path, {
    baseURL: base,
    query: { period: 60 },
  })
  return toSeries(res?.evolution, 'sell').map(p => ({ date: p.date.slice(0, 10), value: p.value }))
}

/**
 * Load + pivot this currency's driver snapshots into per-driver series. Shared
 * by buildAnalysis and the forward/backfill move-explanation jobs so every
 * caller computes attribution from the exact same Mongo read, never a
 * hand-typed number.
 */
export async function loadDriverSeries(
  currency: string
): Promise<{ key: string; points: SeriesPoint[] }[]> {
  await connectDb()
  const snapshotDocs = await DriverSnapshotModel.find({}).lean()
  const snapshots: DateValueMap[] = snapshotDocs.map(d => ({
    date: d.date,
    values: (d.values as unknown as Record<string, number>) ?? {},
  }))
  return snapshotsToDriverSeries(snapshots, driversFor(currency))
}

/** Assemble driver correlations + notable moves (enriched with any archived
 *  explanation) + today's archived news for a currency. */
export async function buildAnalysis(currency: string): Promise<AnalysisResult> {
  await connectDb()
  const asOf = montevideoToday()

  const [base, driverSeries, newsDoc] = await Promise.all([
    fetchCanonicalSeries(currency),
    loadDriverSeries(currency),
    PriceNewsModel.findOne({ currency, date: asOf }).lean(),
  ])

  const moves = detectMoves(base, 1)
  const explanations = await MoveExplanationModel.find({
    currency,
    date: { $in: moves.map(m => m.date) },
  }).lean()
  const explanationByDate = new Map(explanations.map(e => [e.date, e]))
  const enrichedMoves: EnrichedMove[] = moves.map(m => ({
    ...m,
    headlines: explanationByDate.get(m.date)?.headlines ?? [],
    narrative: explanationByDate.get(m.date)?.narrative ?? null,
  }))

  return {
    currency,
    asOf,
    base,
    correlations: rankDrivers(base, driverSeries),
    moves: enrichedMoves,
    headlines: newsDoc?.headlines ?? [],
  }
}
```

- [ ] **Step 2: Live-verify (no regression, no data yet)**

This is network/DB glue — no unit test. At this point no `MoveExplanation` docs exist, so this is a **regression check**: `moves[]` must still have the same `date`/`pctChange`/`direction` fields as before, now also carrying `headlines:[]`/`narrative:null` on every entry.

Boot the dev server (`cd app && npm run dev`, poll until ready), then:
```bash
curl -s http://localhost:<port>/api/analysis/USD | head -c 400
```
Expected: 200, `moves` array present, each entry now has `"headlines":[]` and `"narrative":null` alongside the existing `date`/`pctChange`/`direction`. Kill the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add app/server/utils/analysis.ts
git commit -m "feat(analysis): export loadDriverSeries, enrich moves with MoveExplanation join"
```

---

## Task 3: Forward auto-population (`recordTodayExplanation` + `daily.ts`)

**Files:**
- Create: `app/server/utils/moveExplanation.ts`
- Modify: `app/server/tasks/drivers/daily.ts`

**Interfaces:**
- Consumes: `buildAnalysis`, `loadDriverSeries` (Task 2), `attributeMove` (existing, `app/utils/attribution.ts`), `chatTextWithFallback` (existing, `app/server/utils/ai.ts`), `MoveExplanationModel` (Task 1), `montevideoToday` (existing).
- Produces: `export async function recordTodayExplanation(currency: string): Promise<{ recorded: boolean; date: string }>`.

- [ ] **Step 1: Create `moveExplanation.ts`**

```ts
import { connectDb } from './db'
import { MoveExplanationModel } from '../models/MoveExplanation'
import { buildAnalysis, loadDriverSeries } from './analysis'
import { attributeMove } from '../../utils/attribution'
import { montevideoToday } from '../../utils/blog'
import { chatTextWithFallback } from './ai'

/**
 * If today is a notable move day for `currency`, upsert its MoveExplanation:
 * numeric attribution (always, computed from real driver data — never
 * hand-typed), today's archived headlines when available (only ever
 * populated for USD — the archived feed is Uruguay dollar/economy news, not
 * currency-specific), and a best-effort AI narrative grounded purely in the
 * measured attribution (never fabricates headlines). No-ops if today isn't a
 * notable move. Idempotent — safe to call repeatedly (e.g. re-running the
 * daily task).
 */
export async function recordTodayExplanation(
  currency: string
): Promise<{ recorded: boolean; date: string }> {
  await connectDb()
  const asOf = montevideoToday()

  const [{ moves, headlines, correlations }, driverSeries] = await Promise.all([
    buildAnalysis(currency),
    loadDriverSeries(currency),
  ])

  const today = moves.find(m => m.date === asOf)
  if (!today) return { recorded: false, date: asOf }

  const attribution = attributeMove(asOf, driverSeries).slice(0, 5)
  const drivers = attribution.map(d => ({ key: d.key, dayMovePct: d.dayMovePct }))
  void correlations // available if a future task wants to persist `r` too

  const directionWord = today.direction === 'down' ? 'bajó' : 'subió'
  const driverLines = attribution
    .map(d => `${d.key} ${d.dayMovePct >= 0 ? '+' : ''}${d.dayMovePct.toFixed(2)}%`)
    .join(', ')
  const narrative = await chatTextWithFallback({
    system:
      'Sos un analista financiero que explica movimientos cambiarios en Uruguay en 2-3 frases claras, en español, sin inventar datos ni noticias.',
    user: `El ${currency}/UYU ${directionWord} ${Math.abs(today.pctChange).toFixed(2)}% el ${asOf}. Ese día se movieron estos indicadores: ${driverLines || 'sin datos de drivers disponibles'}. Explicá brevemente qué pudo influir, basándote solo en estos datos (correlación, no causalidad; no afirmes causas que no estén en los datos).`,
  }).catch(() => null)

  await MoveExplanationModel.updateOne(
    { currency, date: asOf },
    {
      $set: {
        pctChange: today.pctChange,
        direction: today.direction,
        drivers,
        narrative,
        headlines,
      },
    },
    { upsert: true }
  )
  return { recorded: true, date: asOf }
}
```

- [ ] **Step 2: Extend `daily.ts`**

Current `app/server/tasks/drivers/daily.ts`:
```ts
// Nitro scheduled task: refresh macro-driver snapshots and archive today's news.
// Registered in nuxt.config under `nitro.scheduledTasks`. Idempotent.
import { ingestDrivers } from '../../utils/drivers/ingest'
import { archiveTodayNews } from '../../utils/priceNews'

export default defineTask({
  meta: {
    name: 'drivers:daily',
    description: 'Ingest macro drivers (FRED + argentinadatos) and archive daily news',
  },
  async run() {
    // Isolate the two responsibilities: a driver-ingest failure (e.g. DB/bulkWrite)
    // must NOT skip the daily news archive — missed news days are permanent gaps,
    // the exact problem this archive exists to prevent (and vice versa).
    const result: { drivers?: unknown; news?: unknown; errors?: Record<string, string> } = {}
    try {
      result.drivers = await ingestDrivers(['USD'])
    } catch (e) {
      result.errors = { ...result.errors, drivers: String((e as Error)?.message ?? e) }
    }
    try {
      result.news = await archiveTodayNews('USD')
    } catch (e) {
      result.errors = { ...result.errors, news: String((e as Error)?.message ?? e) }
    }
    return { result }
  },
})
```

Replace with:
```ts
// Nitro scheduled task: refresh macro-driver snapshots, archive today's news,
// and record today's move explanation per currency. Registered in nuxt.config
// under `nitro.scheduledTasks`. Idempotent.
import { ingestDrivers } from '../../utils/drivers/ingest'
import { archiveTodayNews } from '../../utils/priceNews'
import { recordTodayExplanation } from '../../utils/moveExplanation'

const EXPLAINED_CURRENCIES = ['USD', 'EUR', 'ARS']

export default defineTask({
  meta: {
    name: 'drivers:daily',
    description:
      "Ingest macro drivers (FRED + argentinadatos), archive daily news, record today's move explanations",
  },
  async run() {
    // Each step is isolated: one failing currency/step must never skip the
    // others — a missed news/explanation day is a permanent gap.
    const result: {
      drivers?: unknown
      news?: unknown
      explanations?: Record<string, unknown>
      errors?: Record<string, string>
    } = {}
    try {
      // USD+EUR+ARS so EUR-only (eurusd) and ARS-only (arOfficial) drivers get
      // ingested too — previously only USD-tagged drivers were ever fetched.
      result.drivers = await ingestDrivers(EXPLAINED_CURRENCIES)
    } catch (e) {
      result.errors = { ...result.errors, drivers: String((e as Error)?.message ?? e) }
    }
    try {
      // USD only: the archived feed is Uruguay dollar/economy news, not
      // currency-specific — attributing it to EUR/ARS moves would misattribute.
      result.news = await archiveTodayNews('USD')
    } catch (e) {
      result.errors = { ...result.errors, news: String((e as Error)?.message ?? e) }
    }
    result.explanations = {}
    for (const currency of EXPLAINED_CURRENCIES) {
      try {
        result.explanations[currency] = await recordTodayExplanation(currency)
      } catch (e) {
        result.errors = { ...result.errors, [`explanation:${currency}`]: String((e as Error)?.message ?? e) }
      }
    }
    return { result }
  },
})
```

- [ ] **Step 3: Live-verify**

Network/DB glue — no unit test. Boot the dev server (poll until ready), trigger the task:
```bash
curl -s -X POST http://localhost:<port>/_nitro/tasks/drivers:daily | head -c 500
```
Expected: `result.drivers` shows a higher `drivers` count than before (now includes `eurusd`/`arOfficial` — compare against a prior run's count if visible in logs, or just confirm no error and `drivers > 0`); `result.explanations` has `USD`/`EUR`/`ARS` keys each shaped `{recorded: boolean, date: "YYYY-MM-DD"}`; `result.errors` absent or only for genuinely-transient issues. `recorded:false` for a currency is a VALID pass when there's truly no notable move that day — do not treat it as a failure. If the `_nitro/tasks` dev endpoint is disabled, import-and-call is not an option (no test harness for scheduled tasks in this repo) — instead confirm the task file typechecks/lints cleanly and defer full end-to-end proof to Task 4, which exercises the identical model/upsert path with a real seed. Kill the dev server when done.

Run: `cd app && npx eslint server/utils/moveExplanation.ts server/tasks/drivers/daily.ts` → clean.
Run: `cd app && npm run test:unit` → all green (includes Task 1's new spec, no other test affected).

- [ ] **Step 4: Commit**

```bash
git add app/server/utils/moveExplanation.ts app/server/tasks/drivers/daily.ts
git commit -m "feat(analysis): forward move-explanation recording (USD/EUR/ARS) + fix driver-ingest currency gap"
```

---

## Task 4: Backfill-seed admin endpoint

**Files:**
- Create: `app/server/api/analysis/backfill.post.ts`

**Interfaces:**
- Consumes: `loadDriverSeries` (Task 2), `attributeMove` (existing), `MoveExplanationModel` (Task 1).
- Produces: `POST /api/analysis/backfill` — body `{ currency, date, pctChange, direction, headlines?, narrative? }` → upserts a `MoveExplanation` with server-computed attribution.

- [ ] **Step 1: Create the endpoint**

```ts
// Admin-only: seed a historical MoveExplanation from controller-researched
// headlines/narrative (real WebSearch citations, never fabricated). Computes
// attribution server-side from real driver data via loadDriverSeries +
// attributeMove — the caller supplies only the currency, date, the move's own
// pctChange/direction (read off the existing /api/analysis/:currency response),
// and the researched headlines/narrative. Mirrors /api/drivers/ingest's token
// gate + cache-bust pattern.
import { connectDb } from '../../utils/db'
import { MoveExplanationModel } from '../../models/MoveExplanation'
import { loadDriverSeries } from '../../utils/analysis'
import { attributeMove } from '../../../utils/attribution'

interface BackfillBody {
  currency: string
  date: string // YYYY-MM-DD
  pctChange: number
  direction: 'up' | 'down'
  headlines?: { title: string; source: string; link: string }[]
  narrative?: string | null
}

export default defineEventHandler(async event => {
  const required = useRuntimeConfig().driversIngestToken
  if (required) {
    const provided = getHeader(event, 'x-ingest-token') || String(getQuery(event).token || '')
    if (provided !== required) {
      throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
    }
  }

  const body = await readBody<BackfillBody>(event)
  if (!body?.currency || !body?.date || typeof body.pctChange !== 'number' || !body.direction) {
    throw createError({
      statusCode: 400,
      statusMessage: 'currency, date, pctChange, direction are required',
    })
  }
  const currency = body.currency.toUpperCase()

  await connectDb()
  const driverSeries = await loadDriverSeries(currency)
  const drivers = attributeMove(body.date, driverSeries)
    .slice(0, 5)
    .map(d => ({ key: d.key, dayMovePct: d.dayMovePct }))

  await MoveExplanationModel.updateOne(
    { currency, date: body.date },
    {
      $set: {
        pctChange: body.pctChange,
        direction: body.direction,
        drivers,
        narrative: body.narrative ?? null,
        headlines: body.headlines ?? [],
      },
    },
    { upsert: true }
  )

  // Best-effort cache invalidation, matching /api/drivers/ingest — so the
  // seeded explanation shows up immediately instead of after the TTL.
  try {
    const cache = useStorage('cache')
    const keys = await cache.getKeys()
    await Promise.all(keys.filter(k => k.includes('analysis')).map(k => cache.removeItem(k)))
  } catch {
    // Non-fatal.
  }

  return { ok: true, currency, date: body.date, driversAttributed: drivers.length }
})
```

- [ ] **Step 2: Live-verify end-to-end**

Boot the dev server (poll until ready). Pick a REAL move date already visible in `/api/analysis/USD`'s `moves` array (from Task 2's earlier check or a fresh curl), then seed it:

```bash
curl -s http://localhost:<port>/api/analysis/USD | head -c 600   # find a real moves[] entry: date, pctChange, direction
curl -s -X POST http://localhost:<port>/api/analysis/backfill \
  -H 'Content-Type: application/json' \
  -d '{"currency":"USD","date":"<a real move date from above>","pctChange":<its pctChange>,"direction":"<its direction>","headlines":[{"title":"Test headline","source":"Test","link":"https://example.com"}],"narrative":"Test narrative."}'
```
Expected: `{"ok":true,"currency":"USD","date":"...", "driversAttributed": <n>}` with `n` typically 1-5 (however many drivers had data that day; 0 is possible and not an error if no driver had a value on that specific date).

Then confirm the join works:
```bash
curl -s http://localhost:<port>/api/analysis/USD | grep -o '"date":"<that date>"[^}]*'
```
Expected: that specific move entry now shows `"headlines":[{"title":"Test headline",...}]` and `"narrative":"Test narrative."` — proving the full write→join→read path. Then re-run the same POST once more and confirm it's still `ok:true` with the SAME date (idempotent upsert, no duplicate-key error). Kill the dev server when done.

Run: `cd app && npx eslint server/api/analysis/backfill.post.ts` → clean.
Run: `cd app && npm run test:unit` → all green (no new unit tests added by this task; confirms no regression).

- [ ] **Step 3: Commit**

```bash
git add app/server/api/analysis/backfill.post.ts
git commit -m "feat(analysis): admin POST /api/analysis/backfill to seed researched MoveExplanations"
```

---

## Self-Review

**Spec coverage:**
- `MoveExplanation` model → Task 1. ✓
- `buildAnalysis`/`Move` enrichment with headlines/narrative, no new endpoint, no UI changes → Task 2. ✓
- Forward auto-population via daily task, USD/EUR/ARS, isolated per-currency, headlines USD-only (honest) → Task 3. ✓
- Driver-ingest currency gap (`eurusd`/`arOfficial` never fetched) fixed in the same task that already needed the multi-currency loop → Task 3. ✓
- AI narrative reuses `chatTextWithFallback`, degrades to `null` → Tasks 3 (forward) and available via the same drivers in Task 4's stored data (backfill narrative supplied by the controller's own research step, not generated here — matches design: backfill narrative is optional and produced by the controller alongside the researched headlines).
- Backfill-seed mechanism (controller-driven, server-computed attribution, never hand-typed) → Task 4. ✓
- Out of scope (correctly excluded from this plan): the actual 45 WebSearch research dispatches — a separate controller-driven activity after Task 4 ships.

**Placeholder scan:** No TBD/TODO. Tasks 2-4 are network/DB glue per established convention (no unit test), each with concrete verification commands and expected output.

**Type consistency:** `loadDriverSeries` (Task 2) return shape `{key,points:SeriesPoint[]}[]` matches `attributeMove`'s expected param exactly (existing signature, unchanged). `EnrichedMove` (Task 2) is consumed identically by Task 3 (`buildAnalysis(currency).moves`) and by the existing UI consumers (`Move`'s `date`/`pctChange`/`direction` fields untouched, only additive fields). `MoveExplanationDoc.drivers` shape (Task 1: `{key,dayMovePct}`) matches exactly what Task 3 and Task 4 both write (`attributeMove`'s output mapped 1:1, no extra fields invented).
