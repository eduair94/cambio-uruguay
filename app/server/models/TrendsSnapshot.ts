// Reads `trendssnapshots` — the single `key:"uy"` document the backend job `currency-trends`
// upserts (classes/models/TrendsSnapshot.ts is the writer, on the SAME app database).
//
// The app never writes here: the three feeds are read by the backend, which is the only process
// with the Reddit credentials and the only one that is single-instance.
import mongoose, { Schema, type Model } from 'mongoose'

export type MoneyVerdict = 'money' | 'maybe' | 'no'

export interface TrendHeadline {
  title: string
  source: string
  url: string
}

export interface TrendSearch {
  term: string
  approxTraffic: string
  rank: number
  money: MoneyVerdict
  matchedOn: string[]
  headlines: TrendHeadline[]
}

export interface TrendRedditPost {
  title: string
  subreddit: string
  score: number
  comments: number
  url: string
  createdAt: string
  money: MoneyVerdict
  matchedOn: string[]
}

export interface TrendNewsItem {
  title: string
  source: string
  url: string
  publishedAt: string
}

export interface TrendSourceStatus {
  ok: boolean
  count: number
  error?: string
}

export interface TrendsSnapshotDoc {
  key: string
  capturedAt: Date
  searches: TrendSearch[]
  reddit: TrendRedditPost[]
  news: TrendNewsItem[]
  sources: {
    googleTrends: TrendSourceStatus
    reddit: TrendSourceStatus
    news: TrendSourceStatus
  }
  counts: {
    searches: number
    moneySearches: number
    reddit: number
    moneyReddit: number
    news: number
  }
}

const TrendsSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    searches: { type: [Schema.Types.Mixed], default: [] },
    reddit: { type: [Schema.Types.Mixed], default: [] },
    news: { type: [Schema.Types.Mixed], default: [] },
    sources: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export const TrendsSnapshotModel: Model<TrendsSnapshotDoc> =
  (mongoose.models.TrendsSnapshot as Model<TrendsSnapshotDoc>) ||
  mongoose.model<TrendsSnapshotDoc>('TrendsSnapshot', TrendsSnapshotSchema, 'trendssnapshots')
