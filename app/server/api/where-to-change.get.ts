// AI-assisted "¿Dónde cambiar?" recommendation: a short natural-language note on
// WHERE to buy/sell a currency, grounded in the live casa-de-cambio market and
// the deterministic ranking (utils/recommendation.ts).
//
// Reuses the existing backend AI endpoint (/ai/insights, type=custom) so the API
// key, caching and validation already configured on the API are reused as-is.
// The deterministic ranking is the reliable core (rendered client-side); this
// route only adds the optional prose. It fails gracefully ({ recommendation: null }).
import type { ExchangeRate } from '../../types/api'
import { rankExchanges, type Operation } from '../../utils/recommendation'

const LANGS = ['es', 'en', 'pt'] as const
type Lang = (typeof LANGS)[number]

const INSTR: Record<Lang, (currency: string, op: Operation) => string> = {
  es: (currency, op) =>
    `El usuario quiere ${op === 'buy' ? 'COMPRAR' : 'VENDER'} ${currency} en Uruguay. Responde en español, en Markdown breve (máximo 4 frases). Recomienda en qué casa de cambio le conviene y por qué (mejor cotización, ahorro frente al promedio, spread/condiciones si aplica). Empieza con "Te conviene cambiar en …". Cierra con una línea en cursiva aclarando que es información orientativa, no asesoramiento financiero.`,
  en: (currency, op) =>
    `The user wants to ${op === 'buy' ? 'BUY' : 'SELL'} ${currency} in Uruguay. Respond in English, in short Markdown (max 4 sentences). Recommend which exchange house is best and why (best rate, savings vs the average, spread/conditions if relevant). Start with "Your best option is …". End with an italic line clarifying this is informational, not financial advice.`,
  pt: (currency, op) =>
    `O usuário quer ${op === 'buy' ? 'COMPRAR' : 'VENDER'} ${currency} no Uruguai. Responda em português, em Markdown curto (no máximo 4 frases). Recomende qual casa de câmbio é a melhor e por quê (melhor cotação, economia frente à média, spread/condições se aplicável). Comece com "Sua melhor opção é …". Encerre com uma linha em itálico esclarecendo que é informativo, não aconselhamento financeiro.`,
}

function cleanRecommendation(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*\w+GPT\s*:\s*/i, '')
    .trim()
}

function normalizeLang(raw: unknown): Lang {
  const lang = String(raw ?? 'es').slice(0, 2)
  return (LANGS as readonly string[]).includes(lang) ? (lang as Lang) : 'es'
}

function normalizeOp(raw: unknown): Operation {
  return String(raw ?? 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy'
}

async function buildRecommendation(
  currency: string,
  op: Operation,
  lang: Lang
): Promise<{ recommendation: string | null }> {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  const rates = await $fetch<ExchangeRate[]>('/', { baseURL: apiBase }).catch(
    () => [] as ExchangeRate[]
  )

  // Plain/cash quotes only (skip interbank/cable rows) for a fair house
  // comparison. `!r.type` already covers the empty-string ("plain") quote type.
  const market = rates.filter(r => r.code === currency && !r.type && r.origin !== 'bcu')

  // Deterministic ranking grounds the prompt; amount=1 keeps the prose generic.
  const { ranked, marketAverage } = rankExchanges(market, currency, op, 1)
  if (ranked.length < 2) return { recommendation: null }

  const top = ranked.slice(0, 5)
  const rateLines = top
    .map(
      (h, i) =>
        `${i + 1}. ${h.name}: ${op === 'buy' ? 'venta' : 'compra'} ${h.rate.toFixed(2)} UYU` +
        (h.savingsVsAvg > 0 ? ` (ahorro ${h.savingsVsAvg.toFixed(2)} UYU/unidad vs promedio)` : '')
    )
    .join('\n')

  const customPrompt = `Mercado actual de casas de cambio para ${op === 'buy' ? 'comprar' : 'vender'} ${currency} en Uruguay (mejor primero), promedio del mercado ${marketAverage.toFixed(2)} UYU:
${rateLines}

${INSTR[lang](currency, op)}`

  try {
    const res = await $fetch<{ insight?: string }>('/ai/insights', {
      baseURL: apiBase,
      method: 'POST',
      body: { type: 'custom', language: lang, customPrompt },
      timeout: 60000,
    })
    const recommendation = res?.insight ? cleanRecommendation(res.insight) : null
    return { recommendation: recommendation && recommendation.length > 30 ? recommendation : null }
  } catch {
    return { recommendation: null }
  }
}

export default defineCachedEventHandler(
  async event => {
    const q = getQuery(event)
    const currency = String(q.currency ?? 'USD')
      .toUpperCase()
      .slice(0, 5)
    const op = normalizeOp(q.op)
    const lang = normalizeLang(q.lang)
    return buildRecommendation(currency, op, lang)
  },
  {
    maxAge: 60 * 45, // regenerate every 45 min
    staleMaxAge: 60 * 60 * 4, // serve stale up to 4h while revalidating
    name: 'where-to-change-uy',
    getKey: event => {
      const q = getQuery(event)
      const currency = String(q.currency ?? 'USD')
        .toUpperCase()
        .slice(0, 5)
      const op = normalizeOp(q.op)
      const lang = normalizeLang(q.lang)
      return `wtc-${currency}-${op}-${lang}`
    },
  }
)
