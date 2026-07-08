# Phase 2 — `/por-que-sube-el-dolar` Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The `.vue` component/page tasks (4–7) should invoke the **frontend-design** skill for visual polish within the given component contract.

**Goal:** Build the public page `/por-que-sube-el-dolar` that visualizes Phase 1's data — a "why today" card, a USD/UYU chart with clickable move-day markers, a ranked driver-correlation panel (|r| bars + sparkline + plain-language reading), and a notable-moves timeline with numeric attribution — consuming only the existing `/api/analysis/USD` + `/api/drivers` (no backend change).

**Architecture:** All transformation logic lives in pure, unit-tested utils (`app/utils/attribution.ts`, `app/utils/driverReadings.ts`); Vue components under `app/components/analysis/` only render; the page orchestrates two SSR fetches and shared "selected move" state. Trilingual copy via i18n JSON; SEO via the established `useSeoMeta` + `defineOgImageComponent` + JSON-LD pattern.

**Tech Stack:** Nuxt 4 + Vuetify SSR, vue-chartjs/chart.js 4, vue-i18n (`@nuxtjs/i18n`), vitest (`app/tests/unit/`), Playwright (`app/tests/e2e/`).

## Global Constraints

- All work under `app/`; run tests from `app/`. Unit: `npm run test:unit`. E2E: `npm run test:e2e`.
- Pure logic → `app/utils/**`, relative imports only, NO Nuxt auto-imports, unit-tested. Components → `app/components/analysis/**`, NOT unit-tested (verified via e2e, repo convention).
- Reuse the existing `app/components/Sparkline.vue` (`defineProps<{ values: number[]; up?: boolean }>()`) — do NOT build a new sparkline.
- Consume ONLY existing endpoints: `GET /api/analysis/USD` → `{ currency, asOf, base: {date,value}[], correlations: {key,r,n}[], moves: {date,pctChange,direction}[], headlines: {title,source,link,pubDate}[] }`; `GET /api/drivers` → `{ drivers: {key,label,source}[], series: {key, points: {date,value}[]}[] }`. Do NOT modify any `app/server/**` file or the historico page.
- `SeriesPoint = { date: string; value: number }` from `app/utils/rateStats.ts` — reuse.
- i18n copy lives in `app/i18n/locales/json/{es,en,pt}.json`. ES is the source-of-truth language; EN/PT are parallel translations. Every user-facing string uses a `porQueDolar.*` key via `t()`.
- SEO pattern (copy from `app/pages/dolar-hoy.vue`): `useSeoMeta`, `defineOgImageComponent('Cambio', {...})`, `useHead` canonical + JSON-LD `innerHTML`, `useLocalePath`. Route is static → nuxt-sitemap auto-includes it.
- Chart mounts client-side (wrap in `<ClientOnly>`) to avoid SSR hydration mismatch, never blocking the rest of SSR (AIInsights pattern).
- TypeScript strict `noUncheckedIndexedAccess` — guard array indexing.
- Honesty: correlation ≠ causation; show `r` + `n`; drivers with `n=0` shown as "sin datos"; methodology/disclaimer section required. Commit after each task.

---

## File Structure

**Pure utils (unit-tested):**
- `app/utils/driverReadings.ts` — `strengthLabel(r)`, `readingKeyFor(driverKey, r)` → i18n key selection.
- `app/utils/attribution.ts` — `attributeMove(moveDate, driverSeries)`, `todaySummary(base, correlations)`.

**i18n:**
- `app/i18n/locales/json/{es,en,pt}.json` — add a `porQueDolar` object.

**Components (`app/components/analysis/`, not unit-tested):**
- `DollarDriversPanel.vue` — ranked drivers: |r| bar + `<Sparkline>` + reading + n.
- `PriceMovesChart.vue` — USD line, highlighted move points, click → `emit('select', date)`.
- `WhyTodayCard.vue` — today's move + top driver reading + today's headline count.
- `MovesTimeline.vue` — notable moves, each with numeric attribution chips + archived headlines when present.

**Page + e2e:**
- `app/pages/por-que-sube-el-dolar.vue` — orchestration, fetch, SEO, shared selected-move state.
- `app/tests/e2e/por-que-sube-el-dolar.spec.ts`.

---

## Task 1: driverReadings util (pure)

**Files:**
- Create: `app/utils/driverReadings.ts`
- Test: `app/tests/unit/driverReadings.test.ts`

