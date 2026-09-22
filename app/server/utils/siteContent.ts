/**
 * "What does cambio-uruguay.com say about X?" — the content half of /api/site/search and the text of
 * /api/site/page, read from the RAG index the backend job `currency-rag-index` rebuilds every night
 * (APP DB `ragchunks`: every sitemap page, cut into sections, ~11 600 chunks of ~3 300 pages).
 *
 * Lexical only, on purpose. The index also carries Gemini embeddings, but a dense query needs one
 * embedding call per question, on the site's key and its daily quota — the same quota the nightly
 * index and the Reddit bot live on. The caller here is an AI model, which is a far better query
 * expander than a vector: the MCP instructions tell it to retry with the words the site uses.
 *
 * The ranking is a port of the lexical arm of `classes/rag/retrieve.ts` (BM25 over title + heading
 * path + text, chunks folded into pages with a decaying bonus, templated stub pages handicapped):
 * the app cannot import root code, and the two answer different callers.
 */
import mongoose from 'mongoose'
import { connectDb } from './db'

export type SiteChunkTier = 'full' | 'stub'

export interface SiteChunk {
  path: string
  tier: SiteChunkTier
  chunkIndex: number
  title: string
  /** `Título › Sección › Subsección`. */
  headingPath: string
  text: string
  /** When the nightly crawl read the page, ISO. Numbers in `text` are as of this moment. */
  crawledAt: string | null
}

export interface SiteContentHit {
  path: string
  title: string
  tier: SiteChunkTier
  score: number
  crawledAt: string | null
  passages: Array<{ heading: string; text: string }>
}

export interface SitePageText {
  path: string
  title: string
  crawledAt: string | null
  text: string
  offset: number
  totalChars: number
  /** Where the next call should start, or null when this was the end of the page. */
  nextOffset: number | null
}

/**
 * Lines the crawler picked up from the page chrome, not from its content (measured on the index,
 * 2026-09-22: the consent banner is in 1 309 chunks, the rates call-to-action in 145 pages).
 */
const BOILERPLATE = [
  /^Cookies para medir visitas y mostrar anuncios\.?( Política de privacidad)?$/i,
  /^Encontrá el mejor precio ahora$/i,
  /^Compará la cotización del dólar en más de 40 casas de cambio y operá con datos, no con corazonadas\.$/i,
]

export function cleanSiteChunkText(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !BOILERPLATE.some(re => re.test(line)))
    .join('\n')
}

// ── Tokens ──────────────────────────────────────────────────────────────────────────────────────

/** Spanish stopwords plus question filler, as in classes/rag/retrieve.ts. */
const STOPWORDS = new Set(
  (
    'de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este si porque esta ' +
    'entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ' +
    'ese eso ante ellos e esto mi antes algunos que unos yo otro otras otra el tanto esa estos mucho quienes nada ' +
    'muchos cual poco ella estar estas algunas algo nosotros mis tu te ti tus ellas nosotras vosotros vosotras os ' +
    'mio mia mios mias tuyo tuya suyo suya nuestro nuestra vuestro vuestra esos esas soy eres es somos sois son sea ' +
    'ser fue era hola gracias saludos alguien sabe saben pregunta consulta ayuda favor buenas dia dias tema gente ' +
    'che bo tipo cosa cosas hacer hace hago voy va van quiero queria necesito puedo puede pueden'
  )
    .split(/\s+/)
    .filter(Boolean)
)

/** Lowercase, no accents, digits kept: the site writes "Itaú", visitors write "Itau". */
export function siteContentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .split(' ')
    .filter(token => token.length > 2 && token.length < 30 && !STOPWORDS.has(token))
}

/** Same-length fold, so a match position in the folded text is a position in the original. */
const SAME_LENGTH_FOLD: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ü: 'u',
}
const foldSameLength = (text: string) =>
  text.toLowerCase().replace(/[áéíóúü]/g, c => SAME_LENGTH_FOLD[c] ?? c)

// ── Index ───────────────────────────────────────────────────────────────────────────────────────

/** One token's postings, packed: ~470 000 `[doc, tf]` pairs as tuples cost ~50 MB per process. */
interface Posting {
  docs: Int32Array
  tfs: Uint16Array
}

export interface SiteContentIndex {
  chunks: readonly SiteChunk[]
  postings: Map<string, Posting>
  lengths: Float64Array
  avgLength: number
  /** path → its chunks in page order. */
  pages: Map<string, SiteChunk[]>
  loadedAt: number
}

