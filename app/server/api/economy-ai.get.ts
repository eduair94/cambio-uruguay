// AI economy briefing: a grounded read of the day's Uruguay economy headlines
// (inflation, jobs, companies, BCU, trade, fiscal) + the live BCU dollar
// reference. Reuses the backend AI endpoint (/ai/insights, type=custom) so the
// API key, caching and sanitizing configured there are reused as-is — same
// pattern as `/api/news-ai`, but broader than the dollar pulse.
import { fetchEconomyNews, ECONOMY_TOPICS, type EconomyTopic } from '../utils/economyNews'

interface Rate {
  origin: string
  code: string
  type?: string
  buy: number
  sell: number
}

const LANGS = ['es', 'en', 'pt']

const INSTR: Record<string, string> = {
  es: `Con esos titulares y datos, escribí en español y en Markdown conciso un informe de coyuntura económica de Uruguay:
1. **Panorama** (3-4 frases) con lo más importante que dicen las noticias sobre la economía uruguaya.
2. **Temas clave**: 3-5 viñetas, cada una sobre un área relevante (inflación, empleo y salarios, empresas, Banco Central, comercio exterior o fiscal), solo las que tengan noticias.
3. **Qué mirar**: 2-3 viñetas con implicancias prácticas para el bolsillo de una persona en Uruguay.
No inventes cifras: usá solo los titulares y los datos provistos. Cerrá con una línea en cursiva aclarando que es un análisis informativo, no asesoramiento financiero.`,
  en: `With those headlines and data, write in English in concise Markdown a briefing on Uruguay's economy:
1. **Overview** (3-4 sentences) of the most important things the news says about Uruguay's economy.
2. **Key themes**: 3-5 bullets, each on a relevant area (inflation, jobs and wages, companies, the central bank, foreign trade or fiscal), only those with news.
3. **What to watch**: 2-3 bullets with practical implications for a person in Uruguay.
Do not invent figures: use only the provided headlines and data. End with an italic line clarifying this is informational analysis, not financial advice.`,
  pt: `Com essas manchetes e dados, escreva em português em Markdown conciso um resumo da conjuntura econômica do Uruguai:
1. **Panorama** (3-4 frases) com o mais importante que as notícias dizem sobre a economia uruguaia.
2. **Temas-chave**: 3-5 tópicos, cada um sobre uma área relevante (inflação, emprego e salários, empresas, banco central, comércio exterior ou fiscal), apenas as que tiverem notícias.
3. **O que observar**: 2-3 tópicos com implicações práticas para o bolso de uma pessoa no Uruguai.
Não invente números: use apenas as manchetes e os dados fornecidos. Encerre com uma linha em itálico esclarecendo que é uma análise informativa, não aconselhamento financeiro.`,
}

const TOPIC_LABEL: Record<EconomyTopic, string> = {
  inflacion: 'Inflación',
  empleo: 'Empleo y salarios',
  empresas: 'Empresas',
  bcu: 'Banco Central',
  comercio_exterior: 'Comercio exterior',
  fiscal: 'Fiscal e impuestos',
}

function cleanInsight(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*\w+GPT\s*:\s*/i, '')
    .trim()
}

async function buildBriefing(lang: string): Promise<{ insight: string | null; asOf: string }> {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  const [news, rates] = await Promise.all([
    fetchEconomyNews(5).catch(() => []),
    $fetch<Rate[]>('/', { baseURL: apiBase }).catch(() => [] as Rate[]),
  ])

  // Group headlines by topic (in canonical order) for a structured prompt.
  const byTopic = new Map<EconomyTopic, string[]>()
  for (const t of ECONOMY_TOPICS) byTopic.set(t.id, [])
  for (const n of news) byTopic.get(n.topic)?.push(`- ${n.title} (${n.source})`)

  const headlineBlocks = ECONOMY_TOPICS.map(t => {
    const lines = byTopic.get(t.id) ?? []
    if (!lines.length) return ''
    return `${TOPIC_LABEL[t.id]}:\n${lines.slice(0, 5).join('\n')}`
  })
    .filter(Boolean)
    .join('\n\n')

  const bcu = rates.find(r => r.origin === 'bcu' && r.code === 'USD' && r.buy > 0)
  const rateLine = bcu
    ? `Cotización oficial BCU (USD billete): compra ${bcu.buy}, venta ${bcu.sell}.`
    : ''

  if (!headlineBlocks) return { insight: null, asOf: new Date().toISOString() }

  const customPrompt = `Titulares recientes sobre la economía de Uruguay, por área:
${headlineBlocks}

${rateLine ? `Dato de mercado actual:\n${rateLine}\n` : ''}
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
    return buildBriefing(lang)
  },
  {
    maxAge: 60 * 120, // regenerate every 2h
    staleMaxAge: 60 * 60 * 12,
    name: 'economy-ai-uy',
    getKey: event => 'briefing-' + String(getQuery(event).lang || 'es').slice(0, 2),
  }
)
