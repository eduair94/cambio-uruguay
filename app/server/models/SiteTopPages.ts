import mongoose, { Schema, type Model } from 'mongoose'
import type { TopPagesSnapshot } from '../../utils/topPages'

// Lo escribe el job del backend `currency-site-analytics` (raíz `sync_site_analytics.ts`).
// Espejo campo a campo de `classes/models/SiteTopPages.ts` — la suite de la raíz
// (tests/appdb/schema_parity.test.ts) falla si los dos se separan.
//
// PÚBLICO: `/api/site-top-pages` lo devuelve entero a /paginas-mas-visitadas. Lo privado del
// ranking vive en `sitepagerankings` y no se lee desde ninguna ruta pública.
const SiteTopPagesSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    range: { type: Schema.Types.Mixed, required: true },
    weeks: { type: [Schema.Types.Mixed], default: [] },
    totals: { type: Schema.Types.Mixed, required: true },
    pages: { type: [Schema.Types.Mixed], default: [] },
    rising: { type: [Schema.Types.Mixed], default: [] },
    aiCited: { type: [Schema.Types.Mixed], default: [] },
    topics: { type: [Schema.Types.Mixed], default: [] },
    guides: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

SiteTopPagesSchema.index({ key: 1 }, { unique: true })

export const SiteTopPagesModel: Model<TopPagesSnapshot> =
  (mongoose.models.SiteTopPages as Model<TopPagesSnapshot>) ||
  mongoose.model<TopPagesSnapshot>('SiteTopPages', SiteTopPagesSchema, 'sitetoppages')
