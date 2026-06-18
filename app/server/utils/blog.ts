// Server-only generator + store for the AI daily blog. Runs in Nitro: fetches
// per-category news headlines + the live BCU/market rate, asks the configured
// backend AI (POST /ai/insights, the same uncensored provider used by the news
// pulse) for a grounded article, sanitizes it, and persists it to durable Nitro
// storage (`blog` mount) so each day adds new posts and history is kept.
//
// Pure metadata + slug helpers live in `~/utils/blog`; this module adds the
// server-only feeds, prompts, AI call and persistence.
import {
  blogSlug,
  montevideoToday,
  parseBlogSlug,
  type BlogCategory,
  type BlogPost,
  type BlogPostSummary,
} from '../../utils/blog'
import { fetchNewsFrom, type NewsItem } from './news'
import { generateChat } from './ai'

/** System prompt for the blog articles (Spanish analyst, no LaTeX). */
const BLOG_SYSTEM_PROMPT = `Sos un analista financiero experto en el mercado cambiario de Uruguay. Escribís artículos de blog claros, útiles y bien estructurados en español, en formato Markdown, con un tono informativo y accesible.
No uses notación matemática LaTeX ni comandos con barra invertida (nada de $$...$$, \\frac, \\text, \\times, \\%). Escribí montos y porcentajes en texto plano (ej: 5,68%, $41,20, 206.000 UYU).
No inventes cifras ni cotizaciones: usá solo los titulares y los datos de mercado provistos. Completá siempre las secciones que empieces y sé conciso.`

/** Per-category server config: which feeds to read and how to instruct the AI. */
interface CategorySource {
  feeds: string[]
  /** Article-writing instructions appended after the data block. */
  instructions: string
}

const SOURCES: Record<BlogCategory, CategorySource> = {
  'dolar-global': {
    feeds: [
      'https://news.google.com/rss/search?q=US+dollar+OR+%22Federal+Reserve%22+OR+inflation+OR+%22interest+rates%22&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=%22dollar+index%22+OR+forex+OR+%22global+economy%22+OR+treasury+yields&hl=en-US&gl=US&ceid=US:en',
    ],
    instructions: `Escribí un artículo de blog en español (público de Uruguay) que resuma lo más importante de estos titulares del mundo y explique cómo pueden afectar al dólar estadounidense y, por extensión, a quienes en Uruguay tienen, compran o venden dólares.
Estructura en Markdown:
- Una introducción de 2-3 frases.
- 2 o 3 secciones con subtítulo "## ".
- Una sección final "## Qué mirar" con 2-3 puntos.
No inventes cifras ni cotizaciones: basate solo en los titulares y en los datos de mercado provistos. Sé claro y conciso.`,
  },
  'dolar-uruguay': {
    feeds: [
      'https://news.google.com/rss/search?q=cotizaci%C3%B3n+d%C3%B3lar+Uruguay&hl=es-419&gl=UY&ceid=UY:es',
      'https://news.google.com/rss/search?q=econom%C3%ADa+Uruguay+OR+inflaci%C3%B3n+Uruguay+OR+BCU&hl=es-419&gl=UY&ceid=UY:es',
    ],
    instructions: `Escribí un artículo de blog en español (público de Uruguay) que resuma lo más importante de estos titulares locales y explique cómo pueden afectar al peso uruguayo y a la cotización del dólar en Uruguay.
Estructura en Markdown:
- Una introducción de 2-3 frases.
- 2 o 3 secciones con subtítulo "## ".
- Una sección final "## Qué mirar" con 2-3 puntos.
No inventes cifras ni cotizaciones: basate solo en los titulares y en los datos de mercado provistos. Sé claro y conciso.`,
  },
}

const STORAGE = 'blog'
const INDEX_KEY = 'index'

interface Rate {
  origin: string
  code: string
  type?: string
  buy: number
  sell: number
}

/** Strip provider leakage (think-blocks, "WormGPT:" prefix) as a safety net. */
function clean(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .replace(/^\s*(?:\*+\s*)?\w*GPT\s*:\s*/i, '')
    .trim()
}

/** Build a one-line USD market grounding string from live rates. */
function rateContext(rates: Rate[]): string {
  const bcu = rates.find(r => r.origin === 'bcu' && r.code === 'USD' && r.buy > 0)
  const usd = rates.filter(
    r => r.code === 'USD' && (!r.type || r.type === '') && r.origin !== 'bcu' && r.sell > 0
  )
  const bestSell = usd.length ? Math.min(...usd.map(r => r.sell)) : 0
  const bestBuy = usd.length ? Math.max(...usd.map(r => r.buy)) : 0
  return [
    bcu ? `Cotización oficial BCU (USD billete): compra ${bcu.buy}, venta ${bcu.sell}.` : '',
    usd.length
      ? `Mercado de casas de cambio (USD) hoy: mejor venta ${bestSell.toFixed(2)}, mejor compra ${bestBuy.toFixed(2)}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Parse the model output into {title, summary, body}. Falls back gracefully. */
function parseArticle(
  raw: string,
  category: BlogCategory,
  date: string
): Pick<BlogPost, 'title' | 'summary' | 'body'> {
  const text = clean(raw)
  const titleMatch = text.match(/^[ \t]*(?:#+[ \t]*)?T[IÍ]TULO[ \t]*:(.+)$/im)
  const summaryMatch = text.match(/^[ \t]*(?:#+[ \t]*)?RESUMEN[ \t]*:(.+)$/im)

  let body = text
  // Drop the TITULO/RESUMEN header lines and an optional leading "---" divider.
  body = body
    .replace(/^\s*(?:#+\s*)?T[IÍ]TULO\s*:.*$/im, '')
    .replace(/^\s*(?:#+\s*)?RESUMEN\s*:.*$/im, '')
    .replace(/^\s*-{3,}\s*$/m, '')
    .trim()

  const fallbackTitle =
    category === 'dolar-global'
      ? `El dólar en el mundo: análisis del ${date}`
      : `El dólar en Uruguay: análisis del ${date}`
  const title = (titleMatch?.[1] || fallbackTitle).trim().slice(0, 140)
  const summary = (
    summaryMatch?.[1] ||
    body
      .replace(/[#*_>`-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180)
  ).trim()
  return { title, summary, body }
}

