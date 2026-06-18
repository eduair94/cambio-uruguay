# Rate Trends & Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four visit-driving rate-insight surfaces (dollar momentum, savings, records, multi-currency panel) on a shared pure computation core, with unit + e2e tests.

**Architecture:** Pure functions in `utils/rateStats.ts` compute momentum/records/savings from a normalized `{date,value}[]` series (`utils/dollarSeries.ts`). A lazy composable fetches the BCU USD evolution series. Vue components render momentum, savings, records, and a multi-currency panel within the existing dark Vuetify theme.

**Tech Stack:** Nuxt 3, Vue 3, Vuetify 3 (curated component registry in `app/plugins/vuetify.ts`), `@nuxtjs/i18n`, Vitest, Playwright.

## Global Constraints

- All work under `app/`. ESM. Components auto-imported; composables/utils auto-imported in components but **import explicitly in unit tests** via relative paths.
- Vuetify uses a curated list in `app/plugins/vuetify.ts` — every component used in a template MUST be registered there (unregistered → SSR hydration mismatch). Register new ones.
- i18n: every user-facing string goes in `app/i18n/locales/json/{es,en,pt}.json` (flat JSON; nested objects accessed as `dolarHoy.title`). Spanish is `defaultLocale`.
- Data types: `EvolutionPoint = { date: string; buy: number; sell: number }` from `~/types/api`; `getEvolutionData(origin, currency, type?, period=6)` returns `{ error, data: { evolution: EvolutionPoint[] } | null }`.
- Currency codes `'USD'|'EUR'|'BRL'|'ARS'` (`CurrencyCode` from `~/utils/currencyPages`). Money formatting via `~/utils/format` (`formatUYU`, `formatNumber`).
- Up/down indicated by icon **and** text, never color alone. Skeletons to avoid CLS. Sparkline `aria-hidden`, static under `prefers-reduced-motion`.
- Unit tests: `npm run test`. E2E: `npm run test:e2e`. Commit after each task.

---

## File Structure

**New:**
- `utils/rateStats.ts` — `computeMomentum`, `computeRecords`, `computeSavings` (pure).
- `utils/dollarSeries.ts` — `toSeries(points, kind)` normalizer.
- `composables/useDollarTrend.ts` — lazy BCU-USD series → `{ momentum, records, pending }`.
- `components/Sparkline.vue` — inline SVG sparkline.
- `components/DollarMomentum.vue` — home momentum module.
- `components/SavingsHighlight.vue` — savings module.
- `components/MultiCurrencyPanel.vue` — 4-currency grid.
- `pages/dolar-hoy.vue` — SEO page.
- `pages/dolar/records.vue` — records page.
- Tests: `tests/unit/rate-stats.test.ts`, `tests/unit/dollar-series.test.ts`, `tests/e2e/dolar-hoy.spec.ts`.

**Modified:**
- `pages/index.vue` (mount `<DollarMomentum/>`), `pages/avanzado.vue` (mount `<MultiCurrencyPanel/>`), `plugins/vuetify.ts` (register components if needed), `i18n/locales/json/{es,en,pt}.json`.

---

## PHASE 1 — Core + Dólar momentum + /dolar-hoy

## Task 1: rateStats pure functions

**Files:**
- Create: `app/utils/rateStats.ts`
- Test: `app/tests/unit/rate-stats.test.ts`

**Interfaces:**
- Produces:
  - `interface SeriesPoint { date: string; value: number }`
  - `computeMomentum(series: SeriesPoint[], sparkN = 7): { latest: number|null; prev: number|null; changePct: number; direction: 'up'|'down'|'flat'; sparkline: number[] }`
  - `computeRecords(series: SeriesPoint[], now?: Date): { max: { value: number; date: string } | null; min: { value: number; date: string } | null; yearAgo: number|null; monthlyAvg: number|null }`
  - `computeSavings(amount: number, best: number, avg: number): { savings: number; pct: number }`

- [ ] **Step 1: Write the failing test**

`app/tests/unit/rate-stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeMomentum, computeRecords, computeSavings } from '../../utils/rateStats'

const S = (vals: number[]) =>
  vals.map((v, i) => ({ date: `2026-06-${String(i + 1).padStart(2, '0')}`, value: v }))

describe('computeMomentum', () => {
  it('reports an up move vs the previous point', () => {
    const r = computeMomentum(S([40, 41]))
    expect(r.latest).toBe(41)
    expect(r.prev).toBe(40)
    expect(r.direction).toBe('up')
    expect(r.changePct).toBeCloseTo(2.5, 5)
  })
  it('reports a down move', () => {
    expect(computeMomentum(S([41, 40])).direction).toBe('down')
  })
  it('flat when equal or single/empty', () => {
    expect(computeMomentum(S([40, 40])).direction).toBe('flat')
    expect(computeMomentum(S([40])).direction).toBe('flat')
    expect(computeMomentum([]).direction).toBe('flat')
    expect(computeMomentum([]).latest).toBeNull()
  })
  it('sparkline keeps the last N values', () => {
    expect(computeMomentum(S([1, 2, 3, 4, 5, 6, 7, 8]), 7).sparkline).toEqual([2, 3, 4, 5, 6, 7, 8])
  })
})

describe('computeRecords', () => {
  it('finds max/min and monthly average', () => {
    const r = computeRecords(S([40, 42, 38, 41]))
    expect(r.max).toEqual({ value: 42, date: '2026-06-02' })
    expect(r.min).toEqual({ value: 38, date: '2026-06-03' })
    expect(r.monthlyAvg).toBeCloseTo(40.25, 5)
  })
  it('returns nulls for an empty series', () => {
    const r = computeRecords([])
    expect(r.max).toBeNull()
    expect(r.min).toBeNull()
    expect(r.yearAgo).toBeNull()
  })
  it('finds the value ~1 year ago when present', () => {
    const series = [
      { date: '2025-06-18', value: 39.9 },
      { date: '2026-06-18', value: 41.3 },
    ]
    expect(computeRecords(series, new Date('2026-06-18')).yearAgo).toBe(39.9)
  })
})

describe('computeSavings', () => {
  it('savings = (avg - best) * (amount / best), never negative', () => {
    // buying USD 1000 worth: best sell 41.0, avg 41.3
    const r = computeSavings(1000, 41.0, 41.3)
    expect(r.savings).toBeGreaterThan(0)
    expect(r.pct).toBeCloseTo(((41.3 - 41.0) / 41.3) * 100, 4)
  })
  it('zero when best >= avg or inputs invalid', () => {
    expect(computeSavings(1000, 42, 41).savings).toBe(0)
    expect(computeSavings(0, 41, 42).savings).toBe(0)
    expect(computeSavings(1000, 0, 0).savings).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/rate-stats.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`app/utils/rateStats.ts`:

```ts
import { round } from './calculators'

