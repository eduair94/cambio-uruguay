# Phase 3 — Inline Chart Markers + EUR/ARS Anchors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the correlation analysis backend to EUR and ARS, and surface it as move markers + an attribution tooltip line directly on the existing `historico/[origin]/[currency]/[[type]].vue` chart (any casa), without building new dedicated pages.

**Architecture:** A new pure util (`chartMoveMarkers.ts`, unit-tested) computes per-index chart.js marker styling from a move list. The historico page fetches `/api/analysis/:currency` + `/api/drivers` via `useLazyAsyncData` (matching the page's own existing async-data idiom), gated so unsupported currencies never fetch and the chart renders exactly as it does today. Backend gains two `CANONICAL` entries (EUR→BROU, ARS→BCU) and a widened `SUPPORTED` set, plus a URL-building fix for EUR's empty `type`.

**Tech Stack:** Nuxt 4 + Nitro, chart.js 4 / vue-chartjs (existing), vitest, Playwright.

## Global Constraints

- All work under `app/`; run tests from `app/`. Unit: `npm run test:unit`. E2E: `npm run test:e2e`.
- Pure logic → `app/utils/**`, relative imports only, NO Nuxt auto-imports, unit-tested with vitest.
- `CANONICAL.EUR = { origin: 'brou', code: 'EUR', type: '' }` (verified live: 1252 points, 2021-07-08→2026-07-08, no visible gaps). `CANONICAL.ARS = { origin: 'bcu', code: 'ARS', type: 'BILLETE' }` (mirrors USD exactly).
- `fetchCanonicalSeries` must omit the `/type` URL segment when `anchor.type === ''` — currently always appends it, which would produce `/evolution/brou/EUR/` (trailing slash) for EUR.
- `SUPPORTED` in `app/server/api/analysis/[currency].get.ts` becomes `new Set(['USD', 'EUR', 'ARS'])`.
- The historico page's analysis/drivers fetch is **additive and fail-silent**: any unsupported currency, or any fetch failure, must leave the chart rendering byte-for-byte as it does today (no markers, no extra tooltip line, no console errors, no thrown exceptions).
- Reuse existing, already-tested utils: `attributeMove` from `app/utils/attribution.ts` (Phase 2). Do not reimplement it.
- Day-key date matching: chart dates are ISO datetimes (`"...T00:00:00.000Z"`); analysis `moves[].date` are plain `YYYY-MM-DD`. Always compare via `.slice(0, 10)`.
- i18n in this specific page file uses **flat top-level keys** (e.g. `t('precioCompra')`, `$t('datosDetallados')`) — NOT the nested `porQueDolar.*` convention from Phase 2. New copy here must follow the page's own flat-key convention.
- TypeScript strict `noUncheckedIndexedAccess` — guard array indexing. Commit after each task.

---

## File Structure

**Pure util (unit-tested):**
- `app/utils/chartMoveMarkers.ts` — `markPoints(dates, moves, defaultColor, defaultRadius?, highlightRadius?)`.

**Backend (network glue, no unit test per repo convention — verified via live dev-server checks):**
- Modify `app/server/utils/analysis.ts` — `CANONICAL` map + URL fix.
- Modify `app/server/api/analysis/[currency].get.ts` — `SUPPORTED` set.

**Frontend:**
- Modify `app/pages/historico/[origin]/[currency]/[[type]].vue` — conditional fetch, `chartData` marker wiring, tooltip attribution line.
- Modify `app/i18n/locales/json/{es,en,pt}.json` — one new flat key `historicoMoveAttribution`.
- Create `app/tests/e2e/historico-analysis-markers.spec.ts`.

---

## Task 1: chartMoveMarkers pure util (TDD)

**Files:**
- Create: `app/utils/chartMoveMarkers.ts`
- Test: `app/tests/unit/chartMoveMarkers.test.ts`

**Interfaces:**
- Produces:
  - `interface MarkerStyle { pointRadius: number[]; pointBackgroundColor: string[] }`
  - `markPoints(dates: string[], moves: { date: string; direction: 'up' | 'down' | 'flat' }[], defaultColor: string, defaultRadius?: number, highlightRadius?: number): MarkerStyle`
  - Matching is by calendar day: both `dates[i]` (may be a full ISO datetime) and `moves[j].date` (plain `YYYY-MM-DD`) are compared via `.slice(0, 10)`.
  - Highlight color: `direction === 'up'` → `'#16c784'`; `direction === 'down'` → `'#ea3943'`; `direction === 'flat'` (never emitted today by `detectMoves`, but handled defensively) → `defaultColor`.
  - Defaults: `defaultRadius = 3`, `highlightRadius = 6` (matches the historico page's current literal `pointRadius: 3`).

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/chartMoveMarkers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { markPoints } from '../../utils/chartMoveMarkers'

describe('markPoints', () => {
  it('highlights a date that matches a move, keeping others at default', () => {
    const dates = [
      '2026-06-01T00:00:00.000Z',
      '2026-06-02T00:00:00.000Z',
      '2026-06-03T00:00:00.000Z',
    ]
    const moves = [{ date: '2026-06-02', direction: 'up' as const }]
    const out = markPoints(dates, moves, 'rgb(75, 192, 192)')
    expect(out.pointRadius).toEqual([3, 6, 3])
    expect(out.pointBackgroundColor).toEqual(['rgb(75, 192, 192)', '#16c784', 'rgb(75, 192, 192)'])
  })

  it('colors a down move red', () => {
    const out = markPoints(
      ['2026-06-02T00:00:00.000Z'],
      [{ date: '2026-06-02', direction: 'down' }],
      'rgb(255, 99, 132)'
    )
    expect(out.pointBackgroundColor).toEqual(['#ea3943'])
  })

  it('a flat move highlights radius but keeps the default color', () => {
    const out = markPoints(
      ['2026-06-02T00:00:00.000Z'],
      [{ date: '2026-06-02', direction: 'flat' }],
      'rgb(75, 192, 192)'
    )
    expect(out.pointRadius).toEqual([6])
    expect(out.pointBackgroundColor).toEqual(['rgb(75, 192, 192)'])
  })

  it('matches by calendar day regardless of the chart date carrying a full ISO timestamp', () => {
    const out = markPoints(['2026-06-02T03:00:00.000Z'], [{ date: '2026-06-02', direction: 'up' }], '#000')
    expect(out.pointRadius).toEqual([6])
  })

  it('returns all defaults when there are no moves, or dates is empty', () => {
    expect(markPoints(['2026-06-01T00:00:00.000Z'], [], '#abc')).toEqual({
      pointRadius: [3],
      pointBackgroundColor: ['#abc'],
    })
    expect(markPoints([], [{ date: '2026-06-01', direction: 'up' }], '#abc')).toEqual({
      pointRadius: [],
      pointBackgroundColor: [],
    })
  })

  it('respects custom default/highlight radius', () => {
    const out = markPoints(
      ['2026-06-01T00:00:00.000Z'],
      [{ date: '2026-06-01', direction: 'up' }],
      '#abc',
      2,
      9
    )
    expect(out.pointRadius).toEqual([9])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- chartMoveMarkers`
Expected: FAIL — cannot resolve `../../utils/chartMoveMarkers`.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/chartMoveMarkers.ts`:

```ts
export interface MarkerStyle {
  pointRadius: number[]
  pointBackgroundColor: string[]
}

const UP_COLOR = '#16c784'
const DOWN_COLOR = '#ea3943'

const dayKey = (d: string) => d.slice(0, 10)

/**
 * Per-index chart.js point styling: highlights the dates that match a notable
 * move (colored by direction), leaving every other point at the dataset's
 * existing default radius/color. Matches by calendar day so a full ISO
 * datetime chart date still lines up with a plain YYYY-MM-DD move date.
 */
export function markPoints(
  dates: string[],
  moves: { date: string; direction: 'up' | 'down' | 'flat' }[],
  defaultColor: string,
  defaultRadius = 3,
  highlightRadius = 6
): MarkerStyle {
  const moveByDay = new Map(moves.map(m => [dayKey(m.date), m.direction]))
  const pointRadius: number[] = []
  const pointBackgroundColor: string[] = []
  for (const date of dates) {
    const direction = moveByDay.get(dayKey(date))
    if (direction === undefined) {
      pointRadius.push(defaultRadius)
      pointBackgroundColor.push(defaultColor)
      continue
    }
    pointRadius.push(highlightRadius)
    pointBackgroundColor.push(direction === 'up' ? UP_COLOR : direction === 'down' ? DOWN_COLOR : defaultColor)
  }
  return { pointRadius, pointBackgroundColor }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- chartMoveMarkers`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add app/utils/chartMoveMarkers.ts app/tests/unit/chartMoveMarkers.test.ts
git commit -m "feat(analysis): chart move-marker styling util (pure)"
```

---

## Task 2: Backend — EUR/ARS canonical anchors

**Files:**
- Modify: `app/server/utils/analysis.ts`
- Modify: `app/server/api/analysis/[currency].get.ts`

**Interfaces:**
- No new exports; `CANONICAL` gains `EUR`/`ARS` keys, `fetchCanonicalSeries` gains the empty-type URL fix, `SUPPORTED` widens.

- [ ] **Step 1: Edit `CANONICAL` and the URL builder in `app/server/utils/analysis.ts`**

Current (lines 20-40):
```ts
// Phase 1 anchors every currency's canonical series on BCU USD. Phase 3 will map
// EUR/ARS to their own canonical origin/code.
// IMPORTANT: BCU emits several `type` rows per date for USD (BILLETE/CABLE/PROMED.FONDO).
// Pin a single type or the adjacent-pair log-return math compares same-day spreads.
// Matches app/composables/useDollarTrend.ts.
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
  // Backend returns `date` as an ISO datetime ("...T00:00:00.000Z"); driver-snapshot and
  // news dates are plain YYYY-MM-DD. alignByDate() is an exact string join, so normalize
  // here or every driver correlation silently comes back r=0/n=0.
  return toSeries(res?.evolution, 'sell').map(p => ({ date: p.date.slice(0, 10), value: p.value }))
}
```

Replace with:
```ts
// Phase 3: canonical anchors for USD, EUR, ARS. EUR has no BCU quote (verified —
// BCU's currency set is USD/ARS/BRL/UI/UP/UR only), so it anchors on BROU, whose
// EUR feed uses an empty `type` (single series, no BILLETE/CABLE-style ambiguity).
// ARS mirrors USD exactly (BCU, BILLETE, same backfill/gap-detection tooling).
// IMPORTANT: BCU emits several `type` rows per date for USD/ARS (BILLETE/CABLE/PROMED.FONDO).
// Pin a single type or the adjacent-pair log-return math compares same-day spreads.
// Matches app/composables/useDollarTrend.ts.
const CANONICAL: Record<string, { origin: string; code: string; type: string }> = {
  USD: { origin: 'bcu', code: 'USD', type: 'BILLETE' },
  EUR: { origin: 'brou', code: 'EUR', type: '' },
  ARS: { origin: 'bcu', code: 'ARS', type: 'BILLETE' },
}

async function fetchCanonicalSeries(currency: string): Promise<SeriesPoint[]> {
  const anchor = CANONICAL[currency] ?? CANONICAL.USD!
  const base = useRuntimeConfig().apiBaseServer
  // Omit the /type segment entirely when empty (EUR) — an untyped trailing
  // segment would 404/produce a malformed URL, unlike a simply-absent one.
  const path = anchor.type
    ? `/evolution/${anchor.origin}/${anchor.code}/${anchor.type}`
    : `/evolution/${anchor.origin}/${anchor.code}`
  const res = await $fetch<{ evolution?: { date?: string; buy?: number; sell?: number }[] }>(path, {
    baseURL: base,
    query: { period: 60 },
  })
  // Backend returns `date` as an ISO datetime ("...T00:00:00.000Z"); driver-snapshot and
  // news dates are plain YYYY-MM-DD. alignByDate() is an exact string join, so normalize
  // here or every driver correlation silently comes back r=0/n=0.
  return toSeries(res?.evolution, 'sell').map(p => ({ date: p.date.slice(0, 10), value: p.value }))
}
```

- [ ] **Step 2: Edit `SUPPORTED` in `app/server/api/analysis/[currency].get.ts`**

Current:
```ts
const SUPPORTED = new Set(['USD']) // Phase 3 adds EUR, ARS
```

Replace with:
```ts
const SUPPORTED = new Set(['USD', 'EUR', 'ARS'])
```

- [ ] **Step 3: Live-verify against a real dev server**

This is network/DB glue (no unit test, per repo convention) — verify with a real run. Boot the dev server and hit all four cases:

Run: `cd app && npm run dev` (capture the actual port; may auto-pick if 3311 is busy). Wait for it to be ready (poll `/` until 200), then:

```bash
curl -s http://localhost:<port>/api/analysis/USD | head -c 200   # unchanged, still 200 + real data
curl -s http://localhost:<port>/api/analysis/EUR | head -c 200   # NEW: expect 200, base/moves populated (not empty)
curl -s http://localhost:<port>/api/analysis/ARS | head -c 200   # NEW: expect 200, base/moves populated
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:<port>/api/analysis/BRL   # expect 404 (still unsupported)
```

Expected: USD/EUR/ARS all return `{"currency":"EUR","asOf":...,"base":[...],"correlations":[...],"moves":[...],"headlines":[...]}` with a non-empty `base` array (EUR/ARS have real BROU/BCU data). BRL still 404s. If EUR or ARS come back with an empty `base`, the anchor is wrong — stop and report rather than guessing a fix. Kill the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add app/server/utils/analysis.ts app/server/api/analysis/\[currency\].get.ts
git commit -m "feat(analysis): EUR (BROU) + ARS (BCU) canonical anchors"
```

---

## Task 3: Historico page — inline markers, attribution tooltip, e2e

**Files:**
- Modify: `app/pages/historico/[origin]/[currency]/[[type]].vue`
- Modify: `app/i18n/locales/json/es.json`, `app/i18n/locales/json/en.json`, `app/i18n/locales/json/pt.json`
- Create: `app/tests/e2e/historico-analysis-markers.spec.ts`

**Interfaces:**
- Consumes: `markPoints` (Task 1), `attributeMove` from `app/utils/attribution.ts` (already exists, Phase 2), `/api/analysis/:currency` + `/api/drivers` (Task 2).

- [ ] **Step 1: Add the flat i18n key to all three locales**

This page uses flat top-level keys (`t('precioCompra')`, `$t('datosDetallados')`), NOT the nested `porQueDolar.*` object. Add one new flat key to each of `app/i18n/locales/json/es.json`, `en.json`, `pt.json` (find where sibling flat keys like `"datosDetallados"` or `"precioCompra"` live and add alongside them — additive only, do not reorder or remove existing keys):

- `es.json`: `"historicoMoveAttribution": "Ese día se movieron"`
- `en.json`: `"historicoMoveAttribution": "That day, these moved"`
- `pt.json`: `"historicoMoveAttribution": "Naquele dia, se moveram"`

Verify: `cd app && node -e "for (const l of ['es','en','pt']) { const j=require('./i18n/locales/json/'+l+'.json'); if(!j.historicoMoveAttribution) throw new Error(l+' missing'); console.log(l,'ok'); }"` → expect `es ok`, `en ok`, `pt ok`.

- [ ] **Step 2: Add imports + conditional fetch to the page's `<script setup>`**

In `app/pages/historico/[origin]/[currency]/[[type]].vue`, add to the imports block (near the existing `import moment from 'moment'` / `import { computed, ref } from 'vue'` lines ~381-382):

```ts
import { markPoints } from '~/utils/chartMoveMarkers'
import { attributeMove } from '~/utils/attribution'
```

After the existing `selectedPeriod` ref declaration (around line 488, right after `const selectedPeriod = ref(6)`), add:

```ts
// Phase 3: inline move markers + attribution, gated to currencies the
// analysis backend actually supports. Any other currency (or a failed
// fetch) leaves the chart exactly as it was before this feature — no
// markers, no extra tooltip line, no thrown errors.
const ANALYSIS_SUPPORTED = new Set(['USD', 'EUR', 'ARS'])
const currencyUpper = computed(() => String(route.params.currency ?? '').toUpperCase())
const analysisSupported = computed(() => ANALYSIS_SUPPORTED.has(currencyUpper.value))

interface AnalysisMove {
  date: string
  pctChange: number
  direction: 'up' | 'down' | 'flat'
}
interface AnalysisResponse {
  moves: AnalysisMove[]
}
interface DriversResponse {
  drivers: { key: string; label: string; source: string }[]
  series: { key: string; points: { date: string; value: number }[] }[]
}

const { data: analysisData } = useLazyAsyncData<AnalysisResponse | null>(
  `historico-analysis-${currencyUpper.value}`,
  async () => {
    if (!analysisSupported.value) return null
    return await $fetch<AnalysisResponse>(`/api/analysis/${currencyUpper.value}`).catch(() => null)
  }
)

const { data: driversData } = useLazyAsyncData<DriversResponse | null>(
  `historico-drivers-${currencyUpper.value}`,
  async () => {
    if (!analysisSupported.value) return null
    return await $fetch<DriversResponse>('/api/drivers').catch(() => null)
  }
)

const moves = computed<AnalysisMove[]>(() => analysisData.value?.moves ?? [])
const driverLabels = computed<Record<string, string>>(() =>
  Object.fromEntries((driversData.value?.drivers ?? []).map(d => [d.key, d.label]))
)
const driverSeriesArr = computed(() => driversData.value?.series ?? [])
```

- [ ] **Step 3: Wire markers into `chartData`**

The existing `chartData` computed (around line 627) currently has literal `pointRadius: 3` on both datasets. Change it to:

```ts
const chartData = computed(() => {
  if (!(evolutionData.value as any)?.evolution) return { labels: [], datasets: [] }

  const evolution = (evolutionData.value as any).evolution
  const labels = evolution.map((item: EvolutionItem) => moment(item.date).format('MM/YYYY'))
  const dates = evolution.map((item: EvolutionItem) => item.date)
  const buyMarks = markPoints(dates, moves.value, 'rgb(75, 192, 192)')
  const sellMarks = markPoints(dates, moves.value, 'rgb(255, 99, 132)')

  return {
    labels,
    datasets: [
      {
        label: t('precioCompra'),
        data: evolution.map((item: EvolutionItem) => item.buy),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: false,
        pointRadius: buyMarks.pointRadius,
        pointBackgroundColor: buyMarks.pointBackgroundColor,
        pointHoverRadius: 5,
      },
      {
        label: t('precioVenta'),
        data: evolution.map((item: EvolutionItem) => item.sell),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        fill: false,
        pointRadius: sellMarks.pointRadius,
        pointBackgroundColor: sellMarks.pointBackgroundColor,
        pointHoverRadius: 5,
      },
    ],
  }
})
```

When `moves.value` is `[]` (unsupported currency, or fetch failed/pending), `markPoints` returns all-default arrays identical in value to the current literal `3` — the chart renders pixel-identical to today.

- [ ] **Step 4: Add the attribution line to the tooltip**

In `chartOptions`'s `plugins.tooltip.callbacks` block (around line 703-722), add an `afterBody` callback alongside the existing `title`/`label`:

```ts
      callbacks: {
        title: (context: any) => {
          // Include year in the tooltip title
          const dataIndex = context[0].dataIndex
          const evolution = (evolutionData.value as any).evolution
          const date = evolution[dataIndex].date
          return moment(date).format('DD/MM/YYYY')
        },
        label: (context: any) => {
          // Use inline formatting to avoid referencing this
          const value = context.parsed.y
          if (typeof value !== 'number') return `${context.dataset.label}: -`
          return `${context.dataset.label}: ${value.toLocaleString('es-UY', {
            style: 'currency',
            currency: 'UYU',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        },
        afterBody: (context: any) => {
          const dataIndex = context[0]?.dataIndex
          if (dataIndex === undefined) return []
          const evolution = (evolutionData.value as any)?.evolution ?? []
          const date = evolution[dataIndex]?.date
          if (!date) return []
          const dayDate = String(date).slice(0, 10)
          const isMoveDay = moves.value.some(m => m.date === dayDate)
          if (!isMoveDay) return []
          const top = attributeMove(dayDate, driverSeriesArr.value).slice(0, 3)
          if (!top.length) return []
          return [
            '',
            `${t('historicoMoveAttribution')}:`,
            ...top.map(d => `${driverLabels.value[d.key] ?? d.key} ${d.dayMovePct >= 0 ? '+' : ''}${d.dayMovePct.toFixed(1)}%`),
          ]
        },
      },
```

- [ ] **Step 5: Write the e2e spec**

Create `app/tests/e2e/historico-analysis-markers.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('historico inline analysis markers (Phase 3)', () => {
  test.setTimeout(120_000)

  test('USD page still renders with no console errors (regression check)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto('/historico/brou/USD')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('EUR page (newly supported) renders with no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto('/historico/brou/EUR')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('ARS page (newly supported) renders with no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto('/historico/brou/ARS')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('unsupported currency (BRL) renders unchanged with no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto('/historico/brou/BRL')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })
})
```

- [ ] **Step 6: Verify — lint, unit suite, live dev-server check, e2e**

Run: `cd app && npx eslint pages/historico/\[origin\]/\[currency\]/\[\[type\]\].vue tests/e2e/historico-analysis-markers.spec.ts` → clean.
Run: `cd app && npm run test:unit` → all green (includes Task 1's new spec).
Boot the dev server (`cd app && npm run dev`, poll until ready) and manually confirm via curl or the browser:
- `/historico/brou/USD` still 200, chart renders.
- `/historico/brou/EUR` and `/historico/brou/ARS` now show enlarged/colored points on notable-move days (compare against the `moves` array returned by `/api/analysis/EUR` / `/api/analysis/ARS` from Task 2).
- `/historico/brou/BRL` renders identically to before this change (no markers — expected, BRL isn't in `ANALYSIS_SUPPORTED`).
Then run: `cd app && npm run test:e2e -- historico-analysis-markers` → 4 passed. If the sandbox's dev server is unreliable under load (seen previously — a concurrent-load 500 on ALL routes, unrelated to this change), note it and rely on the manual curl/browser check instead; do not block on a flaky sandbox failure that reproduces on an untouched route too.
Kill the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add app/pages/historico/\[origin\]/\[currency\]/\[\[type\]\].vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json app/tests/e2e/historico-analysis-markers.spec.ts
git commit -m "feat(analysis): inline move markers + attribution tooltip on historico chart"
```

---

## Self-Review

**Spec coverage:**
- CANONICAL EUR (BROU) + ARS (BCU) anchors → Task 2. ✓
- Trailing-slash fix for empty EUR type → Task 2. ✓
- SUPPORTED set widened → Task 2. ✓
- driversFor EUR/ARS already declared (Phase 1) — no task needed, confirmed unchanged. ✓
- Pure, unit-tested marker util → Task 1. ✓
- Markers on any casa's historico chart (not just canonical origin) → Task 3 (fetch keyed only by currency, independent of `route.params.origin`). ✓
- Fail-silent for unsupported currencies / fetch failures → Task 3 (`analysisSupported` gate + `.catch(() => null)` + `markPoints([], ...)` defaults). ✓
- Attribution tooltip line reusing existing `attributeMove` → Task 3. ✓
- No new dedicated pages → correctly absent from this plan. ✓
- No backfill/AI narrative, no forecast → correctly out of scope (Phase 4/5).

**Placeholder scan:** No TBD/TODO. Task 2's live-verification step is network/DB glue per established repo convention (no unit test), with concrete curl commands and explicit expected output, consistent with how Phase 1/2 handled equivalent tasks.

**Type consistency:** `markPoints`'s `MarkerStyle` (Task 1) consumed directly in Task 3's `chartData`. `AnalysisMove`/`AnalysisResponse`/`DriversResponse` interfaces in Task 3 match the actual `/api/analysis/:currency` and `/api/drivers` response shapes (`Move` = `{date,pctChange,direction}`, drivers `{key,label,source}[]`, series `{key,points}[]`) established in Phase 1/2. `attributeMove`'s signature (`date, driverSeries) => DriverDayMove[]` with `{key, dayMovePct}`) matches its existing Phase 2 definition — not redefined here, only imported.
