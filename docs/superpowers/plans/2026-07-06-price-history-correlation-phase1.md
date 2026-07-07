# Price-History News + Macro-Driver Correlation — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data foundation that ingests measurable macro drivers, computes real (log-return) correlation against the canonical BCU USD/UYU series, detects notable price moves, and persists a forward news archive — exposed via `GET /api/drivers` and `GET /api/analysis/USD`. No UI yet.

**Architecture:** Pure, framework-agnostic logic (correlation math + source parsers) lives in `app/utils/**` and is unit-tested with vitest. Network + DB glue lives in `app/server/utils/**` (Nitro auto-imports `$fetch`/`useRuntimeConfig`). Two Mongo models (`DriverSnapshot`, `PriceNews`) persist to the Nitro-side Mongo via the existing `connectDb()` helper. Two cached Nitro API routes and one scheduled task tie it together. The canonical price series is fetched from the existing Express backend `/evolution/bcu/USD`; the backend is never modified.

**Tech Stack:** Nuxt 4 + Nitro, Mongoose, vitest (`app/tests/unit/**/*.test.ts`), TypeScript (strict, `noUncheckedIndexedAccess`).

## Global Constraints

- Node/Nuxt project root for all app work is `app/` — run every `npm`/test command from `app/`.
- Unit tests: `app/tests/unit/**/*.test.ts`, run with `npm run test:unit` (vitest, `globals: true`, `environment: 'node'`). Tested logic must be framework-agnostic — relative imports only, NO Nuxt auto-imports, so no Nuxt runtime is needed.
- Pure logic goes in `app/utils/**`; server (network/DB) glue in `app/server/**`. Never import server code into a unit-tested pure util.
- Series shape is the existing `SeriesPoint = { date: string; value: number }` exported from `app/utils/rateStats.ts`. Reuse it — do not define a parallel type.
- Date keys are `YYYY-MM-DD` in `America/Montevideo`. Reuse `montevideoToday()` from `app/utils/blog.ts`.
- Mongoose model file pattern (copy exactly): guard re-registration with `(mongoose.models.X as Model<Doc>) || mongoose.model<Doc>('X', Schema)`, `{ timestamps: true }`.
- Correlation is computed on **daily log-returns, never price levels** (levels give spurious correlation).
- TypeScript must stay clean under `noUncheckedIndexedAccess` — guard array indexing (`arr[i]` is `T | undefined`).
- Backend base URL for SSR/server fetches: `useRuntimeConfig().apiBaseServer` (defaults to `http://104.234.204.107:3528`).
- Commit after every task with the message shown in its final step.

---

## File Structure

**Pure utils (unit-tested):**
- `app/utils/correlation.ts` — log-returns, date alignment, Pearson, driver ranking, move detection.
- `app/utils/drivers/stooqCsv.ts` — parse stooq daily CSV → `SeriesPoint[]`.
- `app/utils/drivers/argentinaDatos.ts` — parse argentinadatos.com dolar history → `SeriesPoint[]`.
- `app/utils/drivers/config.ts` — per-currency driver definitions + `driversFor()`.
- `app/utils/drivers/pivot.ts` — turn stored per-date driver maps into per-driver `SeriesPoint[]`.

**Server glue (network/DB):**
- `app/server/models/DriverSnapshot.ts` — one doc per day, `values: Map<driverKey, number>`.
- `app/server/models/PriceNews.ts` — one doc per (date, currency), `headlines[]`.
- `app/server/utils/drivers/fetchStooq.ts` — network fetch → `parseStooqCsv`.
- `app/server/utils/drivers/fetchArgentina.ts` — network fetch → `parseArgentinaDatos`.
- `app/server/utils/drivers/ingest.ts` — fetch all configured drivers → upsert `DriverSnapshot`.
- `app/server/utils/priceNews.ts` — snapshot today's RSS → upsert `PriceNews`.
- `app/server/utils/analysis.ts` — assemble correlations + moves + today's news for a currency.
- `app/server/api/drivers.get.ts` — cached driver series endpoint.
- `app/server/api/analysis/[currency].get.ts` — cached analysis endpoint.
- `app/server/tasks/drivers/daily.ts` — daily ingest + news archive.

**Config:**
- `app/nuxt.config.ts` — register `drivers:daily` scheduled task + cron.

---

## Task 1: Correlation math util

**Files:**
- Create: `app/utils/correlation.ts`
- Test: `app/tests/unit/correlation.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint` from `app/utils/rateStats.ts` (`{ date: string; value: number }`).
- Produces:
  - `logReturns(series: SeriesPoint[]): SeriesPoint[]` — return keyed by the LATER date.
  - `alignByDate(a: SeriesPoint[], b: SeriesPoint[]): { a: number[]; b: number[] }`
  - `pearson(xs: number[], ys: number[]): number`
  - `rankDrivers(base: SeriesPoint[], drivers: { key: string; points: SeriesPoint[] }[]): Correlation[]` where `Correlation = { key: string; r: number; n: number }`
  - `detectMoves(series: SeriesPoint[], thresholdPct?: number): Move[]` where `Move = { date: string; pctChange: number; direction: 'up' | 'down' }`

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/correlation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { logReturns, alignByDate, pearson, rankDrivers, detectMoves } from '../../utils/correlation'

const S = (pairs: [string, number][]) => pairs.map(([date, value]) => ({ date, value }))

