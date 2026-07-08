import { extractGroundedHeadlines, isNoNewsText } from '../../utils/geminiGrounding'

export interface MoveNewsResult {
  headlines: { title: string; source: string; link: string }[]
  narrative: string | null
}

const DRIVER_CONTEXT: Record<string, string> = {
  USD: 'para USD, BCU y drivers globales (Fed, aranceles, geopolítica)',
  EUR: 'para EUR, BCE/eurozona además de los mismos drivers globales de USD (el EUR/UYU se ancla en BROU, no en BCU)',
  ARS: 'para ARS, BCRA/Argentina (bandas cambiarias, cepo, elecciones) además de efectos globales',
}

function buildPrompt(
  currency: string,
  date: string,
  pctChange: number,
  direction: 'up' | 'down' | 'flat',
  drivers: { key: string; dayMovePct: number }[]
): string {
  const verb = direction === 'down' ? 'bajó' : 'subió'
  const driverLines = drivers.length
    ? drivers
        .map(d => `${d.key} ${d.dayMovePct >= 0 ? '+' : ''}${d.dayMovePct.toFixed(2)}%`)
        .join(', ')
    : 'sin datos de drivers disponibles'
  const context = DRIVER_CONTEXT[currency] ?? DRIVER_CONTEXT.USD
  return (
    `El ${currency}/UYU ${verb} ${Math.abs(pctChange).toFixed(2)}% el ${date}. ` +
    `Ese día se movieron estos indicadores: ${driverLines}. ` +
    `Buscá noticias reales, fechadas ese día o +/-1 día, que puedan explicar este movimiento. ` +
    `Considerá: ${context}. ` +
    `Si no encontrás nada realmente relevante, respondé exactamente 'SIN NOTICIAS'. ` +
    `Si encontrás algo, escribí una explicación breve (2-3 frases, en español), ` +
    `basada solo en lo que encontraste — no inventes causas ni datos.`
  )
}

interface GeminiResponse {
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
 * Live grounded-search stand-in for the manual WebSearch backfill research:
 * asks Gemini (with Google Search grounding) for real, dated news explaining
 * a notable move, and returns real cited headlines + a grounded narrative.
 * Returns null on any failure, missing config, or a "nothing found" reply —
 * the caller falls back to the existing attribution-only path.
 */
export async function searchMoveNews(
  currency: string,
  date: string,
  pctChange: number,
  direction: 'up' | 'down' | 'flat',
  drivers: { key: string; dayMovePct: number }[]
): Promise<MoveNewsResult | null> {
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return null

  try {
    const res = await $fetch<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        query: { key: apiKey },
        body: {
          contents: [
            { parts: [{ text: buildPrompt(currency, date, pctChange, direction, drivers) }] },
          ],
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
    if (!text || isNoNewsText(text)) return null

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    const supports = candidate?.groundingMetadata?.groundingSupports ?? []
    const headlines = extractGroundedHeadlines(chunks, supports)
    if (headlines.length === 0) return null

    return { headlines, narrative: text }
  } catch {
    return null
  }
}