export function buildSiteContentIndex(
  raw: readonly SiteChunk[],
  now = Date.now()
): SiteContentIndex {
  const chunks = raw.map(chunk => ({ ...chunk, text: cleanSiteChunkText(chunk.text) }))
  // Flat [doc, tf, doc, tf, …] while building, packed into typed arrays at the end.
  const building = new Map<string, number[]>()
  const lengths = new Float64Array(chunks.length)
  let total = 0
  chunks.forEach((chunk, i) => {
    // The heading path is indexed with the body: for a stub page it is nearly all the signal.
    const tokens = siteContentTokens(`${chunk.headingPath}\n${chunk.text}`)
    lengths[i] = tokens.length
    total += tokens.length
    const tf = new Map<string, number>()
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1)
    for (const [token, count] of tf) {
      const list = building.get(token)
      if (list) list.push(i, count)
      else building.set(token, [i, count])
    }
  })
  const postings = new Map<string, Posting>()
  for (const [token, flat] of building) {
    const docs = new Int32Array(flat.length / 2)
    const tfs = new Uint16Array(flat.length / 2)
    for (let j = 0; j < docs.length; j++) {
      docs[j] = flat[2 * j]!
      tfs[j] = Math.min(65535, flat[2 * j + 1]!)
    }
    postings.set(token, { docs, tfs })
  }
  const pages = new Map<string, SiteChunk[]>()
  for (const chunk of chunks) {
    const list = pages.get(chunk.path)
    if (list) list.push(chunk)
    else pages.set(chunk.path, [chunk])
  }
  for (const list of pages.values()) list.sort((a, b) => a.chunkIndex - b.chunkIndex)
  return {
    chunks,
    postings,
    lengths,
    avgLength: chunks.length ? total / chunks.length : 0,
    pages,
    loadedAt: now,
  }
}

const K1 = 1.2
const B = 0.75
const EXTRA_CHUNK_WEIGHT = 0.35
const EXTRA_CHUNK_DECAY = 0.5
/** A templated one-line page only wins when it wins clearly (see classes/rag/retrieve.ts). */
const STUB_PENALTY = 0.82
const PASSAGE_CHARS = 600
/**
 * Index pages (a topic hub, the guide list, the tool list) repeat the description of every page they
 * link to, so they match everything a little — and outrank the guide that actually answers.
 */
const HUB_PAGE = /^\/(?:temas(?:\/.*)?|guias|herramientas|glosario|mapa-del-sitio|buscar)$/
const HUB_PENALTY = 0.6
/** A chunk shorter than this is a breadcrumb or a heading, not something to quote. */
const MIN_PASSAGE_CHARS = 60

function bm25(index: SiteContentIndex, tokens: readonly string[]): Map<number, number> {
  const scores = new Map<number, number>()
  const n = index.chunks.length
  for (const token of new Set(tokens)) {
    const posting = index.postings.get(token)
    if (!posting) continue
    const df = posting.docs.length
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5))
    for (let j = 0; j < df; j++) {
      const doc = posting.docs[j]!
      const tf = posting.tfs[j]!
      const norm = tf + K1 * (1 - B + (B * index.lengths[doc]!) / (index.avgLength || 1))
      scores.set(doc, (scores.get(doc) ?? 0) + (idf * (tf * (K1 + 1))) / norm)
    }
  }
  return scores
}

/** The part of a chunk around the first query word, so a long section still shows why it matched. */
export function sitePassage(text: string, tokens: readonly string[], max = PASSAGE_CHARS): string {
  if (text.length <= max) return text
  const folded = foldSameLength(text)
  const at = tokens
    .map(token => folded.indexOf(token))
    .filter(i => i >= 0)
    .sort((a, b) => a - b)[0]
  const start = at === undefined ? 0 : Math.max(0, Math.min(at - 150, text.length - max))
  const slice = text.slice(start, start + max).trim()
  return `${start > 0 ? '…' : ''}${slice}${start + max < text.length ? '…' : ''}`
}

const sectionOf = (headingPath: string) => headingPath.split(' › ').slice(1).join(' › ')

