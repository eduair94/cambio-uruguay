import mongoose, { Schema, type Model } from 'mongoose'
import type { SentimentLabel, ThemeId } from '../../utils/redditSentiment'

/**
 * The published snapshot: one doc per entity, overwritten by each `reddit:sentiment` run.
 * The page reads THIS (never Reddit), so a Reddit outage or a missing key just means the
 * last good snapshot keeps serving.
 */
export interface RedditSentimentDoc {
  entityId: string
  name: string
  mentions: number
  positive: number
  negative: number
  neutral: number
  /** positive + negative. The sample that actually backs `net` — and the gate for a verdict. */
  opinions: number
  net: number
  label: SentimentLabel
  themes: Array<{ theme: ThemeId; count: number }>
  quotes: Array<{
    text: string
    permalink: string
    date: string
    score: number
    sub: string
    polarity: number
  }>
  /** Optional AI prose over the SAME quotes — never moves a number. */
  summary: string | null
  /** Newest mention we have, so the UI can say how fresh the corpus is. */
  latestMentionDate: string | null
  asOf: Date
}

const RedditSentimentSchema = new Schema<RedditSentimentDoc>(
  {
    entityId: { type: String, required: true },
    name: { type: String, default: '' },
    mentions: { type: Number, default: 0 },
    positive: { type: Number, default: 0 },
    negative: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    opinions: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    label: { type: String, default: 'sin datos' },
    themes: { type: [{ _id: false, theme: String, count: Number }], default: [] },
    quotes: {
      type: [
        {
          _id: false,
          text: String,
          permalink: String,
          date: String,
          score: Number,
          sub: String,
          polarity: Number,
        },
      ],
      default: [],
    },
    summary: { type: String, default: null },
    latestMentionDate: { type: String, default: null },
    asOf: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

RedditSentimentSchema.index({ entityId: 1 }, { unique: true })

export const RedditSentimentModel: Model<RedditSentimentDoc> =
  (mongoose.models.RedditSentiment as Model<RedditSentimentDoc>) ||
  mongoose.model<RedditSentimentDoc>('RedditSentiment', RedditSentimentSchema)