export interface SeriesPoint {
  date: string
  value: number
}

export interface Momentum {
  latest: number | null
  prev: number | null
  changePct: number
  direction: 'up' | 'down' | 'flat'
  sparkline: number[]
}

/** Latest vs previous point, plus a trailing sparkline of the last `sparkN`. */
export function computeMomentum(series: SeriesPoint[], sparkN = 7): Momentum {
  const vals = series.map(p => p.value).filter(v => Number.isFinite(v))
  if (vals.length === 0) {
    return { latest: null, prev: null, changePct: 0, direction: 'flat', sparkline: [] }
  }
  const latest = vals[vals.length - 1]!
  const prev = vals.length > 1 ? vals[vals.length - 2]! : null
  let changePct = 0
  let direction: Momentum['direction'] = 'flat'
  if (prev !== null && prev !== 0) {
    changePct = round(((latest - prev) / prev) * 100, 2)
    direction = latest > prev ? 'up' : latest < prev ? 'down' : 'flat'
  }
  return { latest, prev, changePct, direction, sparkline: vals.slice(-sparkN) }
}

export interface Records {
  max: { value: number; date: string } | null
  min: { value: number; date: string } | null
  yearAgo: number | null
  monthlyAvg: number | null
}

/** Max/min over the series, mean, and the value closest to one year before `now`. */
export function computeRecords(series: SeriesPoint[], now: Date = new Date()): Records {
  const pts = series.filter(p => Number.isFinite(p.value))
  if (pts.length === 0) return { max: null, min: null, yearAgo: null, monthlyAvg: null }

  let max = pts[0]!
  let min = pts[0]!
  let sum = 0
  for (const p of pts) {
    if (p.value > max.value) max = p
    if (p.value < min.value) min = p
    sum += p.value
  }

  const target = new Date(now)
  target.setFullYear(target.getFullYear() - 1)
  const targetMs = target.getTime()
  let yearAgo: number | null = null
  let bestDelta = Infinity
  for (const p of pts) {
    const d = Math.abs(new Date(p.date).getTime() - targetMs)
    // within ~30 days of one year ago
    if (d < bestDelta && d <= 31 * 24 * 3600 * 1000) {
      bestDelta = d
      yearAgo = p.value
    }
  }

  return {
    max: { value: max.value, date: max.date },
    min: { value: min.value, date: min.date },
    yearAgo,
    monthlyAvg: round(sum / pts.length, 2),
  }
}