**Interfaces:**
- Produces:
  - `type Strength = 'fuerte' | 'moderada' | 'debil' | 'casiNula'`
  - `strengthLabel(r: number): Strength` — thresholds on `|r|`: ≥0.5 `fuerte`, ≥0.3 `moderada`, ≥0.1 `debil`, else `casiNula`.
  - `readingKeyFor(driverKey: string, r: number): string` — returns an i18n key. `casiNula` → `porQueDolar.readings.<driverKey>.weak`; else sign → `.pos`/`.neg`. Unknown driver → `porQueDolar.readings.generic.{pos|neg|weak}`.

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/driverReadings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { strengthLabel, readingKeyFor } from '../../utils/driverReadings'

describe('strengthLabel', () => {
  it('buckets by absolute r', () => {
    expect(strengthLabel(0.6)).toBe('fuerte')
    expect(strengthLabel(-0.55)).toBe('fuerte')
    expect(strengthLabel(0.31)).toBe('moderada')
    expect(strengthLabel(0.115)).toBe('debil')
    expect(strengthLabel(0.03)).toBe('casiNula')
    expect(strengthLabel(0)).toBe('casiNula')
  })
})

describe('readingKeyFor', () => {
  it('picks pos/neg by sign for a known driver above the weak threshold', () => {
    expect(readingKeyFor('brl', 0.365)).toBe('porQueDolar.readings.brl.pos')
    expect(readingKeyFor('dxy', -0.31)).toBe('porQueDolar.readings.dxy.neg')
  })
  it('picks the weak key when correlation is near zero', () => {
    expect(readingKeyFor('arBlue', 0.03)).toBe('porQueDolar.readings.arBlue.weak')
  })
  it('falls back to generic for an unknown driver', () => {
    expect(readingKeyFor('mystery', 0.4)).toBe('porQueDolar.readings.generic.pos')
    expect(readingKeyFor('mystery', -0.4)).toBe('porQueDolar.readings.generic.neg')
    expect(readingKeyFor('mystery', 0.01)).toBe('porQueDolar.readings.generic.weak')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- driverReadings`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/driverReadings.ts`:

```ts
export type Strength = 'fuerte' | 'moderada' | 'debil' | 'casiNula'

/** Bucket a correlation coefficient by absolute strength. */
export function strengthLabel(r: number): Strength {
  const a = Math.abs(r)
  if (a >= 0.5) return 'fuerte'
  if (a >= 0.3) return 'moderada'
  if (a >= 0.1) return 'debil'
  return 'casiNula'
}

// Drivers that have a hand-written plain-language reading. Anything else → 'generic'.
const KNOWN = new Set(['brl', 'dxy', 'us10y', 'eurusd', 'arBlue', 'arOfficial'])

/** Select the i18n key for a driver's plain-language reading given its correlation. */
export function readingKeyFor(driverKey: string, r: number): string {
  const base = KNOWN.has(driverKey) ? driverKey : 'generic'
  if (strengthLabel(r) === 'casiNula') return `porQueDolar.readings.${base}.weak`
  return `porQueDolar.readings.${base}.${r >= 0 ? 'pos' : 'neg'}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- driverReadings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/driverReadings.ts app/tests/unit/driverReadings.test.ts
git commit -m "feat(analysis): driver reading + strength i18n-key selector (pure)"
```

---

## Task 2: attribution util (pure)

**Files:**
- Create: `app/utils/attribution.ts`
- Test: `app/tests/unit/attribution.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint` from `app/utils/rateStats.ts`.
- Produces:
  - `interface DriverDayMove { key: string; dayMovePct: number }`
  - `attributeMove(moveDate: string, driverSeries: { key: string; points: SeriesPoint[] }[]): DriverDayMove[]` — for each driver, the % change on `moveDate` vs its previous available point; skip drivers with no point on that date or no prior point; sort by `|dayMovePct|` desc.
  - `type Direction = 'up' | 'down' | 'flat'`
  - `interface TodaySummary { date: string | null; pctChange: number; direction: Direction; top: { key: string; r: number } | null }`
  - `todaySummary(base: SeriesPoint[], correlations: { key: string; r: number; n: number }[]): TodaySummary` — last two `base` points → pctChange/direction; `top` = correlation with the greatest `|r|` among those with `n > 0` (or null).

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/attribution.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { attributeMove, todaySummary } from '../../utils/attribution'

const S = (pairs: [string, number][]) => pairs.map(([date, value]) => ({ date, value }))

describe('attributeMove', () => {
  it('computes each driver day-move vs its previous point, sorted by |move| desc', () => {
    const driverSeries = [
      { key: 'brl', points: S([['2026-06-01', 5.0], ['2026-06-02', 5.15]]) }, // +3%
      { key: 'dxy', points: S([['2026-06-01', 100], ['2026-06-02', 101]]) }, // +1%
    ]
    const out = attributeMove('2026-06-02', driverSeries)
    expect(out.map(d => d.key)).toEqual(['brl', 'dxy'])
    expect(out[0]!.dayMovePct).toBeCloseTo(3, 6)
    expect(out[1]!.dayMovePct).toBeCloseTo(1, 6)
  })
  it('skips a driver with no point on the date or no prior point', () => {
    const driverSeries = [
      { key: 'brl', points: S([['2026-06-02', 5.15]]) }, // no prior point
      { key: 'dxy', points: S([['2026-06-01', 100], ['2026-06-03', 101]]) }, // no 06-02 point
    ]
    expect(attributeMove('2026-06-02', driverSeries)).toEqual([])
  })
})

describe('todaySummary', () => {
  it('summarizes the latest base move and picks the strongest live driver', () => {
    const base = S([['2026-06-01', 40], ['2026-06-02', 40.8]]) // +2%
    const corr = [
      { key: 'us10y', r: 0.11, n: 800 },
      { key: 'brl', r: 0.36, n: 800 },
      { key: 'dead', r: 0.9, n: 0 }, // n=0 → excluded despite high r
    ]
    const s = todaySummary(base, corr)
    expect(s.date).toBe('2026-06-02')
    expect(s.direction).toBe('up')
    expect(s.pctChange).toBeCloseTo(2, 6)
    expect(s.top).toEqual({ key: 'brl', r: 0.36 })
  })
  it('is flat/null-safe for short input', () => {
    expect(todaySummary([], []).direction).toBe('flat')
    expect(todaySummary([], []).date).toBeNull()
    expect(todaySummary([{ date: 'd', value: 40 }], []).top).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:unit -- attribution`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/attribution.ts`:

```ts
import type { SeriesPoint } from './rateStats'

export interface DriverDayMove {
  key: string
  dayMovePct: number
}

/** % change of each driver on `moveDate` vs its previous available point, ranked by magnitude. */
export function attributeMove(
  moveDate: string,
  driverSeries: { key: string; points: SeriesPoint[] }[]
): DriverDayMove[] {
  const out: DriverDayMove[] = []
  for (const d of driverSeries) {
    const idx = d.points.findIndex(p => p.date === moveDate)
    if (idx <= 0) continue // not present, or no prior point
    const cur = d.points[idx]!
    const prev = d.points[idx - 1]!
    if (prev.value <= 0) continue
    out.push({ key: d.key, dayMovePct: ((cur.value - prev.value) / prev.value) * 100 })
  }
  return out.sort((a, b) => Math.abs(b.dayMovePct) - Math.abs(a.dayMovePct))
}

export type Direction = 'up' | 'down' | 'flat'

export interface TodaySummary {
  date: string | null
  pctChange: number
  direction: Direction
  top: { key: string; r: number } | null
}

/** Latest base move + the strongest correlated driver that currently has data (n > 0). */
export function todaySummary(
  base: SeriesPoint[],
  correlations: { key: string; r: number; n: number }[]
): TodaySummary {
  let top: { key: string; r: number } | null = null
  for (const c of correlations) {
    if (c.n > 0 && (top === null || Math.abs(c.r) > Math.abs(top.r))) top = { key: c.key, r: c.r }
  }
  if (base.length < 2) {
    const last = base[base.length - 1]
    return { date: last?.date ?? null, pctChange: 0, direction: 'flat', top }
  }
  const cur = base[base.length - 1]!
  const prev = base[base.length - 2]!
  const pctChange = prev.value > 0 ? ((cur.value - prev.value) / prev.value) * 100 : 0
  const direction: Direction = pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'flat'
  return { date: cur.date, pctChange, direction, top }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:unit -- attribution`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/attribution.ts app/tests/unit/attribution.test.ts
git commit -m "feat(analysis): per-move attribution + today-summary utils (pure)"
```

---

## Task 3: i18n copy (`porQueDolar` keys)

**Files:**
- Modify: `app/i18n/locales/json/es.json`, `app/i18n/locales/json/en.json`, `app/i18n/locales/json/pt.json`

**Interfaces:**
- Produces: a `porQueDolar` object consumed by `t('porQueDolar.*')` in Tasks 4–7. The `readings.*` keys MUST match the outputs of `readingKeyFor` (Task 1): for each of `brl, dxy, us10y, eurusd, arBlue, arOfficial, generic` there are `pos`, `neg`, `weak` strings.

This task adds copy only; verification is that the JSON parses and the keys exist. No unit test.

- [ ] **Step 1: Add the `porQueDolar` block to `es.json`**

Add this top-level key to `app/i18n/locales/json/es.json` (merge into the existing root object — do NOT replace the file):

```json
"porQueDolar": {
  "metaTitle": "¿Por qué sube o baja el dólar en Uruguay? Análisis y correlación",
  "metaDescription": "Qué mueve al dólar en Uruguay: correlación real con el real brasileño, el dólar global y las tasas de EE.UU., con los saltos de precio explicados día a día.",
  "title": "¿Por qué sube o baja el dólar en Uruguay?",
  "subtitle": "Qué factores mueven la cotización, medido con datos.",
  "todayTitle": "Qué está moviendo al dólar hoy",
  "todayUp": "Hoy el dólar subió {pct}%",
  "todayDown": "Hoy el dólar bajó {pct}%",
  "todayFlat": "Hoy el dólar se mantuvo estable",
  "todayNoData": "Todavía no hay datos del día de hoy.",
  "todayTopDriver": "El factor más asociado a estos movimientos es {driver}.",
  "todayHeadlines": "{count} titulares de hoy",
  "chartTitle": "Cotización del dólar y días de mayor movimiento",
  "chartHint": "Tocá un punto marcado para ver qué pasó ese día.",
  "markerUp": "Salto al alza",
  "markerDown": "Salto a la baja",
  "driversTitle": "Qué mueve al dólar (correlación medida)",
  "driversHint": "Correlación de los retornos diarios en la ventana disponible. No implica causalidad.",
  "noData": "sin datos",
  "sampleSize": "{n} días",
  "strength": { "fuerte": "fuerte", "moderada": "moderada", "debil": "débil", "casiNula": "casi nula" },
  "timelineTitle": "Saltos notables y su contexto",
  "timelineAttribution": "Ese día se movieron:",
  "timelineNoNews": "Sin noticias archivadas para esta fecha todavía.",
  "methodologyTitle": "Cómo se calcula",
  "methodologyBody": "Tomamos la cotización diaria del dólar (BROU/BCU) y la comparamos con indicadores que suelen mover al peso: el real brasileño, un índice amplio del dólar (FRED), el bono de EE.UU. a 10 años y el dólar argentino. Calculamos la correlación de Pearson sobre los retornos diarios (variaciones porcentuales), no sobre los niveles, para evitar correlaciones espurias. La correlación mide co-movimiento, no causalidad: un valor alto sugiere que dos cosas se mueven juntas, no que una cause la otra. Algunos días el dólar se mueve por factores locales (flujo, decisiones del BCU) sin un driver externo claro.",
  "sources": "Fuentes: BROU/BCU (cotización), FRED (índice dólar, bono 10 años), argentinadatos.com (dólar Argentina). Datos al {date}.",
  "disclaimer": "Información con fines educativos, no es asesoramiento financiero.",
  "readings": {
    "brl": {
      "pos": "El dólar en Uruguay tiende a subir cuando se debilita el real brasileño.",
      "neg": "El dólar en Uruguay tiende a bajar cuando se debilita el real brasileño.",
      "weak": "El real brasileño explica poco el movimiento del dólar en Uruguay."
    },
    "dxy": {
      "pos": "Cuando el dólar se fortalece en el mundo, el peso uruguayo tiende a debilitarse.",
      "neg": "Cuando el dólar se fortalece en el mundo, el peso uruguayo tiende a fortalecerse.",
      "weak": "El dólar global explica poco el movimiento del dólar en Uruguay."
    },
    "us10y": {
      "pos": "Tasas más altas del bono de EE.UU. a 10 años suelen acompañar un dólar más fuerte acá.",
      "neg": "Tasas más altas del bono de EE.UU. a 10 años suelen acompañar un dólar más débil acá.",
      "weak": "El bono de EE.UU. a 10 años explica poco el movimiento del dólar en Uruguay."
    },
    "eurusd": {
      "pos": "El euro y el dólar en Uruguay tienden a moverse en la misma dirección.",
      "neg": "El euro y el dólar en Uruguay tienden a moverse en sentido opuesto.",
      "weak": "El euro explica poco el movimiento del dólar en Uruguay."
    },
    "arBlue": {
      "pos": "El dólar blue argentino se mueve levemente en línea con el dólar en Uruguay.",
      "neg": "El dólar blue argentino se mueve levemente en sentido opuesto al dólar en Uruguay.",
      "weak": "El dólar blue argentino casi no explica el movimiento del dólar en Uruguay."
    },
    "arOfficial": {
      "pos": "El dólar oficial argentino se mueve levemente en línea con el dólar en Uruguay.",
      "neg": "El dólar oficial argentino se mueve levemente en sentido opuesto al dólar en Uruguay.",
      "weak": "El dólar oficial argentino casi no explica el movimiento del dólar en Uruguay."
    },
    "generic": {
      "pos": "Este indicador tiende a moverse en la misma dirección que el dólar en Uruguay.",
      "neg": "Este indicador tiende a moverse en sentido opuesto al dólar en Uruguay.",
      "weak": "Este indicador explica poco el movimiento del dólar en Uruguay."
    }
  }
}
```

- [ ] **Step 2: Add parallel translations to `en.json` and `pt.json`**

Add the same `porQueDolar` key structure to `app/i18n/locales/json/en.json` (English) and `app/i18n/locales/json/pt.json` (Portuguese), translating every string and preserving the `{pct}`, `{count}`, `{driver}`, `{n}`, `{date}` placeholders exactly. Keep the identical nested key shape (same `readings.<driver>.{pos,neg,weak}` set). English `title` e.g. "Why is the dollar rising or falling in Uruguay?"; Portuguese e.g. "Por que o dólar sobe ou desce no Uruguai?".

- [ ] **Step 3: Verify all three JSON files parse and carry the keys**

Run:
```bash
cd app && node -e "for (const l of ['es','en','pt']) { const j=require('./i18n/locales/json/'+l+'.json'); if(!j.porQueDolar?.readings?.brl?.pos) throw new Error(l+' missing porQueDolar.readings.brl.pos'); console.log(l,'ok'); }"
```
Expected: `es ok`, `en ok`, `pt ok`. (JSON.parse errors here mean a trailing comma or malformed merge — fix before committing.)

- [ ] **Step 4: Commit**

```bash
git add app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(analysis): i18n copy for /por-que-sube-el-dolar (es/en/pt)"
```

---

## Task 4: DollarDriversPanel component

**Files:**
- Create: `app/components/analysis/DollarDriversPanel.vue`

**Interfaces:**
- Consumes: `readingKeyFor`, `strengthLabel` (Task 1); `Sparkline.vue` (existing); i18n `porQueDolar.*` (Task 3).
- Props: `correlations: { key: string; r: number; n: number }[]`, `driverLabels: Record<string,string>` (key→label from `/api/drivers`), `driverSeries: Record<string, number[]>` (key→sparkline values).
- Produces: a self-contained panel; no emits.

**Invoke the frontend-design skill** for visual polish (spacing, tokens, responsive) within this contract.

- [ ] **Step 1: Implement the component**

Create `app/components/analysis/DollarDriversPanel.vue`. Required behavior:
- Sort a copy of `correlations` by `|r|` desc; entries with `n === 0` go last, rendered dimmed with the `porQueDolar.noData` label instead of a bar.
- For each entry render: driver label (`driverLabels[key] ?? key`); a horizontal bar whose width is `Math.min(100, Math.abs(r) * 100)%`, colored green (`r >= 0`) or red (`r < 0`) via theme-consistent classes; the signed `r` to 2 decimals and `t('porQueDolar.sampleSize', { n })`; `strengthLabel(r)` shown via `t('porQueDolar.strength.' + strengthLabel(r))`; `<Sparkline :values="driverSeries[key] ?? []" :up="r >= 0" />`; and the reading `t(readingKeyFor(key, r))`.
- Wrap in a `<VCard>` with an `<h2>` title `t('porQueDolar.driversTitle')` and a hint line `t('porQueDolar.driversHint')`.

Reference `<script setup lang="ts">` core:

```ts
import { readingKeyFor, strengthLabel } from '~/utils/driverReadings'

const props = defineProps<{
  correlations: { key: string; r: number; n: number }[]
  driverLabels: Record<string, string>
  driverSeries: Record<string, number[]>
}>()
const { t } = useI18n()

const ranked = computed(() =>
  [...props.correlations].sort((a, b) => {
    if ((a.n === 0) !== (b.n === 0)) return a.n === 0 ? 1 : -1
    return Math.abs(b.r) - Math.abs(a.r)
  })
)
const barPct = (r: number) => Math.min(100, Math.abs(r) * 100)
const label = (key: string) => props.driverLabels[key] ?? key
```

Use Vuetify components (`VCard`, `VRow`/`VCol` or flex utility classes) matching `app/pages/dolar-hoy.vue`'s idiom. Bar color classes must work in both light and dark themes (use `text-success`/`bg-success` and `text-error`/`bg-error` Vuetify tokens, not raw hex).

- [ ] **Step 2: Typecheck the component compiles**

Run: `cd app && npx nuxt typecheck 2>&1 | grep -E "DollarDriversPanel" || echo "no type errors in DollarDriversPanel"`
Expected: `no type errors in DollarDriversPanel` (if vue-tsc crashes on unrelated files, fall back to `npx eslint components/analysis/DollarDriversPanel.vue` clean + manual signature check; note the limitation).

- [ ] **Step 3: Commit**

```bash
git add app/components/analysis/DollarDriversPanel.vue
git commit -m "feat(analysis): DollarDriversPanel (|r| bars + sparkline + reading)"
```

---

## Task 5: PriceMovesChart component

**Files:**
- Create: `app/components/analysis/PriceMovesChart.vue`

**Interfaces:**
- Consumes: vue-chartjs `Line` + chart.js (register locally, mirroring `app/pages/historico/[origin]/[currency]/[[type]].vue`).
- Props: `base: { date: string; value: number }[]`, `moves: { date: string; pctChange: number; direction: 'up'|'down'|'flat' }[]`.
- Emits: `select(date: string)` when a marked move point is clicked.

**Invoke the frontend-design skill** for chart styling within this contract.

- [ ] **Step 1: Implement the component**

Create `app/components/analysis/PriceMovesChart.vue`. Required behavior:
- Register chart.js pieces locally: `CategoryScale, LinearScale, PointElement, LineElement, LineController, Tooltip, Filler` (see the historico page for the exact import + `ChartJS.register(...)` call).
- Build a `Set` of move dates. Chart labels = `base.map(p => moment(p.date).format('DD/MM'))` (moment is available in the app); single dataset data = `base.map(p => p.value)`.
- Per-point styling arrays keyed by index: `pointRadius[i]` = 5 if `base[i].date` is a move date else 0; `pointBackgroundColor[i]` = green if that move's direction is `up`, red if `down`.
- `options.onClick`: use `chart.getElementsAtEventForMode(evt, 'nearest', {intersect:true}, true)`; if it hits an index whose `base[idx].date` is a move date, `emit('select', base[idx].date)`.
- Tooltip callback title → full `DD/MM/YYYY` from `base[idx].date`.
- Fixed-height container (~360px), responsive width, `maintainAspectRatio: false`.

Reference `<script setup lang="ts">` skeleton:

```ts
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  LineController, Tooltip, Filler,
} from 'chart.js'
import moment from 'moment'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, LineController, Tooltip, Filler)

const props = defineProps<{
  base: { date: string; value: number }[]
  moves: { date: string; pctChange: number; direction: 'up' | 'down' | 'flat' }[]
}>()
const emit = defineEmits<{ select: [date: string] }>()

const moveDir = computed(() => new Map(props.moves.map(m => [m.date, m.direction])))
const chartData = computed(() => ({
  labels: props.base.map(p => moment(p.date).format('DD/MM')),
  datasets: [{
    data: props.base.map(p => p.value),
    borderColor: '#2f81f7',
    borderWidth: 2,
    tension: 0.25,
    pointRadius: props.base.map(p => (moveDir.value.has(p.date) ? 5 : 0)),
    pointHoverRadius: props.base.map(p => (moveDir.value.has(p.date) ? 7 : 0)),
    pointBackgroundColor: props.base.map(p => {
      const d = moveDir.value.get(p.date)
      return d === 'up' ? '#16c784' : d === 'down' ? '#ea3943' : '#2f81f7'
    }),
  }],
}))
const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { title: (items: any[]) => {
      const i = items[0]?.dataIndex ?? 0
      return moment(props.base[i]?.date).format('DD/MM/YYYY')
    } } },
  },
  onClick: (evt: any, _els: any, chart: any) => {
    const hit = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true)
    const i = hit?.[0]?.index
    const date = typeof i === 'number' ? props.base[i]?.date : undefined
    if (date && moveDir.value.has(date)) emit('select', date)
  },
  scales: { x: { ticks: { maxTicksLimit: 8 } } },
}))
```

Template: wrap the `<Line :data="chartData" :options="options" />` in a fixed-height div. (The page wraps the whole component in `<ClientOnly>`, so no SSR concern here.)

- [ ] **Step 2: Typecheck / lint**

Run: `cd app && npx eslint components/analysis/PriceMovesChart.vue`
Expected: clean (0 errors).

- [ ] **Step 3: Commit**

```bash
git add app/components/analysis/PriceMovesChart.vue
git commit -m "feat(analysis): PriceMovesChart with clickable move markers"
```

---

## Task 6: WhyTodayCard + MovesTimeline components

**Files:**
- Create: `app/components/analysis/WhyTodayCard.vue`
- Create: `app/components/analysis/MovesTimeline.vue`

**Interfaces:**
- `WhyTodayCard` props: `summary: TodaySummary` (from `todaySummary`, Task 2), `driverLabels: Record<string,string>`, `headlineCount: number`.
- `MovesTimeline` props: `moves: { date: string; pctChange: number; direction: 'up'|'down'|'flat' }[]`, `driverSeries: { key: string; points: {date:string; value:number}[] }[]`, `driverLabels: Record<string,string>`, `headlinesByDate: Record<string, { title: string; source: string; link: string }[]>`, `selectedDate: string | null`. Emits `select(date)`.

**Invoke the frontend-design skill** for visual polish.

- [ ] **Step 1: Implement `WhyTodayCard.vue`**

Behavior: hero card. If `summary.date === null` → show `t('porQueDolar.todayNoData')`. Else headline line by direction: `up`→`t('porQueDolar.todayUp', { pct })`, `down`→`t('porQueDolar.todayDown', { pct })`, `flat`→`t('porQueDolar.todayFlat')` where `pct = Math.abs(summary.pctChange).toFixed(2)`. If `summary.top`, show `t('porQueDolar.todayTopDriver', { driver: driverLabels[summary.top.key] ?? summary.top.key })` plus its reading via `t(readingKeyFor(summary.top.key, summary.top.r))`. Show `t('porQueDolar.todayHeadlines', { count: headlineCount })`. Colored chip/icon by direction (mirror `dolar-hoy.vue`'s `chipColor`/`chipIcon`).

```ts
import { readingKeyFor } from '~/utils/driverReadings'
import type { TodaySummary } from '~/utils/attribution'
const props = defineProps<{ summary: TodaySummary; driverLabels: Record<string,string>; headlineCount: number }>()
const { t } = useI18n()
const pct = computed(() => Math.abs(props.summary.pctChange).toFixed(2))
```

- [ ] **Step 2: Implement `MovesTimeline.vue`**

Behavior: title `t('porQueDolar.timelineTitle')`; list `moves` sorted by date desc. Each item: date (`moment(date).format('DD/MM/YYYY')`), signed pct + up/down color, then `t('porQueDolar.timelineAttribution')` followed by chips built from `attributeMove(date, driverSeries)` (top 3), each chip `${driverLabels[key] ?? key} ${dayMovePct>=0?'+':''}${dayMovePct.toFixed(1)}%`. Then headlines: `headlinesByDate[date]` if present (render title as external link + source), else `t('porQueDolar.timelineNoNews')`. The item matching `selectedDate` gets a highlighted style; clicking an item emits `select(date)`.

```ts
import { attributeMove } from '~/utils/attribution'
const props = defineProps<{
  moves: { date: string; pctChange: number; direction: 'up'|'down'|'flat' }[]
  driverSeries: { key: string; points: { date: string; value: number }[] }[]
  driverLabels: Record<string, string>
  headlinesByDate: Record<string, { title: string; source: string; link: string }[]>
  selectedDate: string | null
}>()
const emit = defineEmits<{ select: [date: string] }>()
const ordered = computed(() => [...props.moves].sort((a, b) => b.date.localeCompare(a.date)))
const attribution = (date: string) => attributeMove(date, props.driverSeries).slice(0, 3)
```

- [ ] **Step 3: Lint both**

Run: `cd app && npx eslint components/analysis/WhyTodayCard.vue components/analysis/MovesTimeline.vue`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/components/analysis/WhyTodayCard.vue app/components/analysis/MovesTimeline.vue
git commit -m "feat(analysis): WhyTodayCard + MovesTimeline components"
```

---

## Task 7: Page + wiring + e2e

**Files:**
- Create: `app/pages/por-que-sube-el-dolar.vue`
- Create: `app/tests/e2e/por-que-sube-el-dolar.spec.ts`

**Interfaces:**
- Consumes: all Task 4–6 components; `todaySummary` (Task 2); `/api/analysis/USD` + `/api/drivers`.

**Invoke the frontend-design skill** for page layout/composition.

- [ ] **Step 1: Implement the page**

Create `app/pages/por-que-sube-el-dolar.vue`. Required behavior:
- Two SSR fetches:
  ```ts
  const { data: analysis } = await useFetch('/api/analysis/USD')
  const { data: drivers } = await useFetch('/api/drivers')
  ```
- Derive:
  - `driverLabels = Object.fromEntries((drivers.value?.drivers ?? []).map(d => [d.key, d.label]))`
  - `driverSeriesArr = drivers.value?.series ?? []` (for chart attribution / timeline)
  - `driverSeriesValues = Object.fromEntries(driverSeriesArr.map(s => [s.key, s.points.slice(-30).map(p => p.value)]))` (sparkline values, last 30)
  - `summary = computed(() => todaySummary(analysis.value?.base ?? [], analysis.value?.correlations ?? []))`
  - `headlinesByDate` — from `analysis.value?.headlines`, keyed by today's `asOf` date only in v1 (past-day news arrives with the archive/backfill): `{ [analysis.value.asOf]: analysis.value.headlines }` when headlines exist.
- Shared state: `const selected = ref<string | null>(null)`; pass to `PriceMovesChart` (`@select="selected = $event"`) and `MovesTimeline` (`:selected-date="selected" @select="selected = $event"`).
- Layout (VContainer/VRow/VCol like `dolar-hoy.vue`): H1 hero (`porQueDolar.title`/`subtitle`) + `ShareButtons`; `WhyTodayCard`; `<ClientOnly>` wrapping `PriceMovesChart` (+ marker legend using `porQueDolar.markerUp`/`markerDown`); `DollarDriversPanel`; `MovesTimeline`; a methodology `<VCard>` (`methodologyTitle`/`methodologyBody`/`sources` with `{date: analysis.asOf}`/`disclaimer`). Cross-links to `/historico`, `/dolar-hoy`, `/noticias` via `NuxtLink`+`localePath`.
- SEO (copy the `dolar-hoy.vue` pattern exactly): `useSeoMeta` (title/description from `porQueDolar.metaTitle`/`metaDescription`), `defineOgImageComponent('Cambio', { title, subtitle, tag: 'ANÁLISIS' })`, `useHead` canonical `https://cambio-uruguay.com/por-que-sube-el-dolar` + JSON-LD `Article` (`headline`, `description`, `datePublished` from asOf) and a `Dataset` node.

- [ ] **Step 2: Write the e2e spec**

Create `app/tests/e2e/por-que-sube-el-dolar.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('/por-que-sube-el-dolar renders the analysis surface', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/por-que-sube-el-dolar')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // drivers panel title present (from i18n)
  await expect(page.getByText(/mueve al d[oó]lar|moves the dollar|move o d[oó]lar/i).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  // chart canvas mounted client-side
  await expect(page.locator('canvas').first()).toBeVisible()
  expect(errors).toEqual([])
})
```

- [ ] **Step 3: Run the e2e (and a full unit-suite sanity pass)**

Run: `cd app && npm run test:unit` → all pass (includes Task 1–2 specs).
Run: `cd app && npm run test:e2e -- por-que-sube-el-dolar` → 1 passed. (Cold run compiles Nuxt + hits live APIs; ~50–60s. If the live `/api/analysis/USD` is slow, the `networkidle` wait covers it. If the driver data is empty in the test env, the page must still render — assert accordingly.)

- [ ] **Step 4: Commit**

```bash
git add app/pages/por-que-sube-el-dolar.vue app/tests/e2e/por-que-sube-el-dolar.spec.ts
git commit -m "feat(analysis): /por-que-sube-el-dolar page + e2e"
```

---

## Self-Review

**Spec coverage:**
- WhyTodayCard (today move + top driver + headlines) → Task 6 + wired Task 7. ✓
- PriceMovesChart (markers + click) → Task 5. ✓
- DollarDriversPanel (|r| bars + sparkline + reading) → Task 4 (+ reuse existing `Sparkline`). ✓
- MovesTimeline (numeric attribution + news-when-present) → Task 6. ✓
- Pure utils attribution + readings (unit-tested) → Tasks 1–2. ✓
- i18n trilingual copy → Task 3. ✓
- Page orchestration + shared selected-move state → Task 7. ✓
- SEO (useSeoMeta/OG/JSON-LD/hreflang via layout/sitemap-auto) → Task 7. ✓
- Methodology/disclaimers/honesty → Task 3 copy + Task 7 section. ✓
- No backend change; consumes existing endpoints only → all tasks. ✓
- Out of scope (correctly absent): inline historico annotations (Phase 3), EUR/ARS (Phase 3), news backfill + AI narrative (Phase 4).

**Placeholder scan:** Utils + i18n + e2e carry full code. Component tasks (4–7) carry the real `<script setup>` logic + explicit behavior contracts + a frontend-design directive for markup polish — a deliberate altitude choice for view code (per the header note), not a logic placeholder. No TBD/TODO.

**Type consistency:** `readingKeyFor`/`strengthLabel` (Task 1) consumed in Tasks 4, 6. `attributeMove`/`todaySummary`/`TodaySummary`/`DriverDayMove` (Task 2) consumed in Tasks 6, 7. `porQueDolar.readings.<driver>.{pos,neg,weak}` keys (Task 3) exactly match `readingKeyFor` outputs. Component prop shapes (`correlations {key,r,n}`, `base {date,value}`, `moves {date,pctChange,direction}`, `series {key,points}`) match the documented `/api/analysis/USD` + `/api/drivers` payloads from Phase 1.

**Known execution note:** the `.vue` tasks rely on `npx nuxt typecheck` which is known to crash on unrelated files in this repo — the plan already falls back to `eslint` + signature check, consistent with Phase 1.
