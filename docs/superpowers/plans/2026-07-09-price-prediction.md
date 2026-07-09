# Price Prediction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily, per-currency AI directional-lean analysis + real external-forecast comparison to `/historico`, backed by a new Nitro cron task, Mongo model, and API endpoint.

**Architecture:** Mirrors the existing move-explanation pipeline (`server/utils/moveExplanation.ts` + `server/utils/geminiNews.ts` + `utils/geminiGrounding.ts`). A new daily scheduled task loops over every currency currently quoted somewhere in the live exchange-rate feed, computes recent price-change stats from the same `/evolution/:origin/:code/:type?` backend endpoint the per-casa history pages already use, asks Gemini (Google-Search-grounded) for a directional lean + reasoning, and — for USD/EUR/ARS/BRL only — separately asks Gemini to find real, citable published forecasts. Both results persist to one Mongo doc per `(currency, date)`. A cached API endpoint (`defineCachedEventHandler`, mirroring `server/api/analysis/[currency].get.ts`) serves the latest doc; a new Vue component renders it on `/historico` when exactly one currency is selected.

**Tech Stack:** Nuxt 3 / Nitro, Mongoose, Vitest, Gemini `generateContent` REST API (`gemini-2.5-flash` + `google_search` tool), Vue 3 / Vuetify.

## Global Constraints

