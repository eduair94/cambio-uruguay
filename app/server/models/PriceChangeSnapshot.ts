import mongoose, { Schema, type Model } from 'mongoose'

// Espejo de classes/models/PriceChangeSnapshot.ts (backend, APP_MONGO_URI) — transcripción campo a
// campo que vigila tests/appdb/schema_parity.test.ts. Lo escribe `currency-price-changes` y lo lee
// GET /api/price-changes para `/cambios-de-precio-uruguay`: un documento `current` (la foto de hoy)
// más un `day:YYYY-MM-DD` de archivo por día, podado a 400 días.
export interface PriceChangeSnapshotDoc {
  key: string
  day: string
  generatedAt: string
  windowDays: number
  verticals: unknown[]
  changes: unknown[]
}

const PriceChangeSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    day: { type: String, required: true },
    generatedAt: { type: String, required: true },
    windowDays: { type: Number, required: true },
    verticals: { type: [Schema.Types.Mixed], default: [] },
    changes: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

PriceChangeSnapshotSchema.index({ key: 1 }, { unique: true })

export const PriceChangeSnapshotModel: Model<PriceChangeSnapshotDoc> =
  (mongoose.models.PriceChangeSnapshot as Model<PriceChangeSnapshotDoc>) ||
  mongoose.model<PriceChangeSnapshotDoc>(
    'PriceChangeSnapshot',
    PriceChangeSnapshotSchema,
    'pricechangesnapshots'
  )
