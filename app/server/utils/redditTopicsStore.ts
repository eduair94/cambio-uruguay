// Harvest → classify → publish, for "temas de dinero en Reddit" on
// /temas-de-dinero-reddit. Runs daily alongside reddit:sentiment.
//
//   1. HARVEST — search a broad money/economy query set across the Uruguayan subs and
//                upsert the threads into the SHARED `RedditPost` ledger (deduped on
//                `redditId`). We only need titles/bodies here, so no comments are fetched
//                — this is a cheap, search-only pass. Posts already stored by the bank
//                harvest are reused; we never clobber their entities or comment state.
//   2. CLASSIFY — fold the whole recent corpus into ranked topics with `aggregateTopics`
//                (pure, deterministic; no AI touches a count).
//   3. PUBLISH  — one snapshot doc per topic. The page reads only these.
import { connectDb } from './db'
import { RedditPostModel } from '../models/RedditPost'
import { RedditTopicModel } from '../models/RedditTopics'
import { redditConfigured, searchSubreddit } from './reddit'
import { matchEntities } from '../../utils/redditSentiment'
import { aggregateTopics, type TopicPost } from '../../utils/redditTopics'

/** Where Uruguayans talk about money. */
const SUBS = ['uruguay', 'UruguayFinanzas', 'Burises', 'Montevideo'] as const

/** Broad, curated money/economy queries. Kept representative (not exhaustive) so a run
 * stays under a couple of minutes; classification then works over the whole corpus. */
const HARVEST_QUERIES = [
  'dolar',
  'ahorro',
  'invertir',
  'plazo fijo',
  'alquiler',
  'garantia alquiler',
  'clearing',
  'deuda',
  'prestamo',
  'cuotas',
  'tarjeta de credito',
  'banco',
  'prex',
  'mercado pago',
  'irpf',
  'impuesto',
  'sueldo liquido',
  'jubilacion',
  'afap',
  'cripto',
  'inflacion',
  'costo de vida',
  'importar',
  'courier',
  'monotributo',
  'finanzas personales',
] as const

const MAX_PAGES = 2
const CORPUS_AGE_DAYS = 365

const iso = (utc: number) => new Date(utc * 1000).toISOString().slice(0, 10)

export interface TopicsRefreshResult {
  searched: number
  seen: number
  upserted: number
  corpusPosts: number
  topics: number
  asOf: string
}

/** Search-only harvest into the shared RedditPost ledger. No comment downloads. */
async function harvestTopics(
  window: 'year' | 'all'
): Promise<{ searched: number; seen: number; upserted: number }> {
  const found = new Map<
    string,
    { post: Awaited<ReturnType<typeof searchSubreddit>>[number]; queries: Set<string> }
  >()
  let searched = 0
  for (const q of HARVEST_QUERIES) {
    for (const sub of SUBS) {
      searched++
      const posts = await searchSubreddit(sub, q, { t: window, sort: 'new', maxPages: MAX_PAGES })
      for (const p of posts) {
        const hit = found.get(p.id)
        if (hit) hit.queries.add(q)
        else found.set(p.id, { post: p, queries: new Set([q]) })
      }
    }
  }
  if (!found.size) return { searched, seen: 0, upserted: 0 }

  const ops = [...found.values()].map(({ post, queries }) => ({
    updateOne: {
      filter: { redditId: post.id },
      update: {
        $set: {
          sub: post.sub,
          title: post.title,
          selftext: post.selftext,
          author: post.author,
          score: post.score,
          numComments: post.numComments,
          permalink: post.permalink,
          date: iso(post.createdUtc),
          createdUtc: post.createdUtc,
          lastSeenAt: new Date(),
        },
        $addToSet: { queries: { $each: [...queries] } },
        // Only for brand-new threads: classify entities and scaffold the comment fields so
        // the bank harvest, if it later touches this thread, finds them as it expects.
        $setOnInsert: {
          entities: matchEntities(`${post.title} ${post.selftext}`),
          comments: [],
          commentsAtCount: -1,
          commentsVersion: 0,
          commentsFetchedAt: null,
          storedComments: 0,
        },
      },
      upsert: true,
    },
  }))
  await RedditPostModel.bulkWrite(ops, { ordered: false })
  return { searched, seen: found.size, upserted: ops.length }
}

/**
 * The daily cycle. Safe with no Reddit key (harvest no-ops; we re-classify whatever the
 * corpus already holds) — the page then keeps serving the last snapshot.
 */
export async function refreshRedditTopics(
  opts: { window?: 'year' | 'all' } = {}
): Promise<TopicsRefreshResult> {
  await connectDb()
  const window = opts.window ?? 'year'
  const h = redditConfigured() ? await harvestTopics(window) : { searched: 0, seen: 0, upserted: 0 }

  const cutoff = Math.floor(Date.now() / 1000 - CORPUS_AGE_DAYS * 86_400)
  const docs = await RedditPostModel.find({ createdUtc: { $gte: cutoff } })
    .select({
      redditId: 1,
      title: 1,
      selftext: 1,
      score: 1,
      numComments: 1,
      permalink: 1,
      date: 1,
      createdUtc: 1,
      sub: 1,
    })
    .lean()
  const posts: TopicPost[] = docs.map(d => ({
    redditId: d.redditId,
    title: d.title ?? '',
    selftext: d.selftext ?? '',
    score: d.score ?? 0,
    numComments: d.numComments ?? 0,
    permalink: d.permalink ?? '',
    date: d.date ?? '',
    createdUtc: d.createdUtc ?? 0,
    sub: d.sub ?? '',
  }))

  const nowSec = Math.floor(Date.now() / 1000)
  const topics = aggregateTopics(posts, nowSec)
  const now = new Date()
  for (const t of topics) {
    await RedditTopicModel.updateOne(
      { topicId: t.id },
      {
        $set: {
          topicId: t.id,
          label: t.label,
          icon: t.icon,
          blurb: t.blurb,
          total: t.total,
          recent: t.recent,
          related: t.related,
          sample: t.sample,
          asOf: now,
        },
      },
      { upsert: true }
    )
  }

  return {
    searched: h.searched,
    seen: h.seen,
    upserted: h.upserted,
    corpusPosts: posts.length,
    topics: topics.length,
    asOf: now.toISOString(),
  }
}

export interface PublishedTopics {
  topics: Array<{
    id: string
    label: string
    icon: string
    blurb: string
    total: number
    recent: number
    related: Array<{ label: string; to: string }>
    sample: Array<{
      title: string
      permalink: string
      score: number
      numComments: number
      date: string
      sub: string
    }>
  }>
  asOf: string | null
  empty: boolean
  subs: string[]
}

/** What the API serves: the stored snapshots, never a live Reddit call. */
export async function getPublishedTopics(): Promise<PublishedTopics> {
  await connectDb()
  const docs = await RedditTopicModel.find({}).lean()
  const withData = docs
    .filter(d => d.total > 0)
    .sort((a, b) => b.recent - a.recent || b.total - a.total)
  return {
    topics: withData.map(d => ({
      id: d.topicId,
      label: d.label,
      icon: d.icon,
      blurb: d.blurb,
      total: d.total,
      recent: d.recent,
      related: d.related ?? [],
      sample: d.sample ?? [],
    })),
    asOf: withData[0]?.asOf ? new Date(withData[0].asOf).toISOString() : null,
    empty: withData.length === 0,
    subs: [...SUBS],
  }
}