- Never fabricate a specific future exchange-rate number — both the AI-analysis and external-forecast text must only report a directional lean/summary, never invent a numeric target.
- Every external forecast shown must carry a real `source` + `link` extracted from Gemini's `groundingChunks`/`groundingSupports` (via `extractGroundedHeadlines`) — never a bare paraphrase with no citation.
- `ai: null` and `externalForecasts: []` are valid, expected states — never logged or rendered as errors.
- Per-currency failures in the daily task must never block other currencies (try/catch per currency, same as `server/tasks/drivers/daily.ts`).
- No live Gemini/network calls in unit tests — only pure functions get unit tests; I/O-calling functions are verified manually via `asOfOverride`, matching the existing convention (`moveExplanation.ts`/`geminiNews.ts` have no unit tests either — only `geminiGrounding.ts`'s pure helpers do).
- Disclaimer copy must appear in all three site locales (es/en/pt) and must always be visible, non-dismissible, next to the prediction content.
- The AI-analysis section runs for every currency present in the live exchange-rate feed; the external-forecast section runs only for USD/EUR/ARS/BRL and simply renders nothing for other currencies.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/server/models/PricePrediction.ts` | Mongoose schema/model, one doc per `(currency, date)` |
| `app/server/utils/pricePrediction.ts` | Series-anchor resolution, period-change stats, AI-analysis prompt/call/parse, `recordTodayPrediction` orchestration |
| `app/server/utils/externalForecasts.ts` | External-forecast Gemini search + direction detection |
| `app/server/tasks/predictions/daily.ts` | Nitro scheduled task looping over all live currencies |
| `app/server/api/predictions/[currency].get.ts` | Cached read endpoint, latest doc ≤ today |
| `app/components/PricePredictionCard.vue` | Renders AI lean + external forecasts + disclaimer |
| `app/pages/historico/index.vue` | Modified: mount `PricePredictionCard` when exactly one currency selected |
| `app/i18n/locales/json/{es,en,pt}.json` | New `historical.prediction.*` keys |
| `app/tests/unit/pricePrediction.test.ts` | Unit tests for `computePeriodChanges` + `parseAiReply` |
| `app/tests/unit/externalForecasts.test.ts` | Unit tests for `detectDirection` + `isNoForecastText` |
| `app/nuxt.config.ts` | Modified: register `predictions:daily` cron entry |

---

### Task 1: `PricePrediction` Mongoose model

**Files:**
- Create: `app/server/models/PricePrediction.ts`

**Interfaces:**
- Produces: `PricePredictionDoc` interface and `PricePredictionModel` (Mongoose `Model<PricePredictionDoc>`), consumed by Task 3 (`pricePrediction.ts`) and Task 5 (API endpoint).

- [ ] **Step 1: Write the model**

```ts
import mongoose, { Schema, type Model } from 'mongoose'

export interface PricePredictionDoc {
  currency: string
  date: string // 'YYYY-MM-DD'
  ai: {
    lean: 'up' | 'down' | 'flat'
    confidence: 'low' | 'medium' | 'high'
    reasoning: string
    basedOn: { period: '7d' | '30d' | '90d'; pctChange: number }[]
  } | null
  externalForecasts: {
    source: string
    link: string
    direction: 'up' | 'down' | 'flat' | null
    summary: string
  }[]
}

const PricePredictionSchema = new Schema<PricePredictionDoc>(
  {
    currency: { type: String, required: true },
    date: { type: String, required: true },
    ai: {
      type: {
        _id: false,
        lean: { type: String, enum: ['up', 'down', 'flat'] },
        confidence: { type: String, enum: ['low', 'medium', 'high'] },
        reasoning: String,
        basedOn: {
          type: [{ _id: false, period: String, pctChange: Number }],
          default: [],
        },
      },
      default: null,
    },
    externalForecasts: {
      type: [
        {
          _id: false,
          source: String,
          link: String,
          direction: { type: String, enum: ['up', 'down', 'flat', null], default: null },
          summary: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

PricePredictionSchema.index({ currency: 1, date: 1 }, { unique: true })

export const PricePredictionModel: Model<PricePredictionDoc> =
  (mongoose.models.PricePrediction as Model<PricePredictionDoc>) ||
  mongoose.model<PricePredictionDoc>('PricePrediction', PricePredictionSchema)
```

- [ ] **Step 2: Verify it compiles/lints**

Run: `cd app && npm run lint -- --no-fix server/models/PricePrediction.ts`
Expected: no errors (this is a schema-only file; there is no dedicated test for `MoveExplanation.ts` either, so none is added here — parity with the existing model files).

- [ ] **Step 3: Commit**

```bash
git add app/server/models/PricePrediction.ts
git commit -m "feat(predictions): add PricePrediction model"
```

---

### Task 2: Pure helpers in `pricePrediction.ts` — period-change stats + AI-reply parsing

**Files:**
- Create: `app/server/utils/pricePrediction.ts` (this task only adds the pure, network-free pieces; Task 3 adds the I/O pieces to the same file)
- Test: `app/tests/unit/pricePrediction.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint` from `app/utils/rateStats.ts` (`{ date: string; value: number }`).
- Produces: `PeriodChange` (`{ period: '7d' | '30d' | '90d'; pctChange: number }`), `computePeriodChanges(series: SeriesPoint[]): PeriodChange[]`, `AiPredictionParsed` (`{ lean: 'up'|'down'|'flat'; confidence: 'low'|'medium'|'high'; reasoning: string }`), `parseAiReply(text: string): AiPredictionParsed | null` — both consumed by Task 3's `fetchAiAnalysis`/`recordTodayPrediction`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { computePeriodChanges, parseAiReply } from '../../server/utils/pricePrediction'

describe('computePeriodChanges', () => {
  it('computes 7d/30d/90d pct change from a 100-point daily series', () => {
    // index 0 = 100 days ago ... index 99 = latest (today)
    const series = Array.from({ length: 100 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      value: 40 + i * 0.1, // steadily rising, so pctChange should be positive for every window
    }))
    const changes = computePeriodChanges(series)
    expect(changes).toHaveLength(3)
    const byPeriod = Object.fromEntries(changes.map(c => [c.period, c.pctChange]))
    expect(byPeriod['7d']).toBeGreaterThan(0)
    expect(byPeriod['30d']).toBeGreaterThan(0)
    expect(byPeriod['90d']).toBeGreaterThan(0)
    // 90d window should show a larger cumulative pct change than the 7d window
    expect(byPeriod['90d']).toBeGreaterThan(byPeriod['7d']!)
  })

  it('returns empty array when series has fewer than 2 points', () => {
    expect(computePeriodChanges([])).toEqual([])
    expect(computePeriodChanges([{ date: '2026-01-01', value: 40 }])).toEqual([])
  })

  it('skips a period whose anchor point would be zero-valued', () => {
    const series = [
      { date: '2026-01-01', value: 0 },
      { date: '2026-01-02', value: 40 },
    ]
    const changes = computePeriodChanges(series)
    expect(changes.find(c => c.period === '7d')).toBeUndefined()
  })
})

describe('parseAiReply', () => {
  it('parses a well-formed reply into lean/confidence/reasoning', () => {
    const text =
      'LEAN: up\nCONFIANZA: media\nRAZONAMIENTO: El dólar mostró una tendencia alcista leve en la última semana, sin catalizadores fuertes.'
    const parsed = parseAiReply(text)
    expect(parsed).toEqual({
      lean: 'up',
      confidence: 'medium',
      reasoning:
        'El dólar mostró una tendencia alcista leve en la última semana, sin catalizadores fuertes.',
    })
  })

  it('is case-insensitive on the LEAN/CONFIANZA labels and values', () => {
    const text = 'lean: DOWN\nconfianza: ALTA\nrazonamiento: Presión bajista sostenida.'
    const parsed = parseAiReply(text)
    expect(parsed?.lean).toBe('down')
    expect(parsed?.confidence).toBe('high')
  })

  it('returns null when a required field is missing', () => {
    expect(parseAiReply('LEAN: up\nRAZONAMIENTO: algo')).toBeNull()
    expect(parseAiReply('')).toBeNull()
  })

  it('returns null when the reasoning is empty', () => {
    expect(parseAiReply('LEAN: up\nCONFIANZA: baja\nRAZONAMIENTO:   ')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/pricePrediction.test.ts`
Expected: FAIL — `Cannot find module '../../server/utils/pricePrediction'` (file doesn't exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `app/server/utils/pricePrediction.ts` with exactly this content for now (Task 3 appends the I/O functions to this same file — do not create a second file):

```ts
import type { SeriesPoint } from '../../utils/rateStats'

export interface PeriodChange {
  period: '7d' | '30d' | '90d'
  pctChange: number
}

/**
 * Approximate N-day-ago lookup by array index (one point ≈ one day, matching
 * how every other historico series in this app is already treated — see
 * `fetchCanonicalSeries`'s `period: 60` query). Not a calendar-exact lookup.
 */
export function computePeriodChanges(series: SeriesPoint[]): PeriodChange[] {
  if (series.length < 2) return []
  const latest = series[series.length - 1]!.value
  const windows: { period: PeriodChange['period']; days: number }[] = [
    { period: '7d', days: 7 },
    { period: '30d', days: 30 },
    { period: '90d', days: 90 },
  ]
  const out: PeriodChange[] = []
  for (const { period, days } of windows) {
    const idx = Math.max(0, series.length - 1 - days)
    const anchor = series[idx]
    if (!anchor || anchor.value === 0) continue
    const pctChange = Number((((latest - anchor.value) / anchor.value) * 100).toFixed(2))
    out.push({ period, pctChange })
  }
  return out
}

export interface AiPredictionParsed {
  lean: 'up' | 'down' | 'flat'
  confidence: 'low' | 'medium' | 'high'
  reasoning: string
}

const CONFIDENCE_MAP: Record<string, AiPredictionParsed['confidence']> = {
  alta: 'high',
  media: 'medium',
  baja: 'low',
}

/** Parses the fixed LEAN/CONFIANZA/RAZONAMIENTO reply format from `buildAiPrompt`. */
export function parseAiReply(text: string): AiPredictionParsed | null {
  const leanMatch = /LEAN:\s*(up|down|flat)/i.exec(text)
  const confMatch = /CONFIANZA:\s*(alta|media|baja)/i.exec(text)
  const reasonMatch = /RAZONAMIENTO:\s*([\s\S]+)/i.exec(text)
  if (!leanMatch || !confMatch || !reasonMatch) return null
  const reasoning = reasonMatch[1]!.trim()
  if (!reasoning) return null
  return {
    lean: leanMatch[1]!.toLowerCase() as AiPredictionParsed['lean'],
    confidence: CONFIDENCE_MAP[confMatch[1]!.toLowerCase()]!,
    reasoning,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/pricePrediction.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/pricePrediction.ts app/tests/unit/pricePrediction.test.ts
git commit -m "feat(predictions): add period-change stats and AI-reply parsing"
```

---

### Task 3: I/O functions in `pricePrediction.ts` — anchor resolution, series fetch, AI call, orchestration

**Files:**
- Modify: `app/server/utils/pricePrediction.ts` (append to the file created in Task 2)

**Interfaces:**
- Consumes: `PeriodChange`, `parseAiReply`, `AiPredictionParsed` (Task 2, same file); `PricePredictionModel` (Task 1); `extractGroundedHeadlines` is NOT used here (that's Task 4's `externalForecasts.ts`); `toSeries` from `app/utils/dollarSeries.ts`; `montevideoToday` from `app/utils/blog.ts`; `connectDb` from `app/server/utils/db.ts`.
- Produces: `resolveAnchor(currency: string): Promise<{ origin: string; code: string; type: string } | null>`, `listActiveCurrencies(): Promise<string[]>`, `recordTodayPrediction(currency: string, asOfOverride?: string): Promise<{ recorded: boolean; date: string }>` — `listActiveCurrencies` and `recordTodayPrediction` are consumed by Task 5's daily task; `searchExternalForecasts` (Task 4) is consumed here inside `recordTodayPrediction`.

No unit test for this step (per Global Constraints — I/O-calling functions are manually verified, matching `moveExplanation.ts`/`geminiNews.ts` convention). Manual verification is Step 3 below.

- [ ] **Step 1: Append the I/O implementation**

Append to `app/server/utils/pricePrediction.ts`:

```ts
import { connectDb } from './db'
import { PricePredictionModel } from '../models/PricePrediction'
import { toSeries } from '../../utils/dollarSeries'
import { montevideoToday } from '../../utils/blog'
import { searchExternalForecasts } from './externalForecasts'

// Phase 1 canonical anchors — same feeds analysis.ts already trusts for
// USD/EUR/ARS. Any other currency falls back to whichever origin currently
// quotes it live (resolveAnchor below), which is lower-quality but the only
// option for currencies with no dedicated backend feed.
const CANONICAL: Record<string, { origin: string; code: string; type: string }> = {
  USD: { origin: 'bcu', code: 'USD', type: 'BILLETE' },
  EUR: { origin: 'brou', code: 'EUR', type: '' },
  ARS: { origin: 'bcu', code: 'ARS', type: 'BILLETE' },
}

interface LiveRateItem {
  origin?: string
  code?: string
  type?: string
}

async function fetchLiveRates(): Promise<LiveRateItem[]> {
  const base = useRuntimeConfig().apiBaseServer
  const items = await $fetch<LiveRateItem[]>('/', { baseURL: base }).catch(() => [])
  return Array.isArray(items) ? items : []
}

/** Canonical anchor for USD/EUR/ARS, else whichever live origin quotes this currency. */
export async function resolveAnchor(
  currency: string
): Promise<{ origin: string; code: string; type: string } | null> {
  const canonical = CANONICAL[currency]
  if (canonical) return canonical

  const items = await fetchLiveRates()
  const match = items.find(i => i.code === currency && i.origin)
  if (!match?.origin) return null
  return { origin: match.origin, code: currency, type: match.type ?? '' }
}

/** Every currency code currently quoted by at least one exchange house. */
export async function listActiveCurrencies(): Promise<string[]> {
  const items = await fetchLiveRates()
  const codes = new Set<string>()
  for (const item of items) {
    if (item.code) codes.add(item.code)
  }
  return [...codes].sort()
}

async function fetchRecentSeries(currency: string) {
  const anchor = await resolveAnchor(currency)
  if (!anchor) return []
  const base = useRuntimeConfig().apiBaseServer
  const path = anchor.type
    ? `/evolution/${anchor.origin}/${anchor.code}/${anchor.type}`
    : `/evolution/${anchor.origin}/${anchor.code}`
  const res = await $fetch<{ evolution?: { date?: string; buy?: number; sell?: number }[] }>(
    path,
    { baseURL: base, query: { period: 100 } }
  ).catch(() => null)
  return toSeries(res?.evolution, 'sell').map(p => ({ date: p.date.slice(0, 10), value: p.value }))
}

const CURRENCY_CONTEXT: Record<string, string> = {
  USD: 'BCU y drivers globales (Fed, aranceles, geopolítica)',
  EUR: 'BCE/eurozona además de los mismos drivers globales de USD',
  ARS: 'BCRA/Argentina (bandas cambiarias, cepo, elecciones) además de efectos globales',
  BRL: 'BCB/Brasil (Selic, fiscal) además de efectos globales',
}
const DEFAULT_CONTEXT =
  'drivers macroeconómicos globales (Fed, mercados emergentes, comercio internacional)'

function buildAiPrompt(currency: string, changes: PeriodChange[]): string {
  const changeLines = changes.length
    ? changes.map(c => `${c.period}: ${c.pctChange >= 0 ? '+' : ''}${c.pctChange}%`).join(', ')
    : 'sin datos suficientes de variación reciente'
  const context = CURRENCY_CONTEXT[currency] ?? DEFAULT_CONTEXT
  return (
    `Sos un analista cambiario. El tipo de cambio ${currency}/UYU tuvo esta variación reciente: ${changeLines}. ` +
    `Considerá: ${context}. Buscá noticias y contexto reciente (últimos 7 días) relevante para este par. ` +
    `Respondé EXACTAMENTE en este formato, sin texto adicional:\n` +
    `LEAN: up|down|flat\n` +
    `CONFIANZA: alta|media|baja\n` +
    `RAZONAMIENTO: <2 a 4 frases en español, basadas solo en los datos y noticias reales que encontraste>\n` +
    `No inventes un valor futuro exacto del tipo de cambio. Aclará que el mercado es impredecible y esto no es asesoramiento financiero.`
  )
}

interface GeminiTextResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

async function fetchAiAnalysis(
  currency: string,
  changes: PeriodChange[]
): Promise<AiPredictionParsed | null> {
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return null
  try {
    const res = await $fetch<GeminiTextResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: {
          contents: [{ parts: [{ text: buildAiPrompt(currency, changes) }] }],
          tools: [{ google_search: {} }],
        },
        timeout: 30000,
      }
    )
    const text = (res.candidates?.[0]?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('')
      .trim()
    return text ? parseAiReply(text) : null
  } catch {
    return null
  }
}

/**
 * Upserts today's (or `asOfOverride`'s) PricePrediction doc for `currency`:
 * AI directional-lean analysis (all currencies) + external forecast
 * comparison (USD/EUR/ARS/BRL only, empty array otherwise). Each half fails
 * independently — one Gemini call failing never blocks the other. Idempotent.
 */
export async function recordTodayPrediction(
  currency: string,
  asOfOverride?: string
): Promise<{ recorded: boolean; date: string }> {
  await connectDb()
  const asOf = asOfOverride ?? montevideoToday()

  const series = await fetchRecentSeries(currency)
  const changes = computePeriodChanges(series)

  const [aiParsed, externalForecasts] = await Promise.all([
    fetchAiAnalysis(currency, changes).catch(() => null),
    searchExternalForecasts(currency).catch(() => []),
  ])

  const ai = aiParsed
    ? {
        lean: aiParsed.lean,
        confidence: aiParsed.confidence,
        reasoning: aiParsed.reasoning,
        basedOn: changes,
      }
    : null

  await PricePredictionModel.updateOne(
    { currency, date: asOf },
    { $set: { ai, externalForecasts } },
    { upsert: true }
  )
  return { recorded: true, date: asOf }
}
```

- [ ] **Step 2: Run the full unit-test file to confirm nothing broke**

Run: `cd app && npx vitest run tests/unit/pricePrediction.test.ts`
Expected: PASS (same 9 tests as Task 2 — this step adds no new unit tests, only I/O code covered by manual verification).

- [ ] **Step 3: Manual verification against a real currency**

This mirrors how `recordTodayExplanation`'s `asOfOverride` param is manually verified (no unit test either). Requires `GEMINI_API_KEY` configured locally and a reachable Mongo + backend API.

Create a throwaway script `app/scripts/verify-prediction.ts`:

```ts
import { recordTodayPrediction } from '../server/utils/pricePrediction'

const currency = process.argv[2] || 'USD'
recordTodayPrediction(currency)
  .then(r => {
    console.log(JSON.stringify(r, null, 2))
    process.exit(0)
  })
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
```

Run: `cd app && npx tsx scripts/verify-prediction.ts USD`
Expected: prints `{ "recorded": true, "date": "<today>" }`. Then check Mongo (`PricePredictionModel.findOne({ currency: 'USD' })`) or a quick `mongosh` query to confirm the `ai` block has a real `lean`/`confidence`/`reasoning` and `externalForecasts` is an array (possibly empty — both are acceptable).

Delete the throwaway script once verified — it's a manual-check tool, not part of the shipped codebase:

```bash
rm app/scripts/verify-prediction.ts
```

- [ ] **Step 4: Commit**

```bash
git add app/server/utils/pricePrediction.ts
git commit -m "feat(predictions): add AI directional-lean analysis + recordTodayPrediction"
```

---

### Task 4: External forecast search (`externalForecasts.ts`)

**Files:**
- Create: `app/server/utils/externalForecasts.ts`
- Test: `app/tests/unit/externalForecasts.test.ts`

**Interfaces:**
- Consumes: `extractGroundedHeadlines` from `app/utils/geminiGrounding.ts` (`(chunks, supports, limit?) => { title, source, link }[]`).
- Produces: `ExternalForecast` (`{ source: string; link: string; direction: 'up'|'down'|'flat'|null; summary: string }`), `searchExternalForecasts(currency: string): Promise<ExternalForecast[]>` — consumed by Task 3's `recordTodayPrediction`. Also exports `detectDirection` and `isNoForecastText` for unit testing.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { detectDirection, isNoForecastText } from '../../server/utils/externalForecasts'

describe('detectDirection', () => {
  it('detects an upward lean from Spanish alza/suba wording', () => {
    expect(detectDirection('El banco proyecta una suba del dólar hacia fin de año.')).toBe('up')
    expect(detectDirection('Se espera una fuerte alza en los próximos meses.')).toBe('up')
  })

  it('detects a downward lean from Spanish baja/caída wording', () => {
    expect(detectDirection('La consultora anticipa una baja moderada.')).toBe('down')
    expect(detectDirection('Proyectan una caída del tipo de cambio.')).toBe('down')
  })

  it('detects a flat lean from estable/sin cambios wording', () => {
    expect(detectDirection('El pronóstico lo ve estable en el corto plazo.')).toBe('flat')
  })

  it('returns null when no directional wording is present', () => {
    expect(detectDirection('El BCU publicó su informe mensual de política monetaria.')).toBeNull()
  })
})

describe('isNoForecastText', () => {
  it('is true for an exact or prefixed SIN PRONOSTICOS reply, case-insensitive, with or without accent', () => {
    expect(isNoForecastText('SIN PRONOSTICOS')).toBe(true)
    expect(isNoForecastText('sin pronosticos')).toBe(true)
    expect(isNoForecastText('Sin pronósticos disponibles.')).toBe(true)
  })

  it('is false for a real forecast summary', () => {
    expect(isNoForecastText('El banco X proyecta una suba del 3% para el dólar.')).toBe(false)
    expect(isNoForecastText('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/externalForecasts.test.ts`
Expected: FAIL — `Cannot find module '../../server/utils/externalForecasts'`.

- [ ] **Step 3: Write the implementation**

```ts
import { extractGroundedHeadlines } from '../../utils/geminiGrounding'

export interface ExternalForecast {
  source: string
  link: string
  direction: 'up' | 'down' | 'flat' | null
  summary: string
}

const FORECAST_CURRENCIES = new Set(['USD', 'EUR', 'ARS', 'BRL'])

/** True when Gemini's text reply signals no real citable forecast was found. */
export function isNoForecastText(text: string): boolean {
  return /^\s*sin\s+pron[oó]sticos/i.test(text)
}

/** Best-effort directional read of a Spanish forecast summary. Order matters:
 *  check flat/estable before alza/baja substrings could false-match inside it. */
export function detectDirection(summary: string): ExternalForecast['direction'] {
  const s = summary.toLowerCase()
  if (/(estable|sin cambios|lateral)/.test(s)) return 'flat'
  if (/(alza|suba|subir|aumento|apreciar)/.test(s)) return 'up'
  if (/(baja|bajar|caída|caida|depreciar|descenso)/.test(s)) return 'down'
  return null
}

function buildForecastPrompt(currency: string): string {
  return (
    `Buscá pronósticos publicados en los últimos 30 días sobre el tipo de cambio ${currency}/UYU ` +
    `(o ${currency}/USD si no encontrás uno específico de UYU), de fuentes citables y con nombre ` +
    `(bancos, consultoras, analistas, encuestas oficiales como la Encuesta de Expectativas del BCU). ` +
    `Si no encontrás ninguna fuente real y citable, respondé exactamente 'SIN PRONOSTICOS'. ` +
    `Si encontrás alguna, resumí cada una en 1-2 frases en español, indicando la fuente y si el ` +
    `pronóstico es al alza, a la baja o estable.`
  )
}

interface GeminiGroundedResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>
      groundingSupports?: Array<{
        segment: { text: string; startIndex?: number; endIndex: number }
        groundingChunkIndices: number[]
      }>
    }
  }>
}

/**
 * Gemini-grounded search for real, attributable, recently-published forecasts
 * for `currency` vs UYU. Only runs for USD/EUR/ARS/BRL — no one publishes
 * forecasts for most other currencies vs UYU, so other currencies always get
 * an empty array (a valid state, not an error). Returns [] on any failure,
 * missing config, or a "nothing found" reply.
 */
export async function searchExternalForecasts(currency: string): Promise<ExternalForecast[]> {
  if (!FORECAST_CURRENCIES.has(currency)) return []
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return []

  try {
    const res = await $fetch<GeminiGroundedResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: {
          contents: [{ parts: [{ text: buildForecastPrompt(currency) }] }],
          tools: [{ google_search: {} }],
        },
        timeout: 30000,
      }
    )
    const candidate = res.candidates?.[0]
    const text = (candidate?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('')
      .trim()
    if (!text || isNoForecastText(text)) return []

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    const supports = candidate?.groundingMetadata?.groundingSupports ?? []
    const headlines = extractGroundedHeadlines(chunks, supports, 5)
    if (headlines.length === 0) return []

    return headlines.map(h => ({
      source: h.source,
      link: h.link,
      direction: detectDirection(h.title),
      summary: h.title,
    }))
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/externalForecasts.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/externalForecasts.ts app/tests/unit/externalForecasts.test.ts
git commit -m "feat(predictions): add external-forecast Gemini search"
```

---

### Task 5: Nitro daily scheduled task + cron registration

**Files:**
- Create: `app/server/tasks/predictions/daily.ts`
- Modify: `app/nuxt.config.ts:278-293` (the `scheduledTasks` block)

**Interfaces:**
- Consumes: `listActiveCurrencies`, `recordTodayPrediction` (Task 3).

- [ ] **Step 1: Write the task**

```ts
// Nitro scheduled task: record today's AI directional-lean analysis + external
// forecast comparison for every currency currently quoted live. Registered in
// nuxt.config under `nitro.scheduledTasks`, runs after `drivers:daily` so the
// price series it reads from is already fresh. Idempotent.
import { listActiveCurrencies, recordTodayPrediction } from '../../utils/pricePrediction'

export default defineTask({
  meta: {
    name: 'predictions:daily',
    description:
      "Record today's AI price-lean analysis + external forecast comparison per currency",
  },
  async run() {
    const currencies = await listActiveCurrencies()
    const results: Record<string, { recorded: boolean; date: string }> = {}
    const errors: Record<string, string> = {}
    for (const currency of currencies) {
      try {
        results[currency] = await recordTodayPrediction(currency)
      } catch (e) {
        errors[currency] = String((e as Error)?.message ?? e)
      }
    }
    return { result: { results, errors } }
  },
})
```

- [ ] **Step 2: Register the cron entry**

In `app/nuxt.config.ts`, find the `scheduledTasks` block (around line 278):

```ts
    scheduledTasks: {
      // 09:15 UTC ≈ 06:15 Uruguay: refresh macro-driver snapshots + archive daily news.
      '15 9 * * *': ['drivers:daily'],
```

Add a new entry immediately after the `drivers:daily` line so predictions run after drivers/news are fresh:

```ts
    scheduledTasks: {
      // 09:15 UTC ≈ 06:15 Uruguay: refresh macro-driver snapshots + archive daily news.
      '15 9 * * *': ['drivers:daily'],
      // 09:20 UTC ≈ 06:20 Uruguay: record AI price-lean + external forecasts per currency.
      '20 9 * * *': ['predictions:daily'],
```

- [ ] **Step 3: Verify the task registers without errors**

Run: `cd app && npm run build`
Expected: build succeeds; no Nitro warning about an unregistered/misnamed task (Nitro validates `scheduledTasks` names against discovered `defineTask` files at build time).

- [ ] **Step 4: Commit**

```bash
git add app/server/tasks/predictions/daily.ts app/nuxt.config.ts
git commit -m "feat(predictions): add predictions:daily scheduled task"
```

---

### Task 6: API endpoint

**Files:**
- Create: `app/server/api/predictions/[currency].get.ts`

**Interfaces:**
- Consumes: `PricePredictionModel` (Task 1), `connectDb` (`app/server/utils/db.ts`).
- Produces: `GET /api/predictions/:currency` → `PricePredictionDoc | null` JSON, consumed by Task 8's `PricePredictionCard.vue`.

- [ ] **Step 1: Write the endpoint**

```ts
// Latest PricePrediction doc (date <= today) for a currency — absorbs a
// missed/failed cron day instead of 404ing, mirroring server/api/analysis/[currency].get.ts.
import { connectDb } from '../../utils/db'
import { PricePredictionModel } from '../../models/PricePrediction'
import { montevideoToday } from '../../../utils/blog'

export default defineCachedEventHandler(
  async event => {
    await connectDb()
    const raw = getRouterParam(event, 'currency') ?? ''
    const currency = raw.toUpperCase()
    if (!currency) {
      throw createError({ statusCode: 400, statusMessage: 'Missing currency' })
    }
    const doc = await PricePredictionModel.findOne({
      currency,
      date: { $lte: montevideoToday() },
    })
      .sort({ date: -1 })
      .lean()
    return doc ?? null
  },
  {
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 6,
    name: 'predictions',
    getKey: event => (getRouterParam(event, 'currency') ?? '').toUpperCase(),
  }
)
```

- [ ] **Step 2: Verify it lints/builds**

Run: `cd app && npm run lint -- --no-fix server/api/predictions/[currency].get.ts`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

After Task 3's manual verification has produced at least one real `PricePrediction` doc, run the dev server and hit the endpoint:

Run: `cd app && npm run dev` (in one terminal), then in another: `curl http://localhost:3000/api/predictions/USD`
Expected: JSON body with `currency`, `date`, `ai`, `externalForecasts` fields (or `null` if no doc exists yet for USD — in which case re-run Task 3's manual verification script first).

- [ ] **Step 4: Commit**

```bash
git add "app/server/api/predictions/[currency].get.ts"
git commit -m "feat(predictions): add /api/predictions/:currency endpoint"
```

---

### Task 7: i18n keys (es/en/pt)

**Files:**
- Modify: `app/i18n/locales/json/es.json`
- Modify: `app/i18n/locales/json/en.json`
- Modify: `app/i18n/locales/json/pt.json`

**Interfaces:**
- Produces: `historical.prediction.*` translation keys consumed by Task 8's `PricePredictionCard.vue` via `$t('historical.prediction.<key>')`.

- [ ] **Step 1: Add keys to `es.json`**

In `app/i18n/locales/json/es.json`, inside the existing `"historical": { ... }` object (around line 546), add a nested `"prediction"` key:

```json
    "prediction": {
      "title": "Análisis de tendencia (IA)",
      "disclaimer": "Esto no es asesoramiento financiero. El tipo de cambio flota libremente y ningún análisis, ni siquiera este, puede predecirlo con certeza.",
      "leanUp": "Tendencia al alza",
      "leanDown": "Tendencia a la baja",
      "leanFlat": "Sin tendencia clara",
      "confidenceHigh": "Confianza alta",
      "confidenceMedium": "Confianza media",
      "confidenceLow": "Confianza baja",
      "basedOn": "Basado en la variación de los últimos {period}",
      "externalForecasts": "Pronósticos publicados por otras fuentes",
      "noAiAnalysis": "No hay análisis de IA disponible hoy para esta moneda.",
      "noExternalForecasts": "No se encontraron pronósticos publicados recientes para esta moneda.",
      "selectOneCurrency": "Seleccioná una sola moneda para ver el análisis de tendencia."
    }
```

- [ ] **Step 2: Add the equivalent keys to `en.json`**

In `app/i18n/locales/json/en.json`, inside `"historical": { ... }`:

```json
    "prediction": {
      "title": "Trend Analysis (AI)",
      "disclaimer": "This is not financial advice. The exchange rate floats freely and no analysis, including this one, can predict it with certainty.",
      "leanUp": "Upward trend",
      "leanDown": "Downward trend",
      "leanFlat": "No clear trend",
      "confidenceHigh": "High confidence",
      "confidenceMedium": "Medium confidence",
      "confidenceLow": "Low confidence",
      "basedOn": "Based on the change over the last {period}",
      "externalForecasts": "Forecasts published by other sources",
      "noAiAnalysis": "No AI analysis available today for this currency.",
      "noExternalForecasts": "No recent published forecasts found for this currency.",
      "selectOneCurrency": "Select a single currency to see the trend analysis."
    }
```

- [ ] **Step 3: Add the equivalent keys to `pt.json`**

In `app/i18n/locales/json/pt.json`, inside `"historical": { ... }`:

```json
    "prediction": {
      "title": "Análise de tendência (IA)",
      "disclaimer": "Isto não é aconselhamento financeiro. A taxa de câmbio flutua livremente e nenhuma análise, incluindo esta, pode prevê-la com certeza.",
      "leanUp": "Tendência de alta",
      "leanDown": "Tendência de baixa",
      "leanFlat": "Sem tendência clara",
      "confidenceHigh": "Confiança alta",
      "confidenceMedium": "Confiança média",
      "confidenceLow": "Confiança baixa",
      "basedOn": "Baseado na variação dos últimos {period}",
      "externalForecasts": "Previsões publicadas por outras fontes",
      "noAiAnalysis": "Nenhuma análise de IA disponível hoje para esta moeda.",
      "noExternalForecasts": "Nenhuma previsão publicada recente encontrada para esta moeda.",
      "selectOneCurrency": "Selecione uma única moeda para ver a análise de tendência."
    }
```

- [ ] **Step 4: Verify JSON is valid and lint passes**

Run: `cd app && node -e "JSON.parse(require('fs').readFileSync('i18n/locales/json/es.json','utf8')); JSON.parse(require('fs').readFileSync('i18n/locales/json/en.json','utf8')); JSON.parse(require('fs').readFileSync('i18n/locales/json/pt.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 5: Commit**

```bash
git add app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(predictions): add trilingual i18n keys for prediction section"
```

---

### Task 8: `PricePredictionCard` component + wire into `/historico`

**Files:**
- Create: `app/components/PricePredictionCard.vue`
- Modify: `app/pages/historico/index.vue`

**Interfaces:**
- Consumes: `GET /api/predictions/:currency` (Task 6), i18n keys from Task 7.
- Produces: `<PricePredictionCard :currency="..." />` component, mounted from `historico/index.vue`.

- [ ] **Step 1: Write the component**

```vue
<template>
  <v-card class="price-prediction-card" elevation="4">
    <v-card-title class="d-flex align-center ga-2">
      <v-icon color="primary">mdi-creation</v-icon>
      {{ t('historical.prediction.title') }}
    </v-card-title>
    <v-card-text>
      <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
        {{ t('historical.prediction.disclaimer') }}
      </v-alert>

      <div v-if="pending" class="text-center py-6">
        <v-progress-circular indeterminate color="primary" size="40" />
      </div>

      <template v-else>
        <div v-if="data?.ai" class="mb-4">
          <div class="d-flex align-center ga-2 mb-2 flex-wrap">
            <v-chip :color="leanColor" variant="tonal">
              <v-icon start size="small">{{ leanIcon }}</v-icon>
              {{ t(`historical.prediction.lean${leanLabelSuffix}`) }}
            </v-chip>
            <v-chip variant="outlined" size="small">
              {{ t(`historical.prediction.confidence${confidenceLabelSuffix}`) }}
            </v-chip>
          </div>
          <p class="text-body-2">{{ data.ai.reasoning }}</p>
          <p v-if="data.ai.basedOn?.length" class="text-caption text-grey mt-1">
            {{
              t('historical.prediction.basedOn', {
                period: data.ai.basedOn.map(b => b.period).join('/'),
              })
            }}
          </p>
        </div>
        <p v-else class="text-body-2 text-grey mb-4">
          {{ t('historical.prediction.noAiAnalysis') }}
        </p>

        <div v-if="data?.externalForecasts?.length">
          <p class="text-subtitle-2 mb-2">{{ t('historical.prediction.externalForecasts') }}</p>
          <v-list density="compact" class="bg-transparent">
            <v-list-item
              v-for="(forecast, idx) in data.externalForecasts"
              :key="idx"
              :href="forecast.link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <template #prepend>
                <v-icon
                  size="small"
                  :color="
                    forecast.direction === 'up'
                      ? 'success'
                      : forecast.direction === 'down'
                        ? 'error'
                        : 'grey'
                  "
                >
                  {{
                    forecast.direction === 'up'
                      ? 'mdi-trending-up'
                      : forecast.direction === 'down'
                        ? 'mdi-trending-down'
                        : 'mdi-trending-neutral'
                  }}
                </v-icon>
              </template>
              <v-list-item-title class="text-body-2">{{ forecast.summary }}</v-list-item-title>
              <v-list-item-subtitle>{{ forecast.source }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface PricePredictionResponse {
  currency: string
  date: string
  ai: {
    lean: 'up' | 'down' | 'flat'
    confidence: 'low' | 'medium' | 'high'
    reasoning: string
    basedOn: { period: string; pctChange: number }[]
  } | null
  externalForecasts: {
    source: string
    link: string
    direction: 'up' | 'down' | 'flat' | null
    summary: string
  }[]
}

const props = defineProps<{ currency: string }>()
const { t } = useI18n()

const { data, pending } = await useFetch<PricePredictionResponse | null>(
  () => `/api/predictions/${props.currency}`,
  { key: () => `price-prediction-${props.currency}` }
)

const leanLabelSuffix = computed(() => {
  const lean = data.value?.ai?.lean
  return lean === 'up' ? 'Up' : lean === 'down' ? 'Down' : 'Flat'
})
const confidenceLabelSuffix = computed(() => {
  const confidence = data.value?.ai?.confidence
  return confidence === 'high' ? 'High' : confidence === 'low' ? 'Low' : 'Medium'
})
const leanColor = computed(() => {
  const lean = data.value?.ai?.lean
  return lean === 'up' ? 'success' : lean === 'down' ? 'error' : 'grey'
})
const leanIcon = computed(() => {
  const lean = data.value?.ai?.lean
  return lean === 'up' ? 'mdi-trending-up' : lean === 'down' ? 'mdi-trending-down' : 'mdi-trending-neutral'
})
</script>

<style scoped>
.price-prediction-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.v-theme--light .price-prediction-card {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.1);
}
</style>
```

- [ ] **Step 2: Wire it into `/historico`**

In `app/pages/historico/index.vue`, add a computed for the single-selected-currency case near the other filter computeds (after `typeOptions`, around line 420):

```ts
const singleSelectedCurrency = computed(() =>
  selectedCurrency.value.length === 1 ? selectedCurrency.value[0] : null
)
```

Then in the `<template>`, the whole page is one outer `<v-row><v-col cols="12"><v-card>...</v-card></v-col></v-row>` block that closes at lines 183-185 (`</v-card>`, `</v-col>`, `</v-row>`), immediately before the file's closing `</template>` (line 187). Add the new block as a sibling `<v-row>` right after that closing `</v-row>` (line 185) and before `</template>`:

```html
    <v-row v-if="singleSelectedCurrency" class="mt-4">
      <v-col cols="12">
        <PricePredictionCard :currency="singleSelectedCurrency" />
      </v-col>
    </v-row>
    <v-row v-else-if="selectedCurrency.length > 1" class="mt-4">
      <v-col cols="12">
        <v-alert type="info" variant="tonal">
          {{ $t('historical.prediction.selectOneCurrency') }}
        </v-alert>
      </v-col>
    </v-row>
```

(No explicit import needed — `PricePredictionCard.vue` is auto-registered by Nuxt's component auto-import from `app/components/`, same as every other component used in this file.)

- [ ] **Step 3: Manual browser verification**

Run: `cd app && npm run dev`, open `http://localhost:3000/historico`, select exactly one currency (e.g. USD) in the currency filter.
Expected: the prediction card appears below the filters, showing either a real lean/reasoning (if Task 3's manual verification already produced a USD doc) or the "no hay análisis disponible hoy" fallback text — never a JS error in the browser console. Selecting a second currency should replace the card with the "select a single currency" info alert. Clearing the filter should hide both.

- [ ] **Step 4: Run lint**

Run: `cd app && npm run lint`
Expected: no new errors introduced by these two files.

- [ ] **Step 5: Commit**

```bash
git add app/components/PricePredictionCard.vue app/pages/historico/index.vue
git commit -m "feat(predictions): render AI trend analysis + external forecasts on /historico"
```

---

## Post-implementation notes

- The `docs/superpowers/specs/2026-07-09-price-prediction-design.md` spec's open questions are resolved as follows: (1) UX for 0/>1 selected currencies — handled in Task 8 Step 2 (hidden / info-alert respectively); (2) structured output vs free-text parsing — this plan uses free-text with a fixed-format instruction + regex parsing (`parseAiReply`), consistent with the existing `geminiNews.ts` pattern and avoiding an unverified dependency on Gemini JSON mode; (3) trilingual disclaimer copy — drafted in Task 7.
- `EUR`'s existing anchor (`brou`, empty `type`) intentionally omits the `/type` URL segment — `resolveAnchor`/`fetchRecentSeries` preserve that exact behavior from `analysis.ts`'s `fetchCanonicalSeries`.
