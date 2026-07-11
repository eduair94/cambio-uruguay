// Harvest → store → score → publish, for "qué dice Reddit" on /mejores-bancos-uruguay.
//
// Run daily by the `reddit:sentiment` task. Three stages:
//
//   1. HARVEST  — search each entity's queries across the Uruguayan subs. Every thread is
//                 upserted on its unique `redditId`, so MongoDB is the dedupe ledger: a
//                 thread we already stored is never downloaded again. Comments are the
//                 expensive call (one request per thread), so we only (re)fetch them for
//                 threads that are new or whose comment count grew. Each run is capped
//                 (MAX_COMMENT_FETCHES) and the leftovers are simply picked up tomorrow.
//   2. SCORE    — pure, deterministic, auditable: `~/utils/redditSentiment` over the stored
//                 corpus. No AI touches a number.
//   3. PUBLISH  — one snapshot doc per entity. The page reads only these, so a Reddit
//                 outage or a missing key leaves the last good snapshot serving.
//
// Optional: when an AI key is configured, one short prose summary per entity is written
// FROM THE ALREADY-SELECTED QUOTES. It is commentary on the numbers, never their source.
import { connectDb } from './db'
import { RedditPostModel, type RedditPostDoc } from '../models/RedditPost'
import { RedditSentimentModel } from '../models/RedditSentiment'
import { fetchComments, redditConfigured, searchSubreddit, type RedditPostRaw } from './reddit'
import { chatTextWithFallback } from './ai'
import {
  REDDIT_ENTITIES,
  aggregateBoard,
  extractMentions,
  matchEntities,
  MIN_SAMPLE,
  type EntitySentiment,
  type RedditMention,
} from '../../utils/redditSentiment'

/** Where Uruguayans actually argue about banks. */
const SUBS = ['uruguay', 'Burises', 'UruguayFinanzas', 'Montevideo', 'uruguayNOfiltro'] as const

/** Comment downloads per run. The daily budget; anything left over waits for tomorrow. */
const MAX_COMMENT_FETCHES = 120

/** Ignore threads older than this — the decay curve makes them near-weightless anyway. */
const MAX_CORPUS_AGE_DAYS = 365 * 5

const iso = (utcSeconds: number) => new Date(utcSeconds * 1000).toISOString().slice(0, 10)

export interface HarvestStats {
  searched: number
  seen: number
  newPosts: number
  commentsFetched: number
  commentsPending: number
  skippedBudget: number
}

/**
 * Stage 1. Search every entity's queries across the subs and upsert what comes back.
 * `window` is 'all' for a first backfill, 'year' for the daily incremental pass.
 */
export async function harvest(window: 'year' | 'all' = 'year'): Promise<HarvestStats> {
  const stats: HarvestStats = {
    searched: 0,
    seen: 0,
    newPosts: 0,
    commentsFetched: 0,
    commentsPending: 0,
    skippedBudget: 0,
  }
  if (!redditConfigured()) return stats

  await connectDb()

  // One pass over (query × sub); a thread found by several queries just accumulates provenance.
  const found = new Map<string, { post: RedditPostRaw; queries: Set<string> }>()

  for (const entity of REDDIT_ENTITIES) {
    for (const q of entity.queries) {
      for (const sub of SUBS) {
        stats.searched++
        const posts = await searchSubreddit(sub, q, { t: window, sort: 'new', limit: 50 })
        for (const p of posts) {
          const hit = found.get(p.id)
          if (hit) hit.queries.add(q)
          else found.set(p.id, { post: p, queries: new Set([q]) })
        }
      }
    }
  }
  stats.seen = found.size
  if (!found.size) return stats

  const cutoff = Date.now() / 1000 - MAX_CORPUS_AGE_DAYS * 86_400
  const fresh = [...found.values()].filter(f => f.post.createdUtc >= cutoff)

  // What do we already have? One query, then upsert only what changed.
  const ids = fresh.map(f => f.post.id)
  const existing = await RedditPostModel.find({ redditId: { $in: ids } })
    .select({ redditId: 1, commentsAtCount: 1 })
    .lean()
  const known = new Map(existing.map(d => [d.redditId, d.commentsAtCount ?? -1]))

  const needComments: Array<{ post: RedditPostRaw; queries: string[] }> = []

  const ops = fresh.map(({ post, queries }) => {
    const isNew = !known.has(post.id)
    if (isNew) stats.newPosts++
    // Re-read comments only when there is something new to read.
    const have = known.get(post.id) ?? -1
    if (post.numComments > 0 && post.numComments > have) {
      needComments.push({ post, queries: [...queries] })
    }
    return {
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
            entities: matchEntities(`${post.title} ${post.selftext}`),
            lastSeenAt: new Date(),
          },
          $addToSet: { queries: { $each: [...queries] } },
          $setOnInsert: { comments: [], commentsAtCount: -1, commentsFetchedAt: null },
        },
        upsert: true,
      },
    }
  })
  if (ops.length) await RedditPostModel.bulkWrite(ops, { ordered: false })

  // Newest and busiest threads first — that is where the current sentiment lives.
  needComments.sort(
    (a, b) => b.post.createdUtc - a.post.createdUtc || b.post.numComments - a.post.numComments
  )
  stats.commentsPending = needComments.length
  const budget = needComments.slice(0, MAX_COMMENT_FETCHES)
  stats.skippedBudget = needComments.length - budget.length

  for (const { post } of budget) {
    const comments = await fetchComments(post.id)
    if (!comments.length) continue
    await RedditPostModel.updateOne(
      { redditId: post.id },
      {
        $set: {
          comments: comments.map(c => ({
            id: c.id,
            author: c.author,
            body: c.body,
            score: c.score,
            date: iso(c.createdUtc),
            permalink: c.permalink || post.permalink,
          })),
          commentsAtCount: post.numComments,
          commentsFetchedAt: new Date(),
        },
      }
    )
    stats.commentsFetched++
  }

  return stats
}

