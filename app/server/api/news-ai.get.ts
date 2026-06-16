// AI pulse: a short summary of recent dollar/economy news + a trend prediction,
// grounded in the current BCU rate and the live casa-de-cambio market.
// Reuses the existing backend AI endpoint (/ai/insights, type=custom) so the API
// key, caching and validation already configured on the API are reused as-is.
import { fetchNews } from '../utils/news'

interface Rate {
  origin: string
  code: string
  type?: string
  buy: number
  sell: number
}

const LANGS = ['es', 'en', 'pt']

const INSTR: Record<string, string> = {
  es: `Con esa información, responde en español y en Markdown conciso:
1. **Resumen** (2-3 frases) de lo que dicen las noticias sobre el dólar y la economía uruguaya.
2. **Tendencia del dólar** para los próximos días: indica 📈 Alcista, 📉 Bajista o ➡️ Estable, con una justificación breve basada en las noticias y los datos.
Cierra con una línea en cursiva aclarando que es un análisis informativo, no asesoramiento financiero.`,
  en: `With that information, respond in English in concise Markdown:
1. **Summary** (2-3 sentences) of what the news says about the US dollar and the Uruguayan economy.
2. **Dollar trend** for the coming days: state 📈 Bullish, 📉 Bearish or ➡️ Stable, with a brief justification based on the news and the data.
End with an italic line clarifying this is informational analysis, not financial advice.`,
  pt: `Com essas informações, responda em português em Markdown conciso:
1. **Resumo** (2-3 frases) do que as notícias dizem sobre o dólar e a economia uruguaia.
2. **Tendência do dólar** para os próximos dias: indique 📈 Alta, 📉 Baixa ou ➡️ Estável, com uma justificativa breve baseada nas notícias e nos dados.
Encerre com uma linha em itálico esclarecendo que é uma análise informativa, não aconselhamento financeiro.`,
}

function cleanInsight(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*\w+GPT\s*:\s*/i, '')
    .trim()
}

async function buildInsight(lang: string): Promise<{ insight: string | null; asOf: string }> {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  const [news, rates] = await Promise.all([
    fetchNews(8).catch(() => []),
    $fetch<Rate[]>('/', { baseURL: apiBase }).catch(() => [] as Rate[]),
  ])

  // BCU reference + live market for USD
  const bcu = rates.find(r => r.origin === 'bcu' && r.code === 'USD' && r.buy > 0)
  const usdMarket = rates.filter(
    r => r.code === 'USD' && (!r.type || r.type === '') && r.origin !== 'bcu' && r.sell > 0
  )
  const bestSell = usdMarket.length ? Math.min(...usdMarket.map(r => r.sell)) : 0 // cheapest to buy USD
  const bestBuy = usdMarket.length ? Math.max(...usdMarket.map(r => r.buy)) : 0 // pays most for your USD
  const avgSell = usdMarket.length
    ? usdMarket.reduce((s, r) => s + r.sell, 0) / usdMarket.length
    : 0

  const headlines = news
    .slice(0, 8)
    .map((n, i) => `${i + 1}. ${n.title} (${n.source})`)
    .join('\n')

  const rateLines = [
    bcu ? `Cotización oficial BCU (USD billete): compra ${bcu.buy}, venta ${bcu.sell}.` : '',
    usdMarket.length
      ? `Mercado de casas de cambio (USD) hoy: mejor venta (más barato para comprar) ${bestSell.toFixed(2)}, mejor compra (te pagan más al vender) ${bestBuy.toFixed(2)}, promedio venta ${avgSell.toFixed(2)}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (!headlines && !rateLines) return { insight: null, asOf: new Date().toISOString() }

  const customPrompt = `Titulares recientes sobre el dólar y la economía de Uruguay:
${headlines || '(sin titulares disponibles)'}

Datos de mercado actuales:
${rateLines || '(sin datos de cotización)'}

${INSTR[lang] || INSTR.es}`

  try {
    const res = await $fetch<{ insight?: string }>('/ai/insights', {
      baseURL: apiBase,
      method: 'POST',
      body: { type: 'custom', language: lang, customPrompt },
      timeout: 60000,
    })
    const insight = res?.insight ? cleanInsight(res.insight) : null
    return {
      insight: insight && insight.length > 30 ? insight : null,
      asOf: new Date().toISOString(),
    }
  } catch {
    return { insight: null, asOf: new Date().toISOString() }
  }
}

export default defineCachedEventHandler(
  async event => {
    const q = getQuery(event)
    let lang = String(q.lang || 'es').slice(0, 2)
    if (!LANGS.includes(lang)) lang = 'es'
    return buildInsight(lang)
  },
  {
    maxAge: 60 * 120, // regenerate every 2h
    staleMaxAge: 60 * 60 * 12,
    name: 'news-ai-uy',
    getKey: event => 'pulse-' + String(getQuery(event).lang || 'es').slice(0, 2),
  }
)
