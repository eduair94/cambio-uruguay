// Daily Gemini-grounded TEA lookup for lenders with no regex parser (loanScraper.ts only covers
// oca/pronto/cash). Same endpoint/pattern as geminiNews.ts: google_search grounding, graceful null
// on any failure. Additionally requires the grounding citation's hostname to match the lender's own
// domain, so an unrelated page's rate can never be attributed to this lender.
import { extractGroundedHeadlines } from '../../utils/geminiGrounding'
import { TEA_MAX, TEA_MIN, toNum } from './loanScraper'

export interface GeminiRateResult {
  teaPct: number
  sourceUrl: string
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

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

function buildPrompt(lender: { name: string; website: string }): string {
  return (
    `Buscá la Tasa Efectiva Anual (TEA) actual publicada para un préstamo personal/de consumo de ` +
    `"${lender.name}" en Uruguay (sitio ${lender.website}). ` +
    `Respondé en una sola línea, exactamente en este formato: "TEA: <numero>%". ` +
    `Usá solo un número que hayas encontrado en una búsqueda real y citable, en el propio sitio del ` +
    `prestamista o una fuente que lo confirme — no inventes. ` +
    `Si no encontrás una TEA publicada y verificable, respondé exactamente "TEA: NO ENCONTRADO".`
  )
}

/**
 * Grounded Gemini lookup for one lender's advertised TEA. Returns null on missing config, any
 * network/parse failure, an implausible value, or a citation that doesn't match the lender's own
 * domain — the caller (loanRateRefresh.ts) keeps the prior stored value in every null case.
 */
export async function fetchLenderRateFromGemini(lender: {
  id: string
  name: string
  website: string
  source: string
}): Promise<GeminiRateResult | null> {
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return null

  try {
    const res = await $fetch<GeminiResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: {
          contents: [{ parts: [{ text: buildPrompt(lender) }] }],
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
    const match = text.match(/TEA:\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%/i)
    if (!match) return null

    const teaPct = toNum(match[1]!)
    if (!Number.isFinite(teaPct) || teaPct < TEA_MIN || teaPct > TEA_MAX) return null

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    const supports = candidate?.groundingMetadata?.groundingSupports ?? []
    if (chunks.length === 0) return null
    const headlines = extractGroundedHeadlines(chunks, supports, chunks.length)

    const expectedHosts = [hostnameOf(lender.website), hostnameOf(lender.source)].filter(Boolean)
    const cited = headlines.find(h => expectedHosts.includes(h.source.toLowerCase()))
    if (!cited) return null

    return { teaPct, sourceUrl: cited.link }
  } catch {
    return null
  }
}