export function searchSiteContent(
  index: SiteContentIndex,
  query: string,
  limit = 6
): SiteContentHit[] {
  const tokens = siteContentTokens(query)
  if (!tokens.length || !index.chunks.length) return []
  const scores = bm25(index, tokens)
  const byPage = new Map<string, Array<{ chunk: SiteChunk; score: number }>>()
  for (const [doc, score] of scores) {
    const chunk = index.chunks[doc]!
    const list = byPage.get(chunk.path)
    if (list) list.push({ chunk, score })
    else byPage.set(chunk.path, [{ chunk, score }])
  }
  const hits: SiteContentHit[] = []
  for (const [path, list] of byPage) {
    list.sort((a, b) => b.score - a.score)
    let score = list[0]!.score
    for (let i = 1; i < list.length; i++)
      score += list[i]!.score * EXTRA_CHUNK_WEIGHT * EXTRA_CHUNK_DECAY ** (i - 1)
    const first = list[0]!.chunk
    if (first.tier === 'stub') score *= STUB_PENALTY
    if (HUB_PAGE.test(path)) score *= HUB_PENALTY
    // The chunk that scored best can be the page title alone; quote the best ones with real text,
    // or the start of the page when no matching chunk has any.
    const quotable = (chunk: SiteChunk) => chunk.text.length >= MIN_PASSAGE_CHARS
    let quoted = list
      .map(entry => entry.chunk)
      .filter(quotable)
      .slice(0, 2)
    if (!quoted.length) {
      const opening = index.pages.get(path)?.find(quotable)
      quoted = [opening ?? first]
    }
    hits.push({
      path,
      title: first.title,
      tier: first.tier,
      score: Math.round(score * 100) / 100,
      crawledAt: first.crawledAt,
      passages: quoted.map(chunk => ({
        heading: sectionOf(chunk.headingPath),
        text: sitePassage(chunk.text, tokens),
      })),
    })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** `https://cambio-uruguay.com/en/x/?a=1#b` → `/x`; the index holds the Spanish pages. */
export function normalizeSitePath(input: string): string | null {
  let value = input.trim()
  if (!value || value.length > 300) return null
  value = value.replace(/^https?:\/\/(www\.)?cambio-uruguay\.com/i, '')
  if (/^[a-z]+:/i.test(value) || value.startsWith('//')) return null
  value = value.split(/[?#]/)[0]!
  if (!value.startsWith('/')) value = `/${value}`
  value = value.replace(/\/{2,}/g, '/')
  if (value.length > 1) value = value.replace(/\/+$/, '')
  return value
}

export function siteLocaleFallback(path: string): string | null {
  const match = /^\/(?:en|pt)(\/.*)?$/.exec(path)
  return match ? match[1] || '/' : null
}

export function readSitePage(
  index: SiteContentIndex,
  path: string,
  offset = 0,
  maxChars = 8000
): SitePageText | null {
  const chunks = index.pages.get(path)
  if (!chunks?.length) return null
  const parts: string[] = []
  let heading = ''
  for (const chunk of chunks) {
    const section = sectionOf(chunk.headingPath)
    if (section && section !== heading) parts.push(`\n## ${section}`)
    heading = section
    if (chunk.text) parts.push(chunk.text)
  }
  const full = parts.join('\n').trim()
  const start = Math.max(0, Math.min(Math.floor(offset), full.length))
  const end = Math.min(full.length, start + maxChars)
  return {
    path,
    title: chunks[0]!.title,
    crawledAt: chunks[0]!.crawledAt,
    text: full.slice(start, end),
    offset: start,
    totalChars: full.length,
    nextOffset: end < full.length ? end : null,
  }
}

// ── Loading ─────────────────────────────────────────────────────────────────────────────────────

/** The index changes once a night; six hours per process keeps it fresh without re-reading it. */
const TTL_MS = 6 * 60 * 60 * 1000
let current: SiteContentIndex | null = null
let loading: Promise<SiteContentIndex> | null = null

async function loadFromDb(): Promise<SiteContentIndex> {
  await connectDb()
  const db = mongoose.connection.db
  if (!db) throw new Error('no database')
  // Raw collection with an explicit projection: the vectors (~35 MB) never leave Mongo.
  const docs = await db
    .collection('ragchunks')
    .find(
      {},
      {
        projection: {
          _id: 0,
          path: 1,
          tier: 1,
          chunkIndex: 1,
          title: 1,
          headingPath: 1,
          text: 1,
          crawledAt: 1,
        },
      }
    )
    .toArray()
  return buildSiteContentIndex(
    docs.map(doc => ({
      path: String(doc.path ?? ''),
      tier: doc.tier === 'stub' ? 'stub' : 'full',
      chunkIndex: Number(doc.chunkIndex ?? 0),
      title: String(doc.title ?? ''),
      headingPath: String(doc.headingPath ?? ''),
      text: String(doc.text ?? ''),
      crawledAt: doc.crawledAt ? new Date(doc.crawledAt as string | Date).toISOString() : null,
    }))
  )
}

/**
 * The per-process index. Stale-while-revalidate: once loaded, a request never waits for a reload,
 * and a failed reload keeps serving the previous copy.
 */
export async function siteContentIndex(now = Date.now()): Promise<SiteContentIndex> {
  if (current && now - current.loadedAt < TTL_MS) return current
  loading ??= loadFromDb()
    .then(index => (current = index))
    .finally(() => (loading = null))
  if (current) {
    loading.catch(() => undefined)
    return current
  }
  return loading
}
