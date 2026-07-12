// Builds the scam radar from the Reddit corpus we ALREADY harvest for /mejores-bancos-uruguay.
//
// No new data source, no new credentials, no new cron: the daily `reddit:sentiment` task already
// pulls every thread and comment into MongoDB, so the radar is a second read over the same corpus.
//
// Deterministic: the classifier is a set of regexes in `~/utils/scamRadar`, not an AI. Nobody
// wants a language model deciding, unsupervised, which reports count as fraud on a page about
// fraud.
import { connectDb } from './db'
import { RedditPostModel } from '../models/RedditPost'
import { RedditCommentModel } from '../models/RedditComment'
import { ScamRadarModel } from '../models/ScamRadar'
import { buildRadar, type ScamMention, type ScamPatternReport } from '../../utils/scamRadar'

/** Only the last few years: a 2019 scam wave is history, not a radar. */
const MAX_AGE_DAYS = 365 * 3

/** Read the corpus and fold it into the radar. */
export async function computeRadar(now = new Date()): Promise<ScamPatternReport[]> {
  await connectDb()
  const cutoff = Math.floor(now.getTime() / 1000 - MAX_AGE_DAYS * 86_400)

  const posts = await RedditPostModel.find({ createdUtc: { $gte: cutoff } })
    .select({ redditId: 1, title: 1, selftext: 1, date: 1, permalink: 1, sub: 1, score: 1 })
    .lean()
  const comments = await RedditCommentModel.find({ createdUtc: { $gte: cutoff } })
    .select({ commentId: 1, body: 1, date: 1, permalink: 1, sub: 1, score: 1 })
    .lean()

  const mentions: ScamMention[] = [
    ...posts.map(p => ({
      id: p.redditId,
      text: `${p.title}\n${p.selftext ?? ''}`.trim(),
      date: p.date,
      permalink: p.permalink,
      sub: p.sub,
      score: p.score,
    })),
    ...comments.map(c => ({
      id: c.commentId,
      text: c.body,
      date: c.date,
      permalink: c.permalink,
      sub: c.sub,
      score: c.score,
    })),
  ]

  return buildRadar(mentions, { now })
}

export interface RadarRefreshResult {
  patterns: number
  reports: number
  recent: number
  asOf: string
}

/** Recompute and republish. Called by the daily `reddit:sentiment` task. */
export async function refreshScamRadar(now = new Date()): Promise<RadarRefreshResult> {
  const radar = await computeRadar(now)

  for (const p of radar) {
    await ScamRadarModel.updateOne(
      { patternId: p.id },
      {
        $set: {
          patternId: p.id,
          label: p.label,
          icon: p.icon,
          how: p.how,
          defence: p.defence,
          reports: p.reports,
          recent: p.recent,
          threads: p.threads,
          quotes: p.quotes,
          asOf: now,
        },
      },
      { upsert: true }
    )
  }

  // A pattern that no longer clears the reporting floor should stop being published.
  const live = radar.map(p => p.id)
  if (live.length) await ScamRadarModel.deleteMany({ patternId: { $nin: live } })

  return {
    patterns: radar.length,
    reports: radar.reduce((n, p) => n + p.reports, 0),
    recent: radar.reduce((n, p) => n + p.recent, 0),
    asOf: now.toISOString(),
  }
}

export interface PublishedRadar {
  patterns: Array<Omit<ScamPatternReport, 'id'> & { id: string }>
  asOf: string | null
  empty: boolean
  /** Stated on the page: these are reports, not statistics. */
  disclaimer: string
}

export const RADAR_DISCLAIMER =
  'Esto es lo que la gente CUENTA en Reddit, no una estadística de Uruguay. Un número acá dice cuántas personas escribieron sobre algo parecido — nunca qué tan frecuente es. Sirve para reconocer el patrón antes de que te toque.'

/** What the API serves: the stored snapshot, never a live pass over the corpus. */
export async function getScamRadar(): Promise<PublishedRadar> {
  await connectDb()
  const docs = await ScamRadarModel.find({}).sort({ recent: -1, reports: -1 }).lean()
  return {
    patterns: docs.map(d => ({
      id: d.patternId,
      label: d.label,
      icon: d.icon,
      how: d.how,
      defence: d.defence,
      reports: d.reports,
      recent: d.recent,
      threads: d.threads ?? [],
      quotes: d.quotes ?? [],
    })),
    asOf: docs[0]?.asOf ? new Date(docs[0].asOf).toISOString() : null,
    empty: docs.length === 0,
    disclaimer: RADAR_DISCLAIMER,
  }
}