describe('logReturns', () => {
  it('computes ln(v[i]/v[i-1]) keyed by the later date', () => {
    const out = logReturns(S([['2026-06-01', 100], ['2026-06-02', 110]]))
    expect(out).toHaveLength(1)
    expect(out[0]!.date).toBe('2026-06-02')
    expect(out[0]!.value).toBeCloseTo(Math.log(110 / 100), 10)
  })
  it('skips non-positive or non-finite values', () => {
    expect(logReturns(S([['a', 0], ['b', 10]]))).toEqual([])
    expect(logReturns([])).toEqual([])
  })
})

describe('alignByDate', () => {
  it('keeps only dates present in both, in a-order', () => {
    const a = S([['d1', 1], ['d2', 2], ['d3', 3]])
    const b = S([['d2', 20], ['d3', 30], ['d4', 40]])
    expect(alignByDate(a, b)).toEqual({ a: [2, 3], b: [20, 30] })
  })
})

describe('pearson', () => {
  it('is 1 for a perfect positive linear relation', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10)
  })
  it('is -1 for a perfect negative relation', () => {
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10)
  })
  it('is 0 for zero variance or fewer than 2 points', () => {
    expect(pearson([5, 5, 5], [1, 2, 3])).toBe(0)
    expect(pearson([1], [1])).toBe(0)
  })
})

describe('rankDrivers', () => {
  it('ranks by absolute correlation of returns, descending, keeping sign', () => {
    // Base must have NON-constant returns, else every correlation is 0 (zero variance).
    const base = S([['d1', 100], ['d2', 110], ['d3', 105], ['d4', 115]])
    // strong = base scaled ×0.5 → identical ratios → identical log-returns → r = +1 exactly
    const strong = { key: 'strong', points: S([['d1', 50], ['d2', 55], ['d3', 52.5], ['d4', 57.5]]) }
    // anti moves opposite to base but imperfectly → r < 0 and |r| < 1
    const anti = { key: 'anti', points: S([['d1', 100], ['d2', 90], ['d3', 95], ['d4', 88]]) }
    const ranked = rankDrivers(base, [anti, strong])
    expect(ranked).toHaveLength(2)
    const strongR = ranked.find(c => c.key === 'strong')!
    const antiR = ranked.find(c => c.key === 'anti')!
    expect(strongR.r).toBeCloseTo(1, 6)
    expect(strongR.n).toBe(3)
    expect(antiR.r).toBeLessThan(0)
    expect(antiR.r).toBeGreaterThan(-1)
    // strong's |r| (1.0) exceeds anti's, so it ranks first
    expect(ranked[0]!.key).toBe('strong')
  })
})

