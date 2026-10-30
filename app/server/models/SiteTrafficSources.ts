import mongoose, { Schema, type Model } from 'mongoose'
import type { TrafficSourcesSnapshot } from '../../utils/trafficSources'

// Lo escribe el job del backend `currency-site-analytics` (raíz `sync_site_analytics.ts`).
// Espejo campo a campo de `classes/models/SiteTrafficSources.ts` — la suite de la raíz
// (tests/appdb/schema_parity.test.ts) falla si los dos se separan.
//
// PÚBLICO: `/api/site-traffic-sources` lo devuelve entero a /origen-del-trafico.
const SiteTrafficSourcesSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    range: { type: Schema.Types.Mixed, required: true },
    history: { type: Schema.Types.Mixed, required: true },
    months: { type: [String], default: [] },
    totals: { type: Schema.Types.Mixed, required: true },
    kinds: { type: [Schema.Types.Mixed], default: [] },
    sources: { type: [Schema.Types.Mixed], default: [] },
    others: { type: Schema.Types.Mixed, default: null },
    referrers: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

SiteTrafficSourcesSchema.index({ key: 1 }, { unique: true })

export const SiteTrafficSourcesModel: Model<TrafficSourcesSnapshot> =
  (mongoose.models.SiteTrafficSources as Model<TrafficSourcesSnapshot>) ||
  mongoose.model<TrafficSourcesSnapshot>(
    'SiteTrafficSources',
    SiteTrafficSourcesSchema,
    'sitetrafficsources'
  )
