import mongoose, { Schema, type Model } from 'mongoose'
import type { RedditBotStats } from '../../utils/redditStats'

// Escrito por el job del backend `currency-reddit-stats` (raíz `sync_reddit_stats.ts`), leído acá.
// Espejo campo por campo de `classes/models/RedditBotStats.ts` — el test
// tests/appdb/schema_parity.test.ts de la raíz falla si los dos se separan.
//
// `Schema.Types.Mixed` en los subdocumentos a propósito, igual que SiteAnalyticsSnapshot: la app
// sólo lee, el tipo real vive en `utils/redditStats.ts`, y duplicar acá la forma de cada fila
// significaría dos lugares donde equivocarse en vez de uno.
const RedditBotStatsSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: Date, default: null },
    account: { type: String, default: '' },
    totals: { type: Schema.Types.Mixed, default: {} },
    since: { type: String, default: '' },
    days: { type: [Schema.Types.Mixed], default: [] },
    bySub: { type: [Schema.Types.Mixed], default: [] },
    byPage: { type: [Schema.Types.Mixed], default: [] },
    byRejectReason: { type: [Schema.Types.Mixed], default: [] },
    answers: { type: [Schema.Types.Mixed], default: [] },
    openQuestions: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

RedditBotStatsSchema.index({ key: 1 }, { unique: true })

export const RedditBotStatsModel: Model<RedditBotStats> =
  (mongoose.models.RedditBotStats as Model<RedditBotStats>) ||
  mongoose.model<RedditBotStats>('RedditBotStats', RedditBotStatsSchema, 'redditbotstats')
