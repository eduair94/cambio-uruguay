import mongoose, { Schema, type Model } from 'mongoose'
import type { EquiparItemDoc } from '../../utils/equipar'

// One document per category+variant of the household catalogue ("heladera:media", "olla:chica"),
// written by the backend job `sync_equipar.ts`. The collection name is pinned because mongoose
// would pluralise the model name into `equiparitems` differently from what the backend writes.
//
// `newBand` and `usedBand` are separate fields on purpose: they are separate markets, and pooling
// them would publish a number that describes neither.
const EquiparItemSchema = new Schema(
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

EquiparItemSchema.index({ key: 1 }, { unique: true })
EquiparItemSchema.index({ tier: 1, category: 1 })

export const EquiparItemModel: Model<EquiparItemDoc> =
  (mongoose.models.EquiparItem as Model<EquiparItemDoc>) ||
  mongoose.model<EquiparItemDoc>('EquiparItem', EquiparItemSchema, 'equiparitems')
