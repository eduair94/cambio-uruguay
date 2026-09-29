import mongoose, { Schema, type Model } from 'mongoose'
import type { PageRankingSnapshot } from '../../utils/pageRanking'

// Lo escribe el job del backend `currency-site-analytics` (raíz `sync_site_analytics.ts`).
// Espejo campo a campo de `classes/models/SitePageRanking.ts` — la suite de la raíz
// (tests/appdb/schema_parity.test.ts) falla si los dos se separan.
//
// NO ES PÚBLICO. Lo sirve `/api/site-page-ranking` con `requireAdmin` a /estadisticas-por-pagina.
const SitePageRankingSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    timezone: { type: String, default: 'America/Montevideo' },
    range: { type: Schema.Types.Mixed, required: true },
    weeks: { type: [Schema.Types.Mixed], default: [] },
    totals: { type: Schema.Types.Mixed, required: true },
    pageCount: { type: Number, default: 0 },
    truncated: { type: Boolean, default: false },
    pages: { type: [Schema.Types.Mixed], default: [] },
    families: { type: [Schema.Types.Mixed], default: [] },
    focus: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

SitePageRankingSchema.index({ key: 1 }, { unique: true })

export const SitePageRankingModel: Model<PageRankingSnapshot> =
  (mongoose.models.SitePageRanking as Model<PageRankingSnapshot>) ||
  mongoose.model<PageRankingSnapshot>('SitePageRanking', SitePageRankingSchema, 'sitepagerankings')
