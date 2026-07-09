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
  return /^\s*sin\s+pron(?:o|ó)sticos/i.test(text)
}

/** Best-effort directional read of a Spanish forecast summary. Order matters:
 *  check flat/estable before alza/baja substrings could false-match inside it. */
export function detectDirection(summary: string): ExternalForecast['direction'] {
  const s = summary.toLowerCase()
  if (/estable|sin cambios|lateral/.test(s)) return 'flat'
  if (/alza|suba|subir|aumento|apreciar/.test(s)) return 'up'
  if (/bajar|descenso|depreciar|caída|baja/.test(s)) return 'down'
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
