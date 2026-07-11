// Live, grounded "recent news + AI analysis" for each Uruguayan bank / fintech in
// the tier list (/mejores-bancos-uruguay). Same engine as `geminiNews.ts`: Gemini
// 2.5 Flash with Google Search grounding finds REAL, dated, cited headlines and
// writes a short grounded read; then one non-grounded synthesis pass turns the
// collected headlines into a sector analysis. Everything is null-safe: no API key,
// a timeout or a "nothing found" reply just yields an empty/partial briefing and
// the page degrades gracefully.
import {
  extractGroundedHeadlines,
  isNoNewsText,
  type GroundedHeadline,
} from '../../utils/geminiGrounding'
import { BANKS, KIND_LABELS } from '../../utils/bankTierlist'

export interface BankNewsItem {
  id: string
  name: string
  /** Grounded 2-3 sentence read, or null when nothing relevant was found. */
  insight: string | null
  headlines: GroundedHeadline[]
}

export interface BanksBriefing {
  /** Only entities with something real to show. */
  items: BankNewsItem[]
  /** Markdown sector analysis synthesised from the found headlines, or null. */
  analysis: string | null
  asOf: string
  /** True when the AI backend is unavailable (no key) — lets the UI explain itself. */
  unavailable: boolean
}

const LANG_NAME: Record<string, string> = { es: 'español', en: 'English', pt: 'português' }

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

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

function candidateText(res: GeminiResponse): string {
  return (res.candidates?.[0]?.content?.parts ?? [])
    .map(p => p.text ?? '')
    .join('')
    .trim()
}

/** Run `fn` over `items` with at most `n` in flight. Order of results matches input. */
async function mapPool<T, R>(
  items: T[],
  n: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const out = Array.from({ length: items.length }) as R[]
  let cursor = 0
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      out[i] = await fn(items[i]!, i)
    }
  })
  await Promise.all(workers)
  return out
}

async function fetchEntityNews(
  apiKey: string,
  name: string,
  kindLabel: string,
  langName: string
): Promise<{ insight: string | null; headlines: GroundedHeadline[] }> {
  const prompt =
    `Sos un analista financiero. Buscá noticias reales y recientes (últimos 12 meses, priorizá lo más nuevo) ` +
    `sobre "${name}", ${kindLabel.toLowerCase()} de Uruguay. Interesan especialmente: cambios de comisiones o tarifas, ` +
    `mejoras o problemas serios de la app, fusiones/compras/ventas, multas o sanciones del Banco Central (BCU), ` +
    `lanzamientos de productos y reputación o reclamos de clientes. ` +
    `Si NO encontrás nada realmente relevante y reciente, respondé exactamente "SIN NOTICIAS". ` +
    `Si encontrás algo, escribí en ${langName} un resumen muy breve (1-2 frases, máximo ~40 palabras) ` +
    `de la novedad más importante y qué significa para un cliente en Uruguay. Directo y concreto, sin relleno. ` +
    `Basate solo en lo que encontraste; no inventes datos ni cifras.`

  try {
    const res = await $fetch<GeminiResponse>(GEMINI_URL, {
      method: 'POST',
      query: { key: apiKey },
      body: { contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] },
      timeout: 28000,
    })
    const text = candidateText(res)
    if (!text || isNoNewsText(text)) return { insight: null, headlines: [] }
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
    const supports = res.candidates?.[0]?.groundingMetadata?.groundingSupports ?? []
    return { insight: text, headlines: extractGroundedHeadlines(chunks, supports, 3) }
  } catch {
    return { insight: null, headlines: [] }
  }
}

async function synthesise(
  apiKey: string,
  items: BankNewsItem[],
  langName: string
): Promise<string | null> {
  const blocks = items
    .filter(it => it.insight)
    .map(it => {
      const heads = it.headlines.map(h => `  - ${h.title} (${h.source})`).join('\n')
      return `${it.name}: ${it.insight}${heads ? `\n${heads}` : ''}`
    })
    .join('\n\n')
  if (!blocks) return null

  const prompt =
    `Novedades recientes sobre bancos y fintech de Uruguay:\n\n${blocks}\n\n` +
    `Con SOLO esa información, escribí en ${langName}, en Markdown conciso, un análisis del sector ` +
    `(un párrafo de 3-4 frases y luego 2-3 viñetas): la tensión entre bancos tradicionales y fintech, ` +
    `quién gana y quién pierde terreno, y qué implica en la práctica para el usuario en Uruguay. ` +
    `No inventes cifras: usá solo estos titulares. Cerrá con una línea en cursiva aclarando que es ` +
    `un análisis informativo, no asesoramiento financiero.`

  try {
    const res = await $fetch<GeminiResponse>(GEMINI_URL, {
      method: 'POST',
      query: { key: apiKey },
      body: { contents: [{ parts: [{ text: prompt }] }] },
      timeout: 30000,
    })
    const text = candidateText(res)
    return text.length > 40 ? text : null
  } catch {
    return null
  }
}

/**
 * Build the full briefing for a language. Runs one grounded search per entity
 * (bounded concurrency) then one synthesis pass over what was found.
 */
export async function buildBanksBriefing(lang: string): Promise<BanksBriefing> {
  const langName = LANG_NAME[lang] ?? LANG_NAME.es!
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  const asOf = new Date().toISOString()

  if (!apiKey) return { items: [], analysis: null, asOf, unavailable: true }

  const raw = await mapPool(BANKS as unknown as (typeof BANKS)[number][], 4, entity =>
    fetchEntityNews(apiKey, entity.name, KIND_LABELS[entity.kind], langName)
  )

  const items: BankNewsItem[] = BANKS.map((entity, i) => ({
    id: entity.id,
    name: entity.name,
    insight: raw[i]!.insight,
    headlines: raw[i]!.headlines,
  })).filter(it => it.insight || it.headlines.length)

  // Synthesise the sector analysis from the FULL insights (better context)...
  const analysis = await synthesise(apiKey, items, langName)
  // ...then trim each per-entity insight so the cards stay scannable even expanded.
  for (const it of items) if (it.insight) it.insight = trimInsight(it.insight)

  return { items, analysis, asOf, unavailable: false }
}

/** Bound an insight to a readable length: cut on a sentence boundary near `maxChars`. */
function trimInsight(text: string, maxChars = 700): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxChars) return clean
  const slice = clean.slice(0, maxChars)
  const lastStop = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('! ')
  )
  if (lastStop > maxChars * 0.5) return slice.slice(0, lastStop + 1).trim()
  return slice.replace(/\s+\S*$/, '').trim() + '…'
}
