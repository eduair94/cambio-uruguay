// Broad Uruguay-economy news aggregation (distinct from the dollar-focused
// `/api/news`). Pulls Google News RSS per economic topic — inflation, jobs &
// wages, companies, the central bank, foreign trade and fiscal/tax — tags each
// headline with its topic and de-duplicates across topics. Reuses the shared,
// dependency-free RSS parser in `./news` (`fetchNewsFrom`); this module only
// adds the topic taxonomy + the per-topic fetch/merge.
//
// Consumed by `/api/economy-news` (display grid, cached) and `/api/economy-ai`
// (AI briefing, cached), which back the trilingual `/economia-uruguay` page.
import { fetchNewsFrom, type NewsItem } from './news'

/** One economic beat covered by the aggregator. Drives grouping + i18n labels. */
export type EconomyTopic =
  | 'inflacion'
  | 'empleo'
  | 'empresas'
  | 'bcu'
  | 'comercio_exterior'
  | 'fiscal'

export interface EconomyTopicDef {
  id: EconomyTopic
  /** Google News search queries (plain text) merged for this topic. */
  queries: readonly string[]
}

/** Build a Uruguay-scoped, Spanish Google News RSS search URL for a query. */
const gnFeed = (q: string): string =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-419&gl=UY&ceid=UY:es`

/**
 * The topics, in display order. Two complementary queries each so a quiet beat
 * still surfaces something. Order here is the order sections render on the page.
 */
export const ECONOMY_TOPICS: readonly EconomyTopicDef[] = Object.freeze([
  {
    id: 'inflacion',
    queries: ['inflación Uruguay IPC', 'índice de precios al consumo Uruguay INE'],
  },
  { id: 'empleo', queries: ['empleo Uruguay desempleo', 'salarios Uruguay consejos de salarios'] },
  {
    id: 'empresas',
    queries: ['empresas Uruguay inversión negocios', 'industria Uruguay actividad económica'],
  },
  {
    id: 'bcu',
    queries: ['Banco Central del Uruguay política monetaria', 'BCU tasa de interés Uruguay'],
  },
  {
    id: 'comercio_exterior',
    queries: ['exportaciones Uruguay', 'Uruguay comercio exterior Mercosur importaciones'],
  },
  {
    id: 'fiscal',
    queries: ['economía Uruguay presupuesto MEF', 'déficit fiscal Uruguay impuestos DGI'],
  },
])

/** A headline tagged with the economic beat it came from. */
export interface EconomyNewsItem extends NewsItem {
  topic: EconomyTopic
}

/** Every feed URL for a topic. */
export function topicFeeds(topic: EconomyTopicDef): string[] {
  return topic.queries.map(gnFeed)
}

/** Normalised de-dupe key (first 60 alphanumerics of the lowercased title). */
const dedupeKey = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ]/g, '')
    .slice(0, 60)

/**
 * Fetch + tag + merge headlines across every economic topic. Each topic keeps up
 * to `perTopic` fresh items; a headline is attributed to the FIRST topic that
 * surfaces it (topics are processed in {@link ECONOMY_TOPICS} order) so it never
 * appears twice. Resilient: a failing feed yields an empty topic, not an error.
 */
export async function fetchEconomyNews(perTopic = 6): Promise<EconomyNewsItem[]> {
  const perTopicResults = await Promise.all(
    ECONOMY_TOPICS.map(async t => {
      const items = await fetchNewsFrom(topicFeeds(t), perTopic).catch(() => [] as NewsItem[])
      return items.map((n): EconomyNewsItem => ({ ...n, topic: t.id }))
    })
  )

  const seen = new Set<string>()
  const out: EconomyNewsItem[] = []
  for (const list of perTopicResults) {
    for (const n of list) {
      if (!n.title || !n.link) continue
      const key = dedupeKey(n.title)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(n)
    }
  }
  return out
}
