import mongoose, { Schema, type Model } from 'mongoose'
import type { SiteRevenueSnapshot } from '../../utils/siteRevenue'

// Lo escribe el job del backend `currency-site-analytics` (raíz `sync_site_analytics.ts`).
// Espejo campo a campo de `classes/models/SiteRevenueSnapshot.ts` — la suite de la raíz
// (tests/appdb/schema_parity.test.ts) falla si los dos se separan.
//
// NO ES PÚBLICO. Dice cuánto factura el sitio. Lo sirve `/api/site-revenue` con `requireAdmin`, y
// ninguna página lo renderiza para un visitante.
const SiteRevenueSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    currency: { type: String, default: 'USD' },
    range: { type: Schema.Types.Mixed, required: true },
    totals: { type: Schema.Types.Mixed, required: true },
    families: { type: [Schema.Types.Mixed], default: [] },
    topPages: { type: [Schema.Types.Mixed], default: [] },
    daily: { type: [Schema.Types.Mixed], default: [] },
    pending: { type: Boolean, default: true },
  },
  { timestamps: true }
)

SiteRevenueSnapshotSchema.index({ key: 1 }, { unique: true })

export const SiteRevenueSnapshotModel: Model<SiteRevenueSnapshot> =
  (mongoose.models.SiteRevenueSnapshot as Model<SiteRevenueSnapshot>) ||
  mongoose.model<SiteRevenueSnapshot>('SiteRevenueSnapshot', SiteRevenueSnapshotSchema)
