import mongoose, { Schema, type Model } from 'mongoose'
import type { RevenuePlanSnapshot } from '../../utils/revenuePlan'

// Lo escribe el job de backend `currency-revenue-plan` (raíz `sync_revenue_plan.ts`), se lee acá.
// Espejo campo por campo de `classes/models/RevenuePlanSnapshot.ts` — la suite de la raíz
// (tests/appdb/schema_parity.test.ts) falla si los dos se separan.
//
// NO ES PÚBLICO, y es el documento más sensible de los tres tableros privados: cruza las consultas
// que la gente tipea con cuánto factura cada familia de página. `/api/revenue-plan` lo gatea con la
// cuenta del dueño; ninguna página lo renderiza para un visitante.
const RevenuePlanSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    searchWindow: { type: Schema.Types.Mixed, default: {} },
    revenueWindow: { type: Schema.Types.Mixed, default: {} },
    currency: { type: String, default: 'USD' },
    siteRpm: { type: Number, default: 0 },
    siteUsdPerClick: { type: Number, default: 0 },
    revenuePending: { type: Boolean, default: true },
    totalUpsideUsd: { type: Number, default: 0 },
    actions: { type: [Schema.Types.Mixed], default: [] },
    defend: { type: [Schema.Types.Mixed], default: [] },
    families: { type: [Schema.Types.Mixed], default: [] },
    experiments: { type: [Schema.Types.Mixed], default: [] },
    alerts: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

RevenuePlanSnapshotSchema.index({ key: 1 }, { unique: true })

export const RevenuePlanSnapshotModel: Model<RevenuePlanSnapshot> =
  (mongoose.models.RevenuePlanSnapshot as Model<RevenuePlanSnapshot>) ||
  mongoose.model<RevenuePlanSnapshot>('RevenuePlanSnapshot', RevenuePlanSnapshotSchema)
