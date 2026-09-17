import mongoose, { Schema, type Model } from 'mongoose'

// Mirror of classes/models/PriceEventSnapshot.ts (root backend, APP_MONGO_URI) — field-for-field
// transcription guarded by tests/appdb/schema_parity.test.ts. Plan D — CyberLunes/Black Friday: one
// archival document per day (`key: "day:YYYY-MM-DD"`) plus a `key: "current"` pointer overwritten
// every run, read by GET /api/price-events (Task 3).
export interface PriceEventDoc {
  key: string
  label: string
  start: string | null
  end: string | null
  confirmed: boolean
  source: string | null
  note: string
}

export interface PriceEventVerticalStatsDoc {
  eligible: number
  drops: number
  inflated: number
}

export interface PriceEventSellerStatDoc {
  sellerKey: string
  sellerName: string
  withListPrice: number
  inflated: number
  share: number
}

export interface PriceEventAnalysisDoc {
  listingId: string
  vertical: string
  category: string | null
  productKey: string | null
  sellerKey: string
  sellerName: string
  title: string
  url: string
  currency: 'UYU' | 'USD'
  price: number
  listPrice: number | null
  priorMin: number
  priorMax: number
  priorMedian: number
  priorPoints: number
  classes: ('baja-real' | 'tachado-por-encima' | 'precio-de-siempre')[]
  dropPct: number | null
}

export interface PriceEventSnapshotDoc {
  key: string
  day: string
  event: PriceEventDoc | null
  generatedAt: string
  trackingSince: string | null
  analyzed: number
  eligible: number
  byVertical: Record<string, PriceEventVerticalStatsDoc>
  /** The showcase: up to 200 real drops, max 3 per seller — NOT the day's total. Read `dropsCount`
   * below for the headline/30-day series; `topDrops.length` flattens at 200. */
  topDrops: PriceEventAnalysisDoc[]
  /** Full-day total of `baja-real` offers, uncapped. */
  dropsCount: number
  /** Full-day total of `tachado-por-encima` offers, uncapped. */
  inflatedCount: number
  sellers: PriceEventSellerStatDoc[]
}

const PriceEventSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    day: { type: String, required: true },
    event: { type: Schema.Types.Mixed, default: null },
    generatedAt: { type: String, required: true },
    trackingSince: { type: String, default: null },
    analyzed: { type: Number, default: 0 },
    eligible: { type: Number, default: 0 },
    byVertical: { type: Schema.Types.Mixed, default: {} },
    topDrops: { type: [Schema.Types.Mixed], default: [] },
    dropsCount: { type: Number, default: 0 },
    inflatedCount: { type: Number, default: 0 },
    sellers: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

PriceEventSnapshotSchema.index({ key: 1 }, { unique: true })

export const PriceEventSnapshotModel: Model<PriceEventSnapshotDoc> =
  (mongoose.models.PriceEventSnapshot as Model<PriceEventSnapshotDoc>) ||
  mongoose.model<PriceEventSnapshotDoc>('PriceEventSnapshot', PriceEventSnapshotSchema, 'priceeventsnapshots')
