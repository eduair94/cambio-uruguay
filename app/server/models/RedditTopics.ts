import mongoose, { Schema, type Model } from 'mongoose'

/**
 * Published snapshot of one recurring money topic on Reddit Uruguay. One doc per topic;
 * the page reads only these, so a Reddit outage leaves the last good snapshot serving.
 * The raw threads live in the shared `RedditPost` ledger (deduped on `redditId`).
 */
export interface RedditTopicThread {
  title: string
  permalink: string
  score: number
  numComments: number
  date: string
  sub: string
}

export interface RedditTopicDoc {
  topicId: string
  label: string
  icon: string
  blurb: string
  total: number
  recent: number
  related: Array<{ label: string; to: string }>
  sample: RedditTopicThread[]
  asOf: Date
}

const ThreadSchema = new Schema<RedditTopicThread>(
  {
    title: { type: String, default: '' },
    permalink: { type: String, default: '' },
    score: { type: Number, default: 0 },
    numComments: { type: Number, default: 0 },
    date: { type: String, default: '' },
    sub: { type: String, default: '' },
  },
  { _id: false }
)

const RedditTopicSchema = new Schema<RedditTopicDoc>(
  {
    topicId: { type: String, required: true },
    label: { type: String, default: '' },
    icon: { type: String, default: '' },
    blurb: { type: String, default: '' },
    total: { type: Number, default: 0 },
    recent: { type: Number, default: 0 },
    related: {
      type: [new Schema({ label: String, to: String }, { _id: false })],
      default: [],
    },
    sample: { type: [ThreadSchema], default: [] },
    asOf: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

RedditTopicSchema.index({ topicId: 1 }, { unique: true })

export const RedditTopicModel: Model<RedditTopicDoc> =
  (mongoose.models.RedditTopic as Model<RedditTopicDoc>) ||
  mongoose.model<RedditTopicDoc>('RedditTopic', RedditTopicSchema)
