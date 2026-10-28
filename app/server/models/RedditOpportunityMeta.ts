import mongoose, { Schema, type Model } from 'mongoose'

// La última corrida de `currency-reddit-opportunities`. Espejo de
// `classes/models/RedditOpportunityMeta.ts` (tests/appdb/schema_parity.test.ts en la raíz).
export interface RedditOpportunityMetaRow {
  key: string
  asOf: Date
  windowDays: number
  subs: Array<{ sub: string; fetched: number; candidates: number; judged: number; recommended: number }>
  judged: number
  judgeFailures: number
  recommendedTotal: number
  notes: string[]
}

const RedditOpportunityMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: Date, required: true },
    windowDays: { type: Number, default: 30 },
    subs: { type: [Schema.Types.Mixed], default: [] },
    judged: { type: Number, default: 0 },
    judgeFailures: { type: Number, default: 0 },
    recommendedTotal: { type: Number, default: 0 },
    notes: { type: [String], default: [] },
  },
  { timestamps: true }
)

RedditOpportunityMetaSchema.index({ key: 1 }, { unique: true })

export const RedditOpportunityMetaModel: Model<RedditOpportunityMetaRow> =
  (mongoose.models.RedditOpportunityMeta as Model<RedditOpportunityMetaRow>) ||
  mongoose.model<RedditOpportunityMetaRow>(
    'RedditOpportunityMeta',
    RedditOpportunityMetaSchema,
    'redditopportunitymetas'
  )