/** Pesos saved buying `amount` (USD-equivalent) at `best` vs `avg` sell price. */
export function computeSavings(
  amount: number,
  best: number,
  avg: number
): { savings: number; pct: number } {
  if (!(amount > 0) || !(best > 0) || !(avg > 0) || avg <= best) return { savings: 0, pct: 0 }
  const units = amount / best // units of foreign currency the amount buys at best
  const savings = round(units * (avg - best))
  const pct = round(((avg - best) / avg) * 100, 2)
  return { savings, pct }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/rate-stats.test.ts`
Expected: PASS (10).

- [ ] **Step 5: Commit**

```bash
git add app/utils/rateStats.ts app/tests/unit/rate-stats.test.ts
git commit -m "feat(trends): rateStats pure core (momentum, records, savings)"
```

---

## Task 2: dollarSeries normalizer

**Files:**
- Create: `app/utils/dollarSeries.ts`
- Test: `app/tests/unit/dollar-series.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint` from `./rateStats`; `EvolutionPoint` shape `{date,buy,sell}`.
- Produces: `toSeries(points: Array<Partial<EvolutionPoint>> | undefined, kind?: 'sell'|'buy'|'mid'): SeriesPoint[]` — maps to `{date,value}`, skipping points lacking a usable number; sorted ascending by date.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/dollar-series.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toSeries } from '../../utils/dollarSeries'

describe('toSeries', () => {
  it('maps evolution points to {date,value} using sell by default', () => {
    const out = toSeries([
      { date: '2026-06-01', buy: 39, sell: 41 },
      { date: '2026-06-02', buy: 39.4, sell: 41.2 },
    ])
    expect(out).toEqual([
      { date: '2026-06-01', value: 41 },
      { date: '2026-06-02', value: 41.2 },
    ])
  })
  it('mid = (buy+sell)/2', () => {
    expect(toSeries([{ date: 'd', buy: 40, sell: 42 }], 'mid')[0]!.value).toBe(41)
  })
  it('drops points without a usable value and sorts by date', () => {
    const out = toSeries([
      { date: '2026-06-03', sell: 41.5 },
      { date: '2026-06-01', sell: undefined as any },
      { date: '2026-06-02', sell: 41.2 },
    ])
    expect(out.map(p => p.date)).toEqual(['2026-06-02', '2026-06-03'])
  })
  it('tolerates undefined input', () => {
    expect(toSeries(undefined)).toEqual([])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/dollar-series.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/utils/dollarSeries.ts`:

```ts
import type { SeriesPoint } from './rateStats'

interface RawPoint {
  date?: string
  buy?: number
  sell?: number
}

/** Normalize evolution points into a clean, date-sorted {date,value} series. */
export function toSeries(
  points: RawPoint[] | undefined,
  kind: 'sell' | 'buy' | 'mid' = 'sell'
): SeriesPoint[] {
  if (!Array.isArray(points)) return []
  const out: SeriesPoint[] = []
  for (const p of points) {
    if (!p || !p.date) continue
    const buy = typeof p.buy === 'number' ? p.buy : null
    const sell = typeof p.sell === 'number' ? p.sell : null
    let value: number | null = null
    if (kind === 'sell') value = sell ?? buy
    else if (kind === 'buy') value = buy ?? sell
    else value = buy !== null && sell !== null ? (buy + sell) / 2 : (sell ?? buy)
    if (value === null || !Number.isFinite(value) || value <= 0) continue
    out.push({ date: p.date, value })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/dollar-series.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add app/utils/dollarSeries.ts app/tests/unit/dollar-series.test.ts
git commit -m "feat(trends): evolution→series normalizer"
```

---

## Task 3: Sparkline component + useDollarTrend composable

**Files:**
- Create: `app/components/Sparkline.vue`, `app/composables/useDollarTrend.ts`
- Modify: `app/plugins/vuetify.ts` (only if a new Vuetify component is introduced — Sparkline is pure SVG, none needed)

**Interfaces:**
- Consumes: `useApiService().getEvolutionData`, `toSeries`, `computeMomentum`, `computeRecords`.
- Produces:
  - `<Sparkline :values="number[]" :up="boolean" />` — inline SVG, 100×28 viewBox, `aria-hidden`.
  - `useDollarTrend()` → `{ momentum: Ref<Momentum>, records: Ref<Records>, pending: Ref<boolean> }` (lazy, BCU USD, period 6).

- [ ] **Step 1: Implement Sparkline.vue**

`app/components/Sparkline.vue`:

```vue
<template>
  <svg
    v-if="points"
    :viewBox="`0 0 ${W} ${H}`"
    class="sparkline"
    :class="{ 'is-up': up, 'is-down': !up }"
    preserveAspectRatio="none"
    aria-hidden="true"
    role="presentation"
  >
    <polyline :points="points" fill="none" stroke="currentColor" stroke-width="2" />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{ values: number[]; up?: boolean }>()
const W = 100
const H = 28
const points = computed(() => {
  const v = props.values.filter(n => Number.isFinite(n))
  if (v.length < 2) return ''
  const min = Math.min(...v)
  const max = Math.max(...v)
  const span = max - min || 1
  const step = W / (v.length - 1)
  return v.map((n, i) => `${(i * step).toFixed(1)},${(H - ((n - min) / span) * H).toFixed(1)}`).join(' ')
})
</script>

<style scoped>
.sparkline {
  width: 100%;
  height: 28px;
  display: block;
}
.sparkline.is-up {
  color: #16c784;
}
.sparkline.is-down {
  color: #ea3943;
}
@media (prefers-reduced-motion: reduce) {
  .sparkline {
    transition: none;
  }
}
</style>
```

- [ ] **Step 2: Implement useDollarTrend.ts**

`app/composables/useDollarTrend.ts`:

```ts
import { toSeries } from '~/utils/dollarSeries'
import { computeMomentum, computeRecords, type Momentum, type Records } from '~/utils/rateStats'

/** Lazy BCU USD trend (momentum + records). Safe on the home critical path. */
export function useDollarTrend() {
  const { getEvolutionData } = useApiService()

  const { data, pending } = useLazyAsyncData(
    'dollar-trend-bcu-usd',
    async () => {
      const res = await getEvolutionData('bcu', 'USD', undefined, 6)
      const series = toSeries((res?.data as any)?.evolution)
      return series
    },
    { default: () => [] }
  )

  const momentum = computed<Momentum>(() => computeMomentum(data.value ?? []))
  const records = computed<Records>(() => computeRecords(data.value ?? []))
  return { momentum, records, pending }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/Sparkline.vue app/composables/useDollarTrend.ts
git commit -m "feat(trends): Sparkline component + useDollarTrend composable"
```

---

## Task 4: DollarMomentum module + i18n + mount on home

**Files:**
- Create: `app/components/DollarMomentum.vue`
- Modify: `app/pages/index.vue`, `app/i18n/locales/json/{es,en,pt}.json`

**Interfaces:**
- Consumes: `useDollarTrend`, `useExchangeRates` (`bestSell`/`bestBuy`), `Sparkline`, `dolarHoy.*` i18n.
- Produces: `<DollarMomentum/>` — best buy/sell + change badge + sparkline + link to `/dolar-hoy`; skeleton while `pending`.

- [ ] **Step 1: Add i18n keys to es/en/pt**

Add a `"dolarHoy"` object to each `app/i18n/locales/json/*.json` (sibling of an existing top-level key).

es:
```json
  "dolarHoy": {
    "nav": "Dólar hoy",
    "title": "Cotización del dólar hoy en Uruguay",
    "subtitle": "¿El dólar subió o bajó? Mirá la variación y la tendencia.",
    "today": "Dólar hoy",
    "buy": "Compra",
    "sell": "Venta",
    "up": "subió",
    "down": "bajó",
    "flat": "sin cambios",
    "vsYesterday": "vs ayer",
    "noTrend": "Sin datos de tendencia por ahora.",
    "sevenDays": "Últimos 7 días",
    "seeMore": "Ver detalle",
    "metaTitle": "Cotización del dólar hoy en Uruguay: ¿subió o bajó? | Cambio Uruguay",
    "metaDescription": "Cotización del dólar hoy en Uruguay: precio de compra y venta, variación respecto a ayer y tendencia de los últimos días, con la mejor cotización de más de 40 casas de cambio."
  }
```
en (translate values; keep keys identical), pt (translate values). Use natural translations, e.g. en `"up":"rose","down":"fell","flat":"unchanged","vsYesterday":"vs yesterday"`; pt `"up":"subiu","down":"caiu","flat":"sem mudança","vsYesterday":"vs ontem"`.

Validate: `node -e "['es','en','pt'].forEach(l=>JSON.parse(require('fs').readFileSync('./app/i18n/locales/json/'+l+'.json','utf8')))"`.

- [ ] **Step 2: Implement DollarMomentum.vue**

`app/components/DollarMomentum.vue`:

```vue
<template>
  <VCard class="dollar-momentum pa-4" variant="flat">
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-overline text-grey">{{ $t('dolarHoy.today') }}</span>
      <NuxtLink :to="localePath('/dolar-hoy')" class="see-more text-caption">
        {{ $t('dolarHoy.seeMore') }} →
      </NuxtLink>
    </div>

    <template v-if="pending">
      <VSkeletonLoader type="text, heading" class="bg-transparent" />
    </template>

    <template v-else>
      <div class="d-flex align-center ga-4 flex-wrap">
        <div>
          <div class="text-caption text-grey">{{ $t('dolarHoy.buy') }} / {{ $t('dolarHoy.sell') }}</div>
          <div class="text-h6 font-weight-bold">
            {{ buy ? formatUYU(buy) : '-' }} / {{ sell ? formatUYU(sell) : '-' }}
          </div>
        </div>

        <VChip
          v-if="momentum.latest !== null"
          :color="chipColor"
          variant="tonal"
          size="small"
          :prepend-icon="chipIcon"
        >
          {{ changeLabel }}
        </VChip>

        <div class="spark-wrap flex-grow-1">
          <Sparkline v-if="momentum.sparkline.length > 1" :values="momentum.sparkline" :up="momentum.direction !== 'down'" />
          <span v-else class="text-caption text-grey">{{ $t('dolarHoy.noTrend') }}</span>
        </div>
      </div>
    </template>
  </VCard>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const { t } = useI18n()
const { momentum, pending } = useDollarTrend()
const { bestBuy, bestSell } = useExchangeRates()

const buy = computed(() => bestBuy('USD'))
const sell = computed(() => bestSell('USD'))

const chipColor = computed(() =>
  momentum.value.direction === 'up' ? 'success' : momentum.value.direction === 'down' ? 'error' : 'grey'
)
const chipIcon = computed(() =>
  momentum.value.direction === 'up'
    ? 'mdi-trending-up'
    : momentum.value.direction === 'down'
      ? 'mdi-trending-down'
      : 'mdi-trending-neutral'
)
const changeLabel = computed(() => {
  const m = momentum.value
  const word = m.direction === 'up' ? t('dolarHoy.up') : m.direction === 'down' ? t('dolarHoy.down') : t('dolarHoy.flat')
  const pct = m.direction === 'flat' ? '' : ` ${Math.abs(m.changePct)}%`
  return `${word}${pct} ${t('dolarHoy.vsYesterday')}`
})
</script>

<style scoped>
.dollar-momentum {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.see-more {
  color: #64b5f6;
  text-decoration: none;
  font-weight: 600;
}
.spark-wrap {
  min-width: 120px;
  max-width: 240px;
}
</style>
```

- [ ] **Step 3: Register `VSkeletonLoader` in Vuetify**

In `app/plugins/vuetify.ts` add `VSkeletonLoader` to both the import from `vuetify/components` and the `components: { ... }` object. (It is used by the skeleton above.)

- [ ] **Step 4: Mount on home**

In `app/pages/index.vue`, mount `<DollarMomentum />` near the top of the main content (e.g., just after `<TrustBar />` or above the rate comparison). Insert exactly:

```vue
        <ClientOnly>
          <DollarMomentum class="mb-4" />
        </ClientOnly>
```

(Wrap in `ClientOnly` so the lazy trend fetch never blocks SSR/FCP.)

- [ ] **Step 5: Validate + typecheck + commit**

Run: `node -e "['es','en','pt'].forEach(l=>JSON.parse(require('fs').readFileSync('./app/i18n/locales/json/'+l+'.json','utf8')))"`
Run: `npm run typecheck`
Expected: clean.

```bash
git add app/components/DollarMomentum.vue app/pages/index.vue app/plugins/vuetify.ts app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(trends): DollarMomentum home module + i18n"
```

---

## Task 5: /dolar-hoy page + SEO + e2e

**Files:**
- Create: `app/pages/dolar-hoy.vue`, `app/tests/e2e/dolar-hoy.spec.ts`

**Interfaces:**
- Consumes: `useDollarTrend`, `useExchangeRates`, `Sparkline`, `ShareButtons`, `dolarHoy.*` i18n.
- Produces: route `/dolar-hoy` (+ localized) with SEO meta, OG image, FAQ JSON-LD.

- [ ] **Step 1: Implement the page**

`app/pages/dolar-hoy.vue`:

```vue
<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" md="9" lg="8">
        <VCard class="overflow-hidden mb-5" elevation="8">
          <div class="hero pa-6">
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">{{ $t('dolarHoy.title') }}</h1>
            <p class="text-body-1 text-grey-lighten-2 mb-3">{{ $t('dolarHoy.subtitle') }}</p>
            <div class="d-flex justify-start justify-md-end">
              <ShareButtons :text="$t('dolarHoy.title')" />
            </div>
          </div>
        </VCard>

        <VCard class="pa-5 mb-5">
          <div v-if="pending" class="py-4">
            <VSkeletonLoader type="heading, text" class="bg-transparent" />
          </div>
          <template v-else>
            <div class="d-flex align-center ga-4 flex-wrap mb-4">
              <div>
                <div class="text-overline text-grey">{{ $t('dolarHoy.buy') }}</div>
                <div class="text-h4 font-weight-bold text-primary">{{ buy ? formatUYU(buy) : '-' }}</div>
              </div>
              <div>
                <div class="text-overline text-grey">{{ $t('dolarHoy.sell') }}</div>
                <div class="text-h4 font-weight-bold text-success">{{ sell ? formatUYU(sell) : '-' }}</div>
              </div>
              <VChip v-if="momentum.latest !== null" :color="chipColor" variant="tonal" :prepend-icon="chipIcon" class="ms-auto">
                {{ changeLabel }}
              </VChip>
            </div>

            <div class="text-overline text-grey mb-1">{{ $t('dolarHoy.sevenDays') }}</div>
            <div class="spark-lg">
              <Sparkline v-if="momentum.sparkline.length > 1" :values="momentum.sparkline" :up="momentum.direction !== 'down'" />
              <span v-else class="text-caption text-grey">{{ $t('dolarHoy.noTrend') }}</span>
            </div>
          </template>
        </VCard>

        <VCard class="pa-5" variant="flat">
          <p class="text-body-2 text-grey-lighten-1 mb-2">
            La variación se calcula sobre la cotización oficial del Banco Central del Uruguay (BCU).
            Para operar, compará la <NuxtLink :to="localePath('/cotizacion/dolar')" class="lnk">cotización del dólar</NuxtLink>
            en más de 40 casas de cambio.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const { t } = useI18n()
const { momentum, pending } = useDollarTrend()
const { bestBuy, bestSell } = useExchangeRates()

const buy = computed(() => bestBuy('USD'))
const sell = computed(() => bestSell('USD'))

const chipColor = computed(() =>
  momentum.value.direction === 'up' ? 'success' : momentum.value.direction === 'down' ? 'error' : 'grey'
)
const chipIcon = computed(() =>
  momentum.value.direction === 'up' ? 'mdi-trending-up' : momentum.value.direction === 'down' ? 'mdi-trending-down' : 'mdi-trending-neutral'
)
const changeLabel = computed(() => {
  const m = momentum.value
  const word = m.direction === 'up' ? t('dolarHoy.up') : m.direction === 'down' ? t('dolarHoy.down') : t('dolarHoy.flat')
  const pct = m.direction === 'flat' ? '' : ` ${Math.abs(m.changePct)}%`
  return `${word}${pct} ${t('dolarHoy.vsYesterday')}`
})

const canonical = computed(() => 'https://cambio-uruguay.com/dolar-hoy')

defineOgImageComponent('Cambio', {
  title: () => t('dolarHoy.title'),
  subtitle: () => t('dolarHoy.subtitle'),
  tag: 'DÓLAR HOY',
})

useSeoMeta({
  title: () => t('dolarHoy.metaTitle'),
  description: () => t('dolarHoy.metaDescription'),
  ogTitle: () => t('dolarHoy.metaTitle'),
  ogDescription: () => t('dolarHoy.metaDescription'),
  ogType: 'website',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #2f81f7 0%, #16c784 100%);
}
.spark-lg :deep(.sparkline) {
  height: 60px;
}
.lnk {
  color: #64b5f6;
  font-weight: 600;
  text-decoration: none;
}
</style>
```

- [ ] **Step 2: E2E test**

`app/tests/e2e/dolar-hoy.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('/dolar-hoy renders the dollar momentum surface', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/dolar-hoy')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // buy/sell labels present
  await expect(page.getByText(/Compra|Buy|Compra/).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})
```

- [ ] **Step 3: Run unit suite + typecheck**

Run: `npm run test`
Expected: all pass.
Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/pages/dolar-hoy.vue app/tests/e2e/dolar-hoy.spec.ts
git commit -m "feat(trends): /dolar-hoy SEO page (momentum + sparkline + share/OG)"
```

---

## PHASE 2 — Ahorro vs promedio

## Task 6: SavingsHighlight + average helper + mount

**Files:**
- Create: `app/components/SavingsHighlight.vue`
- Modify: `app/utils/currencyPages.ts` (add `averageSell`), `app/pages/dolar-hoy.vue` (mount), `app/i18n/locales/json/{es,en,pt}.json`
- Test: `app/tests/unit/average-sell.test.ts`

**Interfaces:**
- Consumes: `useExchangeRates().rows`, `quotesForCurrency`, `computeSavings`, `ShareButtons`.
- Produces: `averageSell(rows, code): number|null` (mean of positive sell quotes); `<SavingsHighlight/>`.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/average-sell.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { averageSell } from '../../utils/currencyPages'

const rows = [
  { origin: 'a', code: 'USD', type: '', buy: 39, sell: 41.0, name: 'A' },
  { origin: 'b', code: 'USD', type: '', buy: 39, sell: 41.4, name: 'B' },
  { origin: 'c', code: 'USD', type: '', buy: 39, sell: 41.2, name: 'C' },
]

describe('averageSell', () => {
  it('averages positive sell quotes', () => {
    expect(averageSell(rows as any, 'USD')).toBeCloseTo(41.2, 5)
  })
  it('returns null when no quotes', () => {
    expect(averageSell(rows as any, 'EUR')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/average-sell.test.ts`
Expected: FAIL (averageSell not exported).

- [ ] **Step 3: Implement `averageSell` in `app/utils/currencyPages.ts`**

Append (it can reuse the existing `quotesForCurrency` in the same file):

```ts
/** Mean of positive sell quotes for a currency, or null when none. */
export function averageSell(rows: readonly ExchangeRate[], code: CurrencyCode): number | null {
  const quotes = quotesForCurrency(rows, code).filter(q => q.sell !== null && q.sell > 0)
  if (!quotes.length) return null
  const sum = quotes.reduce((acc, q) => acc + (q.sell as number), 0)
  return sum / quotes.length
}
```

(If `ExchangeRate`/`CurrencyCode`/`quotesForCurrency` are already in scope in this module, no new imports are needed.)

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/average-sell.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Add i18n + implement SavingsHighlight.vue**

Add to each locale (`ahorro` object):

es:
```json
  "ahorro": {
    "title": "¿Cuánto ahorrás comparando?",
    "amount": "Monto en dólares",
    "saving": "Ahorrás",
    "vsAvg": "eligiendo la mejor casa vs el promedio del mercado",
    "share": "Compartir mi ahorro",
    "noData": "Cargando cotizaciones…"
  }
```
en: `{"title":"How much do you save by comparing?","amount":"Amount in dollars","saving":"You save","vsAvg":"choosing the best house vs the market average","share":"Share my saving","noData":"Loading rates…"}`
pt: `{"title":"Quanto você economiza comparando?","amount":"Valor em dólares","saving":"Você economiza","vsAvg":"escolhendo a melhor casa vs a média do mercado","share":"Compartilhar minha economia","noData":"Carregando cotações…"}`

`app/components/SavingsHighlight.vue`:

```vue
<template>
  <VCard class="savings pa-5" variant="flat">
    <div class="text-subtitle-1 font-weight-bold mb-3">{{ $t('ahorro.title') }}</div>
    <VRow dense align="center">
      <VCol cols="12" sm="5">
        <VTextField
          v-model.number="amount"
          type="number"
          min="0"
          :label="$t('ahorro.amount')"
          prefix="US$"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </VCol>
      <VCol cols="12" sm="7">
        <div v-if="best && avg" class="result-box px-4 py-3">
          <div class="text-caption text-grey">{{ $t('ahorro.saving') }}</div>
          <div class="text-h4 font-weight-bold text-success">{{ formatUYU(savings.savings) }}</div>
          <div class="text-caption text-grey-lighten-1">{{ $t('ahorro.vsAvg') }} ({{ savings.pct }}%)</div>
        </div>
        <div v-else class="text-caption text-grey">{{ $t('ahorro.noData') }}</div>
      </VCol>
    </VRow>
    <div class="mt-3">
      <ShareButtons :text="shareText" />
    </div>
  </VCard>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'
import { averageSell } from '~/utils/currencyPages'
import { computeSavings } from '~/utils/rateStats'

const { t } = useI18n()
const { rows, bestSell } = useExchangeRates()
const amount = ref(1000)

const best = computed(() => bestSell('USD'))
const avg = computed(() => averageSell(rows.value ?? [], 'USD'))
const savings = computed(() => computeSavings(amount.value || 0, best.value || 0, avg.value || 0))
const shareText = computed(() => `${t('ahorro.saving')} ${formatUYU(savings.value.savings)} — Cambio Uruguay`)
</script>

<style scoped>
.savings {
  background: rgba(22, 199, 132, 0.06);
  border: 1px solid rgba(22, 199, 132, 0.22);
  border-radius: 12px;
}
.result-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}
</style>
```

- [ ] **Step 6: Mount on /dolar-hoy + home**

In `app/pages/dolar-hoy.vue`, add `<SavingsHighlight class="mb-5" />` after the momentum card. In `app/pages/index.vue`, optionally add `<ClientOnly><SavingsHighlight class="mb-4" /></ClientOnly>` near the DollarMomentum module.

- [ ] **Step 7: Validate + test + typecheck + commit**

Run: `node -e "['es','en','pt'].forEach(l=>JSON.parse(require('fs').readFileSync('./app/i18n/locales/json/'+l+'.json','utf8')))"`
Run: `npm run test` ; `npm run typecheck`
Expected: clean.

```bash
git add app/components/SavingsHighlight.vue app/utils/currencyPages.ts app/pages/dolar-hoy.vue app/pages/index.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json app/tests/unit/average-sell.test.ts
git commit -m "feat(trends): SavingsHighlight (ahorro vs promedio) + averageSell"
```

---

## PHASE 3 — Récords e históricos

## Task 7: /dolar/records page + i18n + e2e

**Files:**
- Create: `app/pages/dolar/records.vue`
- Modify: `app/i18n/locales/json/{es,en,pt}.json`
- Test: extend `app/tests/e2e/dolar-hoy.spec.ts` with a records check

**Interfaces:**
- Consumes: `useDollarTrend` (`records`), `dolarRecords.*` i18n.

- [ ] **Step 1: Add i18n (`dolarRecords`)**

es:
```json
  "dolarRecords": {
    "title": "Dólar en Uruguay: máximos, mínimos e históricos",
    "subtitle": "Récords y promedios de la cotización oficial del dólar.",
    "max": "Máximo histórico",
    "min": "Mínimo histórico",
    "yearAgo": "Hace 1 año",
    "monthlyAvg": "Promedio del período",
    "noData": "Sin datos históricos por ahora.",
    "metaTitle": "Dólar en Uruguay: máximos, mínimos e históricos | Cambio Uruguay",
    "metaDescription": "Máximo y mínimo histórico del dólar en Uruguay, valor de hace un año y promedio del período, según la cotización oficial del BCU."
  }
```
en/pt: translate values, keep keys.

- [ ] **Step 2: Implement the page**

`app/pages/dolar/records.vue`:

```vue
<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" md="9" lg="8">
        <h1 class="text-h5 text-md-h4 font-weight-bold mb-1">{{ $t('dolarRecords.title') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mb-5">{{ $t('dolarRecords.subtitle') }}</p>

        <div v-if="pending"><VSkeletonLoader type="table" class="bg-transparent" /></div>
        <VAlert v-else-if="records.max === null" type="info" variant="tonal">
          {{ $t('dolarRecords.noData') }}
        </VAlert>
        <div v-else class="records-grid">
          <div class="rec-box">
            <div class="text-overline text-grey">{{ $t('dolarRecords.max') }}</div>
            <div class="text-h5 font-weight-bold text-success">{{ formatUYU(records.max.value) }}</div>
            <div class="text-caption text-grey">{{ fmtDate(records.max.date) }}</div>
          </div>
          <div class="rec-box">
            <div class="text-overline text-grey">{{ $t('dolarRecords.min') }}</div>
            <div class="text-h5 font-weight-bold text-error">{{ formatUYU(records.min.value) }}</div>
            <div class="text-caption text-grey">{{ fmtDate(records.min.date) }}</div>
          </div>
          <div v-if="records.yearAgo !== null" class="rec-box">
            <div class="text-overline text-grey">{{ $t('dolarRecords.yearAgo') }}</div>
            <div class="text-h5 font-weight-bold">{{ formatUYU(records.yearAgo) }}</div>
          </div>
          <div v-if="records.monthlyAvg !== null" class="rec-box">
            <div class="text-overline text-grey">{{ $t('dolarRecords.monthlyAvg') }}</div>
            <div class="text-h5 font-weight-bold">{{ formatUYU(records.monthlyAvg) }}</div>
          </div>
        </div>

        <p class="text-body-2 text-grey-lighten-1 mt-5">
          Mirá la <NuxtLink :to="localePath('/dolar-hoy')" class="lnk">cotización del dólar hoy</NuxtLink>
          o el <NuxtLink :to="localePath('/historico')" class="lnk">histórico completo</NuxtLink>.
        </p>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const { t } = useI18n()
const { records, pending } = useDollarTrend()

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
}

const canonical = 'https://cambio-uruguay.com/dolar/records'
defineOgImageComponent('Cambio', {
  title: () => t('dolarRecords.title'),
  subtitle: () => t('dolarRecords.subtitle'),
  tag: 'RÉCORDS',
})
useSeoMeta({
  title: () => t('dolarRecords.metaTitle'),
  description: () => t('dolarRecords.metaDescription'),
  ogType: 'website',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
</script>

<style scoped>
.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.rec-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 14px 16px;
}
.lnk {
  color: #64b5f6;
  font-weight: 600;
  text-decoration: none;
}
</style>
```

- [ ] **Step 3: Extend e2e**

Append to `app/tests/e2e/dolar-hoy.spec.ts`:

```ts
test('/dolar/records renders record boxes or a no-data notice', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/dolar/records')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})
```

- [ ] **Step 4: Validate + typecheck + commit**

Run: `node -e "['es','en','pt'].forEach(l=>JSON.parse(require('fs').readFileSync('./app/i18n/locales/json/'+l+'.json','utf8')))"`
Run: `npm run typecheck`

```bash
git add app/pages/dolar/records.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json app/tests/e2e/dolar-hoy.spec.ts
git commit -m "feat(trends): /dolar/records page (máx/mín/año atrás/promedio)"
```

---

## PHASE 4 — Panel multi-moneda

## Task 8: MultiCurrencyPanel + mount on /avanzado + i18n

**Files:**
- Create: `app/components/MultiCurrencyPanel.vue`
- Modify: `app/pages/avanzado.vue`, `app/i18n/locales/json/{es,en,pt}.json`

**Interfaces:**
- Consumes: `useExchangeRates` (`bestBuy`/`bestSell`), `Sparkline`, `useDollarTrend` (USD sparkline only), `panel.*` i18n.
- Produces: `<MultiCurrencyPanel/>` — one row per currency: best buy/sell + (USD) sparkline.

- [ ] **Step 1: Add i18n (`panel`)**

es:
```json
  "panel": {
    "title": "Todas las cotizaciones de un vistazo",
    "currency": "Moneda",
    "buy": "Compra",
    "sell": "Venta",
    "trend": "Tendencia"
  }
```
en/pt: translate values, keep keys.

- [ ] **Step 2: Implement the component**

`app/components/MultiCurrencyPanel.vue`:

```vue
<template>
  <VCard class="panel pa-4" variant="flat">
    <div class="text-subtitle-1 font-weight-bold mb-3">{{ $t('panel.title') }}</div>
    <VTable density="comfortable" class="panel-table">
      <thead>
        <tr>
          <th>{{ $t('panel.currency') }}</th>
          <th class="text-right">{{ $t('panel.buy') }}</th>
          <th class="text-right">{{ $t('panel.sell') }}</th>
          <th class="trend-col">{{ $t('panel.trend') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in currencies" :key="c">
          <td class="font-weight-medium">{{ c }}</td>
          <td class="text-right">{{ fmt(bestBuy(c)) }}</td>
          <td class="text-right">{{ fmt(bestSell(c)) }}</td>
          <td class="trend-col">
            <Sparkline
              v-if="c === 'USD' && momentum.sparkline.length > 1"
              :values="momentum.sparkline"
              :up="momentum.direction !== 'down'"
            />
            <span v-else class="text-caption text-grey">—</span>
          </td>
        </tr>
      </tbody>
    </VTable>
  </VCard>
</template>

<script setup lang="ts">
import { formatNumber } from '~/utils/format'
import type { CurrencyCode } from '~/utils/currencyPages'

const { bestBuy, bestSell } = useExchangeRates()
const { momentum } = useDollarTrend()
const currencies: CurrencyCode[] = ['USD', 'EUR', 'BRL', 'ARS']
const fmt = (n: number | null) => (n ? formatNumber(n) : '-')
</script>

<style scoped>
.panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.panel-table :deep(td),
.panel-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.trend-col {
  width: 120px;
}
</style>
```

(`formatNumber` exists in `~/utils/format`; if not, use `formatUYU`.)

- [ ] **Step 3: Mount on /avanzado**

In `app/pages/avanzado.vue`, mount `<ClientOnly><MultiCurrencyPanel class="mb-4" /></ClientOnly>` near the top of the page content.

- [ ] **Step 4: Validate + typecheck + commit**

Run: `node -e "['es','en','pt'].forEach(l=>JSON.parse(require('fs').readFileSync('./app/i18n/locales/json/'+l+'.json','utf8')))"`
Run: `npm run typecheck`

```bash
git add app/components/MultiCurrencyPanel.vue app/pages/avanzado.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(trends): multi-currency panel on /avanzado"
```

---

## Task 9: Final verification + nav links

**Files:**
- Modify: `app/layouts/default.vue` (add a "Dólar hoy" nav link), optionally `app/components/Footer.vue`.

- [ ] **Step 1: Add a nav link to /dolar-hoy**

In `app/layouts/default.vue`, add a nav `VBtn` in the toolbar items linking to `localePath('/dolar-hoy')` with `$t('dolarHoy.nav')` and icon `mdi-trending-up`, mirroring the existing nav buttons.

- [ ] **Step 2: Full suite + typecheck + lint**

Run: `npm run test` → all pass.
Run: `npm run typecheck` → no new errors.
Run: `npm run lint` → fix any new issues in added files.

- [ ] **Step 3: E2E (if dev server available)**

Run: `npm run test:e2e -- dolar-hoy.spec.ts`
Expected: pass (or note environment limitation).

- [ ] **Step 4: Commit**

```bash
git add app/layouts/default.vue app/components/Footer.vue
git commit -m "feat(trends): nav link to /dolar-hoy"
```

---

## Self-Review

**Spec coverage:**
- Shared core (momentum/records/savings) → Task 1. ✓
- Series normalizer → Task 2. ✓
- Sparkline + lazy trend composable → Task 3. ✓
- Dólar momentum (home) → Task 4. ✓
- /dolar-hoy SEO page + OG + e2e → Task 5. ✓
- Ahorro vs promedio + averageSell → Task 6. ✓
- Récords page → Task 7. ✓
- Multi-currency panel → Task 8. ✓
- Nav/discoverability + final verify → Task 9. ✓
- Accessibility (icon+text, sparkline aria-hidden, reduced-motion), skeletons, i18n es/en/pt, lazy on home → Tasks 3,4,5 + Global Constraints. ✓

**Placeholder scan:** All code steps are complete. The i18n en/pt values are described as "translate, keep keys identical" with example translations — the implementer fills natural translations; this is content, not logic, and the key set is fully specified in the es block.

**Type consistency:** `SeriesPoint{date,value}`, `Momentum`, `Records`, `computeMomentum/Records/Savings`, `toSeries`, `averageSell(rows,code)`, `useDollarTrend()→{momentum,records,pending}`, `<Sparkline :values :up>` are used identically across tasks. `VSkeletonLoader`/`VTable` registration noted (Tasks 4, 8 — VTable already registered from prior work; verify).
