import type { SeriesPoint } from '../../utils/rateStats'
import { connectDb } from './db'
import { PricePredictionModel } from '../models/PricePrediction'
import { toSeries } from '../../utils/dollarSeries'
import { montevideoToday } from '../../utils/blog'
import { searchExternalForecasts } from './externalForecasts'

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

// UI (Unidad Indexada) and UR (Unidad Reajustable) ride the same live feed as
// tradeable currencies but are inflation/legal-adjustment units, not
// currencies with a real buy/sell market vs UYU (see app/utils/indicators.ts).
// An AI directional lean for them is meaningless and wastes a daily Gemini call.
const NON_TRADEABLE_CODES = new Set(['UI', 'UR'])

/** Whether `code` represents a real tradeable currency (or metal) vs UYU. */
export function isPredictableCurrencyCode(code: string): boolean {
  return !NON_TRADEABLE_CODES.has(code)
}

/** Every currency code currently quoted by at least one exchange house. */
export async function listActiveCurrencies(): Promise<string[]> {
  const items = await fetchLiveRates()
  const codes = new Set<string>()
  for (const item of items) {
    if (item.code && isPredictableCurrencyCode(item.code)) codes.add(item.code)
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
  const res = await $fetch<{ evolution?: { date?: string; buy?: number; sell?: number }[] }>(path, {
    baseURL: base,
    query: { period: 100 },
  }).catch(() => null)
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
