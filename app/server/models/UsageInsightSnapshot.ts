import mongoose, { Schema, type Model } from 'mongoose'
import type { UsageInsightSnapshot } from '../../utils/usageInsights'

// Lo escribe el job del backend `currency-usage-insights` (raíz `sync_usage_insights.ts`).
// Espejo campo a campo de `classes/models/UsageInsightSnapshot.ts` — la suite de la raíz
// (tests/appdb/schema_parity.test.ts) falla si los dos se separan.
//
// NO ES PÚBLICO. Lo sirve `/api/usage-insights` con `requireAdmin` a /estadisticas-de-uso. La misma
// colección guarda `{ key: 'state' }`, la memoria del job: la ruta lee sólo `key: 'site'` y además
// excluye `state`, así que esa memoria nunca sale.
const UsageInsightSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    schemaVersion: { type: Number, default: 1 },
    asOf: { type: String, default: null },
    day: { type: String, default: null },
    timezone: { type: String, default: 'America/Montevideo' },
    window: { type: Schema.Types.Mixed, default: null },
    run: { type: Schema.Types.Mixed, default: null },
    sources: { type: Schema.Types.Mixed, default: null },
    pages: { type: [Schema.Types.Mixed], default: [] },
    signals: { type: [Schema.Types.Mixed], default: [] },
    trend: { type: Schema.Types.Mixed, default: null },
    consentCheck: { type: Schema.Types.Mixed, default: null },
    state: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, minimize: false }
)

UsageInsightSnapshotSchema.index({ key: 1 }, { unique: true })

export const UsageInsightSnapshotModel: Model<UsageInsightSnapshot> =
  (mongoose.models.UsageInsightSnapshot as Model<UsageInsightSnapshot>) ||
  mongoose.model<UsageInsightSnapshot>(
    'UsageInsightSnapshot',
    UsageInsightSnapshotSchema,
    'usageinsightsnapshots'
  )