describe('detectMoves', () => {
  it('flags day-over-day moves above the threshold', () => {
    const moves = detectMoves(S([['d1', 100], ['d2', 100.5], ['d3', 103]]), 1)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.date).toBe('d3')
    expect(moves[0]!.direction).toBe('up')
    expect(moves[0]!.pctChange).toBeCloseTo(2.4876, 3)
  })
  it('detects down moves and respects a custom threshold', () => {
    const moves = detectMoves(S([['d1', 100], ['d2', 97]]), 2)
    expect(moves[0]!.direction).toBe('down')
    expect(moves[0]!.pctChange).toBeCloseTo(-3, 6)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- correlation`
Expected: FAIL — cannot resolve `../../utils/correlation`.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/correlation.ts`:

```ts
import type { SeriesPoint } from './rateStats'

export interface Correlation {
  key: string
  r: number
  n: number
}

export interface Move {
  date: string
  pctChange: number
  direction: 'up' | 'down'
}

/** Daily log-returns of a date-sorted series, each keyed by the later date. */
export function logReturns(series: SeriesPoint[]): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const cur = series[i]
    if (!prev || !cur) continue
    if (prev.value <= 0 || cur.value <= 0) continue
    const r = Math.log(cur.value / prev.value)
    if (!Number.isFinite(r)) continue
    out.push({ date: cur.date, value: r })
  }
  return out
}

/** Inner-join two series on the shared calendar-day key (YYYY-MM-DD), preserving the
 *  order of `a`. Series may carry ISO datetimes or plain day strings — both are sliced
 *  to the day so the join never silently misses on a format mismatch (the backend
 *  evolution feed returns ISO datetimes; driver/news dates are plain YYYY-MM-DD). */
export function alignByDate(a: SeriesPoint[], b: SeriesPoint[]): { a: number[]; b: number[] } {
  const dayKey = (d: string) => d.slice(0, 10)
  const bMap = new Map(b.map(p => [dayKey(p.date), p.value]))
  const xs: number[] = []
  const ys: number[] = []
  for (const p of a) {
    const y = bMap.get(dayKey(p.date))
    if (y === undefined) continue
    xs.push(p.value)
    ys.push(y)
  }
  return { a: xs, b: ys }
}

/** Pearson correlation. Returns 0 for <2 points or zero variance. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return 0
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += xs[i]!
    sy += ys[i]!
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx
    const b = ys[i]! - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  const den = Math.sqrt(dx * dy)
  if (den === 0) return 0
  return num / den
}

/** Correlate each driver's returns against the base series' returns; rank by |r| desc. */
export function rankDrivers(
  base: SeriesPoint[],
  drivers: { key: string; points: SeriesPoint[] }[]
): Correlation[] {
  const baseR = logReturns(base)
  return drivers
    .map(d => {
      const { a, b } = alignByDate(baseR, logReturns(d.points))
      return { key: d.key, r: pearson(a, b), n: a.length }
    })
    .sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
}

/** Days whose |% change vs the previous point| exceeds thresholdPct (default 1). */
export function detectMoves(series: SeriesPoint[], thresholdPct = 1): Move[] {
  const out: Move[] = []
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const cur = series[i]
    if (!prev || !cur || prev.value <= 0) continue
    const pct = ((cur.value - prev.value) / prev.value) * 100
    if (Math.abs(pct) <= thresholdPct) continue
    out.push({ date: cur.date, pctChange: pct, direction: pct >= 0 ? 'up' : 'down' })
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- correlation`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add app/utils/correlation.ts app/tests/unit/correlation.test.ts
git commit -m "feat(analysis): log-return correlation + move-detection util"
```

---

## Task 2: stooq CSV parser

**Files:**
- Create: `app/utils/drivers/stooqCsv.ts`
- Test: `app/tests/unit/stooqCsv.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint` from `app/utils/rateStats.ts`.
- Produces: `parseStooqCsv(csv: string): SeriesPoint[]` — date-sorted close series.

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/stooqCsv.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseStooqCsv } from '../../utils/drivers/stooqCsv'

describe('parseStooqCsv', () => {
  it('parses Date + Close, dropping the header, sorted by date', () => {
    const csv = [
      'Date,Open,High,Low,Close,Volume',
      '2026-06-02,104.1,104.5,103.9,104.4,0',
      '2026-06-01,103.8,104.2,103.6,104.0,0',
    ].join('\n')
    expect(parseStooqCsv(csv)).toEqual([
      { date: '2026-06-01', value: 104.0 },
      { date: '2026-06-02', value: 104.4 },
    ])
  })
  it('skips rows with N/D or non-numeric close', () => {
    const csv = 'Date,Open,High,Low,Close,Volume\n2026-06-01,N/D,N/D,N/D,N/D,N/D\n2026-06-02,1,1,1,42.5,0'
    expect(parseStooqCsv(csv)).toEqual([{ date: '2026-06-02', value: 42.5 }])
  })
  it('tolerates empty / malformed input', () => {
    expect(parseStooqCsv('')).toEqual([])
    expect(parseStooqCsv('garbage')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- stooqCsv`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/drivers/stooqCsv.ts`:

```ts
import type { SeriesPoint } from '../rateStats'

/** Parse a stooq daily CSV (`Date,Open,High,Low,Close,Volume`) into a close series. */
export function parseStooqCsv(csv: string): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (const line of csv.split(/\r?\n/)) {
    const cols = line.split(',')
    if (cols.length < 5) continue
    const date = cols[0]!.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue // skips header + junk
    const value = Number(cols[4])
    if (!Number.isFinite(value) || value <= 0) continue
    out.push({ date, value })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- stooqCsv`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/drivers/stooqCsv.ts app/tests/unit/stooqCsv.test.ts
git commit -m "feat(analysis): stooq daily-CSV close-series parser"
```

---

## Task 3: argentinadatos parser

**Files:**
- Create: `app/utils/drivers/argentinaDatos.ts`
- Test: `app/tests/unit/argentinaDatos.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint` from `app/utils/rateStats.ts`.
- Produces:
  - `interface ArgRow { fecha?: string; compra?: number; venta?: number }`
  - `parseArgentinaDatos(rows: ArgRow[] | undefined, kind?: 'venta' | 'compra'): SeriesPoint[]` (default `'venta'`).

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/argentinaDatos.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseArgentinaDatos } from '../../utils/drivers/argentinaDatos'

describe('parseArgentinaDatos', () => {
  it('maps fecha/venta into a sorted {date,value} series', () => {
    const rows = [
      { casa: 'blue', compra: 1180, venta: 1200, fecha: '2026-06-02' },
      { casa: 'blue', compra: 1170, venta: 1190, fecha: '2026-06-01' },
    ]
    expect(parseArgentinaDatos(rows)).toEqual([
      { date: '2026-06-01', value: 1190 },
      { date: '2026-06-02', value: 1200 },
    ])
  })
  it('can select compra and drops rows missing fecha or value', () => {
    const rows = [
      { compra: 1170, venta: 1190, fecha: '2026-06-01' },
      { compra: 1180, venta: 1200 },
      { venta: 1210, fecha: '2026-06-03' },
    ]
    expect(parseArgentinaDatos(rows, 'compra')).toEqual([{ date: '2026-06-01', value: 1170 }])
  })
  it('tolerates undefined', () => {
    expect(parseArgentinaDatos(undefined)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- argentinaDatos`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/drivers/argentinaDatos.ts`:

```ts
import type { SeriesPoint } from '../rateStats'

export interface ArgRow {
  fecha?: string
  compra?: number
  venta?: number
}

/** Parse argentinadatos.com dolar history into a {date,value} series (default: venta/sell). */
export function parseArgentinaDatos(
  rows: ArgRow[] | undefined,
  kind: 'venta' | 'compra' = 'venta'
): SeriesPoint[] {
  if (!Array.isArray(rows)) return []
  const out: SeriesPoint[] = []
  for (const row of rows) {
    if (!row || !row.fecha) continue
    const value = kind === 'venta' ? row.venta : row.compra
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
    out.push({ date: row.fecha, value })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- argentinaDatos`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/drivers/argentinaDatos.ts app/tests/unit/argentinaDatos.test.ts
git commit -m "feat(analysis): argentinadatos dolar-history parser"
```

---

## Task 4: Driver config + snapshot pivot

**Files:**
- Create: `app/utils/drivers/config.ts`
- Create: `app/utils/drivers/pivot.ts`
- Test: `app/tests/unit/drivers-config.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint` from `app/utils/rateStats.ts`.
- Produces:
  - `type DriverSource = 'stooq' | 'argentinadatos'`
  - `interface DriverDef { key: string; label: string; source: DriverSource; symbol: string; currencies: string[] }`
  - `const DRIVERS: DriverDef[]`
  - `driversFor(currency: string): DriverDef[]`
  - `interface DateValueMap { date: string; values: Record<string, number> }`
  - `snapshotsToDriverSeries(snapshots: DateValueMap[], defs: DriverDef[]): { key: string; points: SeriesPoint[] }[]`

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/drivers-config.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DRIVERS, driversFor } from '../../utils/drivers/config'
import { snapshotsToDriverSeries } from '../../utils/drivers/pivot'

describe('driver config', () => {
  it('every driver has a unique key and at least one currency', () => {
    const keys = DRIVERS.map(d => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const d of DRIVERS) expect(d.currencies.length).toBeGreaterThan(0)
  })
  it('driversFor(USD) returns only USD-tagged drivers', () => {
    const usd = driversFor('USD')
    expect(usd.length).toBeGreaterThan(0)
    for (const d of usd) expect(d.currencies).toContain('USD')
    expect(usd.map(d => d.key)).toContain('dxy')
  })
})

describe('snapshotsToDriverSeries', () => {
  it('builds one date-sorted series per driver, skipping missing values', () => {
    const defs = [
      { key: 'dxy', label: '', source: 'stooq' as const, symbol: 'dx.f', currencies: ['USD'] },
      { key: 'arBlue', label: '', source: 'argentinadatos' as const, symbol: 'blue', currencies: ['USD'] },
    ]
    const snapshots = [
      { date: '2026-06-02', values: { dxy: 104.4, arBlue: 1200 } },
      { date: '2026-06-01', values: { dxy: 104.0 } }, // arBlue missing this day
    ]
    const out = snapshotsToDriverSeries(snapshots, defs)
    expect(out.find(s => s.key === 'dxy')!.points).toEqual([
      { date: '2026-06-01', value: 104.0 },
      { date: '2026-06-02', value: 104.4 },
    ])
    expect(out.find(s => s.key === 'arBlue')!.points).toEqual([{ date: '2026-06-02', value: 1200 }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- drivers-config`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/drivers/config.ts`:

```ts
export type DriverSource = 'stooq' | 'argentinadatos'

export interface DriverDef {
  key: string
  label: string
  source: DriverSource
  /** stooq symbol (e.g. 'dx.f') or argentinadatos dolar path (e.g. 'blue'). */
  symbol: string
  /** Target currencies this driver is expected to help explain. */
  currencies: string[]
}

// Phase 1 anchors on USD. EUR/ARS drivers are declared for Phase 3 reuse but
// unused until then. Verify stooq symbols return data on first ingest run.
export const DRIVERS: DriverDef[] = [
  { key: 'dxy', label: 'Índice dólar (DXY)', source: 'stooq', symbol: 'dx.f', currencies: ['USD', 'EUR'] },
  { key: 'us10y', label: 'Bono EE.UU. 10 años', source: 'stooq', symbol: '10usy.b', currencies: ['USD'] },
  { key: 'soybean', label: 'Soja (CBOT)', source: 'stooq', symbol: 'zs.f', currencies: ['USD'] },
  { key: 'brl', label: 'Real BRL/USD', source: 'stooq', symbol: 'usdbrl', currencies: ['USD'] },
  { key: 'arBlue', label: 'Dólar blue Argentina', source: 'argentinadatos', symbol: 'blue', currencies: ['USD', 'ARS'] },
  { key: 'arOfficial', label: 'Dólar oficial Argentina', source: 'argentinadatos', symbol: 'oficial', currencies: ['ARS'] },
  { key: 'eurusd', label: 'EUR/USD', source: 'stooq', symbol: 'eurusd', currencies: ['EUR'] },
]

export function driversFor(currency: string): DriverDef[] {
  return DRIVERS.filter(d => d.currencies.includes(currency))
}
```

Create `app/utils/drivers/pivot.ts`:

```ts
import type { SeriesPoint } from '../rateStats'
import type { DriverDef } from './config'

export interface DateValueMap {
  date: string
  values: Record<string, number>
}

/** Turn stored per-date driver maps into one date-sorted SeriesPoint[] per driver. */
export function snapshotsToDriverSeries(
  snapshots: DateValueMap[],
  defs: DriverDef[]
): { key: string; points: SeriesPoint[] }[] {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  return defs.map(def => {
    const points: SeriesPoint[] = []
    for (const snap of sorted) {
      const value = snap.values[def.key]
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        points.push({ date: snap.date, value })
      }
    }
    return { key: def.key, points }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- drivers-config`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/drivers/config.ts app/utils/drivers/pivot.ts app/tests/unit/drivers-config.test.ts
git commit -m "feat(analysis): per-currency driver config + snapshot pivot"
```

---

## Task 5: Mongo models (DriverSnapshot, PriceNews)

**Files:**
- Create: `app/server/models/DriverSnapshot.ts`
- Create: `app/server/models/PriceNews.ts`
- Test: `app/tests/unit/driver-models.test.ts`

**Interfaces:**
- Produces:
  - `DriverSnapshotModel` with `interface DriverSnapshotDoc { date: string; values: Map<string, number> }`
  - `PriceNewsModel` with `interface PriceNewsDoc { date: string; currency: string; headlines: { title: string; source: string; link: string; pubDate: string }[] }`

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/driver-models.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DriverSnapshotModel } from '../../server/models/DriverSnapshot'
import { PriceNewsModel } from '../../server/models/PriceNews'

describe('DriverSnapshot model', () => {
  it('requires a date', () => {
    const doc = new DriverSnapshotModel({})
    expect(doc.validateSync()?.errors.date).toBeTruthy()
  })
  it('accepts a date with a values map', () => {
    const doc = new DriverSnapshotModel({ date: '2026-06-01', values: { dxy: 104.2 } })
    expect(doc.validateSync()).toBeUndefined()
    expect(doc.values.get('dxy')).toBe(104.2)
  })
})

describe('PriceNews model', () => {
  it('requires date and currency', () => {
    const doc = new PriceNewsModel({})
    const err = doc.validateSync()
    expect(err?.errors.date).toBeTruthy()
    expect(err?.errors.currency).toBeTruthy()
  })
  it('accepts a headlines array', () => {
    const doc = new PriceNewsModel({
      date: '2026-06-01',
      currency: 'USD',
      headlines: [{ title: 't', source: 's', link: 'l', pubDate: 'p' }],
    })
    expect(doc.validateSync()).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- driver-models`
Expected: FAIL — cannot resolve models.

- [ ] **Step 3: Write minimal implementation**

Create `app/server/models/DriverSnapshot.ts`:

```ts
import mongoose, { Schema, type Model } from 'mongoose'

export interface DriverSnapshotDoc {
  date: string // 'YYYY-MM-DD' America/Montevideo
  values: Map<string, number>
}

const DriverSnapshotSchema = new Schema<DriverSnapshotDoc>(
  {
    date: { type: String, required: true, unique: true, index: true },
    values: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
)

export const DriverSnapshotModel: Model<DriverSnapshotDoc> =
  (mongoose.models.DriverSnapshot as Model<DriverSnapshotDoc>) ||
  mongoose.model<DriverSnapshotDoc>('DriverSnapshot', DriverSnapshotSchema)
```

Create `app/server/models/PriceNews.ts`:

```ts
import mongoose, { Schema, type Model } from 'mongoose'

export interface PriceNewsDoc {
  date: string // 'YYYY-MM-DD' America/Montevideo
  currency: string
  headlines: { title: string; source: string; link: string; pubDate: string }[]
}

const PriceNewsSchema = new Schema<PriceNewsDoc>(
  {
    date: { type: String, required: true },
    currency: { type: String, required: true },
    headlines: [
      {
        _id: false,
        title: String,
        source: String,
        link: String,
        pubDate: String,
      },
    ],
  },
  { timestamps: true }
)

PriceNewsSchema.index({ date: 1, currency: 1 }, { unique: true })

export const PriceNewsModel: Model<PriceNewsDoc> =
  (mongoose.models.PriceNews as Model<PriceNewsDoc>) ||
  mongoose.model<PriceNewsDoc>('PriceNews', PriceNewsSchema)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- driver-models`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/server/models/DriverSnapshot.ts app/server/models/PriceNews.ts app/tests/unit/driver-models.test.ts
git commit -m "feat(analysis): DriverSnapshot + PriceNews Mongo models"
```

---

## Task 6: Network fetchers + driver ingest

**Files:**
- Create: `app/server/utils/drivers/fetchStooq.ts`
- Create: `app/server/utils/drivers/fetchArgentina.ts`
- Create: `app/server/utils/drivers/ingest.ts`

**Interfaces:**
- Consumes: `parseStooqCsv`, `parseArgentinaDatos`, `DRIVERS`/`DriverDef` (config), `connectDb` (`app/server/utils/db.ts`), `DriverSnapshotModel`.
- Produces:
  - `fetchStooqSeries(symbol: string, fromYmd?: string): Promise<SeriesPoint[]>`
  - `fetchArgentinaSeries(path: string): Promise<SeriesPoint[]>`
  - `ingestDrivers(currencies?: string[]): Promise<{ dates: number; drivers: number }>`

This task is network+DB glue; it follows the repo convention that only pure logic is unit-tested (Tasks 1–5). Verification is a real fetch run against live endpoints.

- [ ] **Step 1: Write `fetchStooq.ts`**

Create `app/server/utils/drivers/fetchStooq.ts`:

```ts
import type { SeriesPoint } from '../../../utils/rateStats'
import { parseStooqCsv } from '../../../utils/drivers/stooqCsv'

/**
 * Fetch a stooq daily close series. `fromYmd` = 'YYYY-MM-DD' lower bound.
 * Returns [] on any failure so one bad source never breaks the batch.
 */
export async function fetchStooqSeries(symbol: string, fromYmd?: string): Promise<SeriesPoint[]> {
  const d1 = fromYmd ? fromYmd.replace(/-/g, '') : undefined
  const query = new URLSearchParams({ s: symbol, i: 'd' })
  if (d1) query.set('d1', d1)
  const url = `https://stooq.com/q/d/l/?${query.toString()}`
  try {
    const csv = await $fetch<string>(url, {
      responseType: 'text',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      },
    })
    return typeof csv === 'string' ? parseStooqCsv(csv) : []
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Write `fetchArgentina.ts`**

Create `app/server/utils/drivers/fetchArgentina.ts`:

```ts
import type { SeriesPoint } from '../../../utils/rateStats'
import { parseArgentinaDatos, type ArgRow } from '../../../utils/drivers/argentinaDatos'

/** Fetch full argentinadatos.com dolar history for a path ('blue' | 'oficial'). [] on failure. */
export async function fetchArgentinaSeries(path: string): Promise<SeriesPoint[]> {
  const url = `https://api.argentinadatos.com/v1/cotizaciones/dolares/${path}`
  try {
    const rows = await $fetch<ArgRow[]>(url)
    return parseArgentinaDatos(rows)
  } catch {
    return []
  }
}
```

- [ ] **Step 3: Write `ingest.ts`**

Create `app/server/utils/drivers/ingest.ts`:

```ts
import { connectDb } from '../db'
import { DriverSnapshotModel } from '../../models/DriverSnapshot'
import { DRIVERS, driversFor, type DriverDef } from '../../../utils/drivers/config'
import { fetchStooqSeries } from './fetchStooq'
import { fetchArgentinaSeries } from './fetchArgentina'
import type { SeriesPoint } from '../../../utils/rateStats'

async function fetchDriver(def: DriverDef, fromYmd?: string): Promise<SeriesPoint[]> {
  if (def.source === 'stooq') return fetchStooqSeries(def.symbol, fromYmd)
  return fetchArgentinaSeries(def.symbol)
}

/**
 * Fetch every driver relevant to the given currencies, pivot into per-date maps,
 * and upsert one DriverSnapshot per date (merging driver values). Idempotent.
 */
export async function ingestDrivers(currencies: string[] = ['USD']): Promise<{ dates: number; drivers: number }> {
  await connectDb()

  const defs = currencies.length
    ? Array.from(new Map(currencies.flatMap(c => driversFor(c)).map(d => [d.key, d])).values())
    : DRIVERS

  // date -> { driverKey -> value }
  const byDate = new Map<string, Record<string, number>>()
  for (const def of defs) {
    const series = await fetchDriver(def)
    for (const point of series) {
      const row = byDate.get(point.date) ?? {}
      row[def.key] = point.value
      byDate.set(point.date, row)
    }
  }

  const ops = [...byDate.entries()].map(([date, values]) => ({
    updateOne: {
      filter: { date },
      // $set nested keys so we merge with any values already stored for that day.
      update: { $set: Object.fromEntries(Object.entries(values).map(([k, v]) => [`values.${k}`, v])) },
      upsert: true,
    },
  }))

  if (ops.length) await DriverSnapshotModel.bulkWrite(ops, { ordered: false })
  return { dates: byDate.size, drivers: defs.length }
}
```

- [ ] **Step 4: Verify against live endpoints**

Requires `MONGO_URI` in `app/.env` (already used by other features). Run a throwaway ingest and inspect:

Run:
```bash
cd app && node --env-file=.env -e "import('./server/utils/drivers/ingest.ts').catch(()=>{})" 2>/dev/null || \
  echo "use the dev-server check below"
```
If the direct import fails (TS/ESM), verify instead through the dev server once Task 9's route exists, OR temporarily probe the raw sources:

Run: `curl -s -A 'Mozilla/5.0' 'https://stooq.com/q/d/l/?s=eurusd&i=d' | head -3`
Expected: a CSV with a `Date,Open,High,Low,Close,Volume` header and dated rows (non-empty). If a symbol returns `N/D`-only or an HTML error, adjust that driver's `symbol` in `config.ts` (data fix, not code) and re-run — the pipeline already tolerates an empty series.

Run: `curl -s 'https://api.argentinadatos.com/v1/cotizaciones/dolares/blue' | head -c 200`
Expected: a JSON array of `{casa,compra,venta,fecha}` objects.

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/drivers/fetchStooq.ts app/server/utils/drivers/fetchArgentina.ts app/server/utils/drivers/ingest.ts
git commit -m "feat(analysis): stooq + argentinadatos fetchers and driver ingest"
```

---

## Task 7: Forward news archive

**Files:**
- Create: `app/server/utils/priceNews.ts`

**Interfaces:**
- Consumes: `fetchNews` (`app/server/utils/news.ts`), `montevideoToday` (`app/utils/blog.ts`), `connectDb`, `PriceNewsModel`.
- Produces: `archiveTodayNews(currency?: string): Promise<{ date: string; count: number }>` (default currency `'USD'`).

This is network+DB glue; verified via the daily task / dev server, not a unit test.

- [ ] **Step 1: Write the implementation**

Create `app/server/utils/priceNews.ts`:

```ts
import { connectDb } from './db'
import { fetchNews } from './news'
import { montevideoToday } from '../../utils/blog'
import { PriceNewsModel } from '../models/PriceNews'

/**
 * Snapshot today's Uruguay dollar/economy headlines into PriceNews so past days
 * stay explainable (the RSS feed itself keeps no history). Idempotent per day.
 */
export async function archiveTodayNews(currency = 'USD'): Promise<{ date: string; count: number }> {
  await connectDb()
  const date = montevideoToday()
  const items = await fetchNews(12)
  const headlines = items.map(n => ({
    title: n.title,
    source: n.source,
    link: n.link,
    pubDate: n.pubDate,
  }))
  await PriceNewsModel.updateOne(
    { date, currency },
    { $set: { headlines } },
    { upsert: true }
  )
  return { date, count: headlines.length }
}
```

- [ ] **Step 2: Verify the import paths resolve**

Confirm `montevideoToday` is exported from `app/utils/blog.ts`:

Run: `cd app && node -e "const s=require('fs').readFileSync('utils/blog.ts','utf8'); console.log(/export function montevideoToday|export const montevideoToday/.test(s))"`
Expected: prints `true`. (If `false`, the correct helper name is in `app/utils/blog.ts` — use it and adjust the import.)

- [ ] **Step 3: Commit**

```bash
git add app/server/utils/priceNews.ts
git commit -m "feat(analysis): persist daily news snapshot into PriceNews archive"
```

---

## Task 8: Analysis assembler

**Files:**
- Create: `app/server/utils/analysis.ts`

**Interfaces:**
- Consumes: `toSeries` (`app/utils/dollarSeries.ts`), `rankDrivers`/`detectMoves`/`Correlation`/`Move` (`app/utils/correlation.ts`), `driversFor` (config), `snapshotsToDriverSeries` (pivot), `DriverSnapshotModel`, `PriceNewsModel`, `connectDb`, `montevideoToday`.
- Produces:
  - `interface AnalysisResult { currency: string; asOf: string; base: SeriesPoint[]; correlations: Correlation[]; moves: Move[]; headlines: { title: string; source: string; link: string; pubDate: string }[] }`
  - `buildAnalysis(currency: string): Promise<AnalysisResult>`

- [ ] **Step 1: Write the implementation**

Create `app/server/utils/analysis.ts`:

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

// Phase 1 anchors every currency's canonical series on BCU USD. Phase 3 will map
// EUR/ARS to their own canonical origin/code/type.
// IMPORTANT: BCU emits several `type` rows per date for USD (BILLETE, CABLE,
// PROMED.FONDO). The evolution endpoint only filters by type when one is passed;
// omitting it returns ~3 points per calendar day, which breaks the adjacent-pair
// log-return / move-detection math (it would compare same-day type spreads, not
// consecutive days). Always pin a single type — BILLETE, matching the existing
// app/composables/useDollarTrend.ts convention.
const CANONICAL: Record<string, { origin: string; code: string; type: string }> = {
  USD: { origin: 'bcu', code: 'USD', type: 'BILLETE' },
}

async function fetchCanonicalSeries(currency: string): Promise<SeriesPoint[]> {
  const anchor = CANONICAL[currency] ?? CANONICAL.USD!
  const base = useRuntimeConfig().apiBaseServer
  const res = await $fetch<{ evolution?: { date?: string; buy?: number; sell?: number }[] }>(
    `/evolution/${anchor.origin}/${anchor.code}/${anchor.type}`,
    { baseURL: base, query: { period: 60 } }
  )
  // The backend returns `date` as an ISO datetime (e.g. "2026-06-01T00:00:00.000Z"),
  // but driver-snapshot and news dates are plain `YYYY-MM-DD`. alignByDate() does an
  // exact string join, so we MUST normalize the base series to `YYYY-MM-DD` here or
  // every driver correlation silently comes back r=0/n=0 (no dates ever match).
  return toSeries(res?.evolution, 'sell').map(p => ({ date: p.date.slice(0, 10), value: p.value }))
}

/** Assemble driver correlations + notable moves + today's archived news for a currency. */
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

Note: `.lean()` returns the `values` Map as a plain object, so the cast to `Record<string, number>` is safe.

- [ ] **Step 2: Typecheck the new server files**

Run: `cd app && npx nuxt typecheck 2>&1 | grep -E "analysis|drivers|priceNews|correlation" || echo "no type errors in new files"`
Expected: `no type errors in new files` (or a clean run). Fix any reported error before committing.

- [ ] **Step 3: Commit**

```bash
git add app/server/utils/analysis.ts
git commit -m "feat(analysis): assemble correlations + moves + news per currency"
```

---

## Task 9: API routes

**Files:**
- Create: `app/server/api/drivers.get.ts`
- Create: `app/server/api/analysis/[currency].get.ts`

**Interfaces:**
- Consumes: `ingestDrivers` is NOT called here (that's the task); routes read only. `buildAnalysis`, `DriverSnapshotModel`, `driversFor`, `snapshotsToDriverSeries`, `connectDb`.
- Produces: HTTP `GET /api/drivers` and `GET /api/analysis/:currency`.

- [ ] **Step 1: Write `drivers.get.ts`**

Create `app/server/api/drivers.get.ts`:

```ts
// Aligned macro-driver series (read-only). Cached; the daily task does the writes.
import { connectDb } from '../utils/db'
import { DriverSnapshotModel } from '../models/DriverSnapshot'
import { DRIVERS } from '../../utils/drivers/config'
import { snapshotsToDriverSeries, type DateValueMap } from '../../utils/drivers/pivot'

export default defineCachedEventHandler(
  async () => {
    await connectDb()
    const docs = await DriverSnapshotModel.find({}).lean()
    const snapshots: DateValueMap[] = docs.map(d => ({
      date: d.date,
      values: (d.values as unknown as Record<string, number>) ?? {},
    }))
    const series = snapshotsToDriverSeries(snapshots, DRIVERS)
    return {
      drivers: DRIVERS.map(d => ({ key: d.key, label: d.label, source: d.source })),
      series,
    }
  },
  { maxAge: 60 * 30, staleMaxAge: 60 * 60 * 6, name: 'drivers', getKey: () => 'all' }
)
```

- [ ] **Step 2: Write `analysis/[currency].get.ts`**

Create `app/server/api/analysis/[currency].get.ts`:

```ts
// Correlation + notable moves + today's news for a currency (default USD).
import { buildAnalysis } from '../../utils/analysis'

const SUPPORTED = new Set(['USD']) // Phase 3 adds EUR, ARS

export default defineCachedEventHandler(
  async event => {
    const raw = getRouterParam(event, 'currency') ?? 'USD'
    const currency = raw.toUpperCase()
    if (!SUPPORTED.has(currency)) {
      throw createError({ statusCode: 404, statusMessage: `Unsupported currency: ${currency}` })
    }
    return buildAnalysis(currency)
  },
  {
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 6,
    name: 'analysis',
    getKey: event => (getRouterParam(event, 'currency') ?? 'USD').toUpperCase(),
  }
)
```

- [ ] **Step 3: Verify the routes end-to-end**

Start the dev server (reuses port 3311 per project config) and hit both routes. First seed data via a one-off ingest by hitting the daily task after Task 10, OR run ingest inline here by temporarily calling it; simplest is to verify after Task 10. For now confirm the routes load without a 500:

Run: `cd app && npm run dev &` then after it boots:
`curl -s http://localhost:3311/api/analysis/USD | head -c 300`
Expected: JSON with `currency:"USD"`, `correlations:[...]`, `moves:[...]`, `headlines:[...]` (arrays may be empty until the first ingest runs — that's fine here).
`curl -s http://localhost:3311/api/analysis/EUR -o /dev/null -w "%{http_code}"`
Expected: `404`.
Stop the dev server afterward.

- [ ] **Step 4: Commit**

```bash
git add app/server/api/drivers.get.ts app/server/api/analysis/[currency].get.ts
git commit -m "feat(analysis): /api/drivers + /api/analysis/:currency routes"
```

---

## Task 10: Daily task + scheduling

**Files:**
- Create: `app/server/tasks/drivers/daily.ts`
- Modify: `app/nuxt.config.ts` (add `drivers:daily` to `nitro.scheduledTasks`)

**Interfaces:**
- Consumes: `ingestDrivers` (Task 6), `archiveTodayNews` (Task 7).
- Produces: Nitro task `drivers:daily`.

- [ ] **Step 1: Write the task**

Create `app/server/tasks/drivers/daily.ts`:

```ts
// Nitro scheduled task: refresh macro-driver snapshots and archive today's news.
// Registered in nuxt.config under `nitro.scheduledTasks`. Idempotent.
import { ingestDrivers } from '../../utils/drivers/ingest'
import { archiveTodayNews } from '../../utils/priceNews'

export default defineTask({
  meta: {
    name: 'drivers:daily',
    description: 'Ingest macro drivers (stooq + argentinadatos) and archive daily news',
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

- [ ] **Step 2: Register the schedule**

In `app/nuxt.config.ts`, find `nitro.scheduledTasks` (where `blog:daily` is registered, cron `30 9 * * *`) and add a `drivers:daily` entry. Locate the existing block:

Run: `cd app && grep -n "scheduledTasks" nuxt.config.ts`

Then add an entry so drivers refresh shortly before the blog runs. Example of the edited block (match the existing object's key syntax — cron string → task name array):

```ts
      scheduledTasks: {
        '15 9 * * *': ['drivers:daily'],
        '30 9 * * *': ['blog:daily'],
        // ...keep any other existing entries unchanged...
      },
```

If a cron key already exists, append `'drivers:daily'` to its array rather than duplicating the key.

- [ ] **Step 3: Run the task and verify it seeds data**

Run: `cd app && npm run dev &` then after boot trigger the task via Nitro's dev task runner:
`curl -s -X POST http://localhost:3311/_nitro/tasks/drivers:daily | head -c 300`
Expected: JSON `{ "result": { "drivers": { "dates": <n>, "drivers": <n> }, "news": { "date": "YYYY-MM-DD", "count": <n> } } }` with `dates > 0`.

(If the `_nitro/tasks` dev endpoint is disabled, instead confirm via the analysis route now returning populated data:)
`curl -s http://localhost:3311/api/analysis/USD` — `correlations` should now contain non-zero `r` values with `n > 0`, and `moves` should list detected days.
Stop the dev server afterward.

- [ ] **Step 4: Run the full unit suite**

Run: `cd app && npm run test:unit`
Expected: PASS — all new specs (`correlation`, `stooqCsv`, `argentinaDatos`, `drivers-config`, `driver-models`) plus the existing suite are green.

- [ ] **Step 5: Commit**

```bash
git add app/server/tasks/drivers/daily.ts app/nuxt.config.ts
git commit -m "feat(analysis): drivers:daily scheduled task (ingest + news archive)"
```

---

## Self-Review

**Spec coverage (Phase 1 scope from the design doc):**
- Ingesta drivers→Mongo → Tasks 5, 6. ✓
- Task diario → Task 10. ✓
- Util de correlación (log-returns, Pearson, alineación, move-detection), unit-tested → Task 1. ✓
- `/api/drivers` + `/api/analysis/:currency` → Task 9. ✓
- Archivo `PriceNews` forward → Tasks 5, 7. ✓
- Fuentes sin key (stooq + argentinadatos + BCU anchor) → Tasks 2, 3, 6, 8. ✓
- Driver-set configurable por moneda → Task 4. ✓
- Canonical series = BCU USD via `/evolution/bcu/USD` → Task 8. ✓
- Success criterion (`GET /api/analysis/USD` returns ranked drivers on returns, moves, and archives today's news) → Tasks 8, 9, 10. ✓
- Out of Phase-1 scope (deferred, correctly absent): `MoveExplanation` model, AI narrative, backfill, dedicated page, inline annotations, EUR/ARS activation.

**Placeholder scan:** No TBD/TODO. Network/DB tasks (6, 7) have concrete code + real verification commands instead of unit tests, consistent with the repo convention that only pure logic is unit-tested. stooq symbols are concrete with a documented data-level adjustment step (not a code placeholder).

**Type consistency:** `SeriesPoint` reused everywhere from `rateStats`. `Correlation`/`Move` defined in Task 1, consumed unchanged in Task 8. `DateValueMap` defined in Task 4 (pivot), consumed in Tasks 8, 9. `DriverDef`/`driversFor` defined Task 4, consumed Tasks 6, 8. Model doc interfaces (`DriverSnapshotDoc.values: Map`, read back as `Record` via `.lean()`) consistently handled in Tasks 8, 9. `ingestDrivers` return `{ dates, drivers }` matches the Task 10 verification assertion.

**Known data-level risk carried into execution:** exact stooq symbols (`dx.f`, `10usy.b`, `zs.f`, `usdbrl`) must be confirmed to return non-empty CSV on the first ingest (Task 6 Step 4); a wrong symbol yields an empty series the pipeline tolerates and is fixed in `config.ts` without code changes.
