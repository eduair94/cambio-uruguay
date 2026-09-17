import mongoose, { Schema, type Model } from 'mongoose'

// One document per category+variant ("monopatin-electrico:urbano", "bicicleta-electrica:plegable"),
// written by the backend job `sync_movilidad.ts`. Mirrors app/server/models/EquiparItem.ts field for
// field: `buildEquiparCatalog` (classes/equipar/catalog.ts) produces exactly an EquiparItem-shaped
// row regardless of which registry (classes/movilidad/registry.ts) it classified against, so this
// document has the same shape as an equipar item — only the collection differs. The collection name
// is pinned because mongoose would pluralise the model name into `movilidaditems` differently from
// what the backend writes.
//
// `newBand` and `usedBand` are separate fields on purpose: they are separate markets, and pooling
// them would publish a number that describes neither.
//
// `history` is daily price points. Any list endpoint reading this collection MUST project it out —
// it is one entry per day since the item was first seen and nothing on a directory card reads it.
interface MovilidadItemDoc {
  key: string
  category: string
  categoryLabel: string
  variant: string
  variantLabel: string
  room: string
  tier: string
  rank: number
  variantRank: number
  image: string | null
  regime: string
  reason: string
  usedOk: boolean
  usedNote: string
  quantity: number
  newBand: { p25: number; median: number; p75: number; min: number; n: number } | null
  usedBand: { p25: number; median: number; p75: number; min: number; n: number } | null
  usedSavingPct: number | null
  products: unknown[]
  offers: unknown[]
  suspectDropped: number
  observedAt: string | null
  history: Array<{ date: string; newMedian: number | null; usedMedian: number | null }>
  firstSeen: string
  lastSeen: string
}

const MovilidadItemSchema = new Schema<MovilidadItemDoc>(
  {
    key: { type: String, required: true },
    category: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    variant: { type: String, required: true },
    variantLabel: { type: String, required: true },
    room: { type: String, required: true },
    tier: { type: String, required: true },
    rank: { type: Number, default: 999 },
    variantRank: { type: Number, default: 1 },
    image: { type: String, default: null },
    regime: { type: String, required: true },
    reason: { type: String, default: '' },
    usedOk: { type: Boolean, default: true },
    usedNote: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    newBand: { type: Schema.Types.Mixed, default: null },
    usedBand: { type: Schema.Types.Mixed, default: null },
    usedSavingPct: { type: Number, default: null },
    products: { type: [Schema.Types.Mixed], default: [] },
    offers: { type: [Schema.Types.Mixed], default: [] },
    suspectDropped: { type: Number, default: 0 },
    observedAt: { type: String, default: null },
    history: { type: [Schema.Types.Mixed], default: [] },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
)

MovilidadItemSchema.index({ key: 1 }, { unique: true })
MovilidadItemSchema.index({ tier: 1, category: 1 })

export const MovilidadItemModel: Model<MovilidadItemDoc> =
  (mongoose.models.MovilidadItem as Model<MovilidadItemDoc>) ||
  mongoose.model<MovilidadItemDoc>('MovilidadItem', MovilidadItemSchema, 'movilidaditems')