/** Read the post index (newest first), or [] when empty/unavailable. */
export async function listPosts(limit?: number): Promise<BlogPostSummary[]> {
  const store = useStorage(STORAGE)
  const index = ((await store.getItem<BlogPostSummary[]>(INDEX_KEY)) || []).filter(Boolean)
  index.sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : a.category.localeCompare(b.category)
  )
  return typeof limit === 'number' ? index.slice(0, limit) : index
}

/** Read a single post by slug, or null. */
export async function getPost(slug: string): Promise<BlogPost | null> {
  if (!parseBlogSlug(slug)) return null
  const store = useStorage(STORAGE)
  return (await store.getItem<BlogPost>(`posts:${slug}`)) || null
}

async function savePost(post: BlogPost): Promise<void> {
  const store = useStorage(STORAGE)
  await store.setItem(`posts:${post.slug}`, post)
  const index = (await store.getItem<BlogPostSummary[]>(INDEX_KEY)) || []
  const summary: BlogPostSummary = {
    slug: post.slug,
    date: post.date,
    category: post.category,
    title: post.title,
    summary: post.summary,
    createdAt: post.createdAt,
  }
  const next = index.filter(p => p.slug !== post.slug)
  next.push(summary)
  await store.setItem(INDEX_KEY, next)
}

// Best-effort in-process lock so concurrent requests don't double-generate.
const inFlight = new Set<string>()

/**
 * Generate (or return the existing) post for a category + date. Idempotent:
 * if the post already exists it is returned untouched. Only generates when the
 * AI returns usable content; never fabricates rates.
 */
export async function generatePost(
  category: BlogCategory,
  date: string = montevideoToday()
): Promise<BlogPost | null> {
  const slug = blogSlug(date, category)
  const existing = await getPost(slug)
  if (existing) return existing
  if (inFlight.has(slug)) return null
  inFlight.add(slug)

  try {
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase as string
    const source = SOURCES[category]

    const [news, rates] = await Promise.all([
      fetchNewsFrom(source.feeds, 8).catch(() => [] as NewsItem[]),
      $fetch<Rate[]>('/', { baseURL: apiBase }).catch(() => [] as Rate[]),
    ])

    const headlines = news.slice(0, 8)
    if (headlines.length === 0) return null // nothing to ground the article on

    const headlineList = headlines.map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join('\n')
    const rateLines = rateContext(rates)

    const dataBlock = `Fecha: ${date}.
Titulares recientes:
${headlineList}

Datos de mercado actuales:
${rateLines || '(sin datos de cotización)'}

${source.instructions}

Devolvé la respuesta EXACTAMENTE en este formato:
TITULO: <un título atractivo de hasta 12 palabras>
RESUMEN: <una sola frase que resuma el artículo>
---
<cuerpo del artículo en Markdown>

Cerrá el cuerpo con una línea en cursiva aclarando que es un análisis informativo, no asesoramiento financiero.`

    // Prefer a direct call to the latest wormgpt model; fall back to the backend
    // /ai/insights (which reuses the configured key + cache) when this app has
    // no AI credentials of its own.
    let raw = ''
    let usedModel: string | undefined
    const direct = await generateChat({ system: BLOG_SYSTEM_PROMPT, user: dataBlock })
    if (direct) {
      raw = direct.content
      usedModel = direct.model
    } else {
      try {
        const aiModel = (config.ai as { model?: string } | undefined)?.model
        const res = await $fetch<{ insight?: string }>('/ai/insights', {
          baseURL: apiBase,
          method: 'POST',
          body: { type: 'custom', language: 'es', customPrompt: dataBlock, model: aiModel },
          timeout: 70000,
        })
        raw = res?.insight || ''
      } catch {
        return null
      }
    }
    if (!raw || raw.trim().length < 60) return null

    const { title, summary, body } = parseArticle(raw, category, date)
    if (body.length < 60) return null

    const post: BlogPost = {
      slug,
      date,
      category,
      title,
      summary,
      body,
      headlines: headlines.map(h => ({ title: h.title, source: h.source, link: h.link })),
      createdAt: new Date().toISOString(),
      model: usedModel,
    }
    await savePost(post)
    return post
  } finally {
    inFlight.delete(slug)
  }
}

/** Ensure today's posts exist for every category; returns how many were created. */
export async function ensureTodayPosts(date: string = montevideoToday()): Promise<number> {
  let created = 0
  for (const category of Object.keys(SOURCES) as BlogCategory[]) {
    const slug = blogSlug(date, category)
    if (await getPost(slug)) continue
    const post = await generatePost(category, date)
    if (post) created += 1
  }
  return created
}