/**
 * Stage 2. Fold the stored corpus into per-entity mentions.
 *
 * Attribution is per-SENTENCE (see `extractMentions`), so a comment that rants about three
 * banks contributes each judgement to the bank it was aimed at — and contributes nothing at
 * all where it is merely comparing them.
 */
export async function buildMentions(): Promise<Record<string, RedditMention[]>> {
  await connectDb()
  const cutoff = Math.floor(Date.now() / 1000 - MAX_CORPUS_AGE_DAYS * 86_400)
  const posts = await RedditPostModel.find({ createdUtc: { $gte: cutoff } }).lean()

  const byEntity: Record<string, RedditMention[]> = {}
  const push = (id: string, m: RedditMention) => {
    ;(byEntity[id] ??= []).push(m)
  }

  for (const p of posts as RedditPostDoc[]) {
    // The thread's subject comes from the TITLE. `p.entities` (title + body) is what the
    // harvest indexes on, but a bank named once inside a long body does not make the thread
    // — or its comments — about that bank.
    const subject = matchEntities(p.title ?? '')

    const body = `${p.title}\n${p.selftext ?? ''}`.trim()
    for (const [i, seg] of extractMentions(body, subject).entries()) {
      push(seg.entityId, {
        id: `${p.redditId}#${i}`,
        kind: 'post',
        text: seg.text,
        score: p.score,
        date: p.date,
        permalink: p.permalink,
        sub: p.sub,
        named: seg.named,
      })
    }

    for (const c of p.comments ?? []) {
      for (const [i, seg] of extractMentions(c.body, subject).entries()) {
        push(seg.entityId, {
          id: `${c.id}#${i}`,
          kind: 'comment',
          text: seg.text,
          score: c.score,
          date: c.date || p.date,
          permalink: c.permalink || p.permalink,
          sub: p.sub,
          named: seg.named,
        })
      }
    }
  }
  return byEntity
}

const NAME_BY_ID = new Map(REDDIT_ENTITIES.map(e => [e.id, e.name]))

/**
 * Optional prose over the numbers. Deliberately constrained: the model may ONLY use the
 * quotes we already selected, may not invent facts or figures, and cannot change a score.
 */
async function summarise(entity: EntitySentiment): Promise<string | null> {
  if (entity.mentions < MIN_SAMPLE || !entity.quotes.length) return null
  const name = NAME_BY_ID.get(entity.id) ?? entity.id
  const quotes = entity.quotes.map(q => `- "${q.text}" (${q.date}, r/${q.sub})`).join('\n')
  const themes = entity.themes
    .slice(0, 3)
    .map(t => t.theme)
    .join(', ')

  return chatTextWithFallback({
    system:
      'Sos un analista que resume opiniones reales de usuarios uruguayos en Reddit. Escribís en español rioplatense, ' +
      'directo y sin marketing. Nunca inventás datos, cifras ni hechos: usás SOLO los comentarios que te pasan.',
    user:
      `Entidad: ${name}. Menciones analizadas: ${entity.mentions} ` +
      `(${entity.positive} positivas, ${entity.negative} negativas, ${entity.neutral} neutras). ` +
      `Sentimiento neto: ${entity.net} sobre 100. Temas más mencionados: ${themes || 'sin tema claro'}.\n\n` +
      `Comentarios representativos:\n${quotes}\n\n` +
      `Escribí 2 frases (máximo 45 palabras) que resuman QUÉ SE QUEJA o QUÉ ELOGIA la gente de ${name} en Reddit. ` +
      `Sin introducción, sin repetir los números, sin conclusiones sobre si conviene o no. Solo el patrón que se repite.`,
    maxTokens: 220,
    temperature: 0.4,
  })
}

export interface RefreshResult {
  harvest: HarvestStats
  entities: number
  withVerdict: number
  summaries: number
  asOf: string
}

/**
 * The whole daily cycle. Safe to run with no Reddit key (harvest no-ops and we simply
 * re-score whatever corpus is already in MongoDB) and with no AI key (no prose summaries).
 */
export async function refreshRedditSentiment(
  opts: { window?: 'year' | 'all'; withSummaries?: boolean } = {}
): Promise<RefreshResult> {
  const stats = await harvest(opts.window ?? 'year')
  const byEntity = await buildMentions()
  const board = aggregateBoard(byEntity)

  const wantSummaries = opts.withSummaries ?? true
  let summaries = 0

  const now = new Date()
  for (const entity of board) {
    const summary = wantSummaries ? await summarise(entity) : null
    if (summary) summaries++
    const dates = (byEntity[entity.id] ?? [])
      .map(m => m.date)
      .filter(Boolean)
      .sort()
    await RedditSentimentModel.updateOne(
      { entityId: entity.id },
      {
        $set: {
          entityId: entity.id,
          name: NAME_BY_ID.get(entity.id) ?? entity.id,
          mentions: entity.mentions,
          positive: entity.positive,
          negative: entity.negative,
          neutral: entity.neutral,
          opinions: entity.opinions,
          net: entity.net,
          label: entity.label,
          themes: entity.themes,
          quotes: entity.quotes,
          // Keep the previous summary when this run produced none (AI down ≠ delete copy).
          ...(summary ? { summary } : {}),
          latestMentionDate: dates.length ? dates[dates.length - 1] : null,
          asOf: now,
        },
      },
      { upsert: true }
    )
  }

  // Drop the cached GET response. Without this the fresh snapshot is invisible for up to an
  // hour: the daily task would publish, the page would keep serving yesterday's numbers, and
  // an operator running a manual backfill would conclude it did nothing.
  try {
    const cache = useStorage('cache')
    const keys = await cache.getKeys('nitro:handlers:reddit-sentiment-uy')
    await Promise.all(keys.map(k => cache.removeItem(k)))
  } catch {
    // A cache we cannot clear is a stale page, not a failed refresh — the data is already saved.
  }

  return {
    harvest: stats,
    entities: board.length,
    withVerdict: board.filter(e => e.label !== 'sin datos').length,
    summaries,
    asOf: now.toISOString(),
  }
}

export interface PublishedSentiment {
  entities: Array<{
    id: string
    name: string
    mentions: number
    positive: number
    negative: number
    neutral: number
    opinions: number
    net: number
    label: string
    themes: Array<{ theme: string; count: number }>
    quotes: Array<{
      text: string
      permalink: string
      date: string
      score: number
      sub: string
      polarity: number
    }>
    summary: string | null
    latestMentionDate: string | null
  }>
  asOf: string | null
  /** Nothing harvested yet (fresh deploy / no credentials) — the UI hides the section. */
  empty: boolean
  subs: string[]
  minSample: number
}

/** What the API serves: the stored snapshot, never a live Reddit call. */
export async function getPublishedSentiment(): Promise<PublishedSentiment> {
  await connectDb()
  const docs = await RedditSentimentModel.find({}).sort({ mentions: -1 }).lean()
  const withData = docs.filter(d => d.mentions > 0)
  return {
    entities: withData.map(d => ({
      id: d.entityId,
      name: d.name,
      mentions: d.mentions,
      positive: d.positive,
      negative: d.negative,
      neutral: d.neutral,
      opinions: d.opinions ?? d.positive + d.negative,
      net: d.net,
      label: d.label,
      themes: d.themes ?? [],
      quotes: d.quotes ?? [],
      summary: d.summary ?? null,
      latestMentionDate: d.latestMentionDate ?? null,
    })),
    asOf: withData[0]?.asOf ? new Date(withData[0].asOf).toISOString() : null,
    empty: withData.length === 0,
    subs: [...SUBS],
    minSample: MIN_SAMPLE,
  }
}
