import mongoose, { Schema, type Model } from 'mongoose'
import type { EquiparMetaDoc } from '../../utils/equipar'

// Companion of EquiparItem: one document describing the last household-market run, the three
// published baskets, and what could NOT be priced.
//
// `uncovered`, and the `missing` inside each basket, are the honest half of this document. A basket
// total that quietly skipped the fridge is lower than the truth and reads as a better deal, so the
// gaps travel with the number instead of being dropped on the way to the page.
const EquiparMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    listings: { type: Number, default: 0 },
    items: { type: Number, default: 0 },
    runs: { type: [Schema.Types.Mixed], default: [] },
    baskets: { type: [Schema.Types.Mixed], default: [] },
    uncovered: { type: [String], default: [] },
  },
  { timestamps: true }
)

EquiparMetaSchema.index({ key: 1 }, { unique: true })

export const EquiparMetaModel: Model<EquiparMetaDoc> =
  (mongoose.models.EquiparMeta as Model<EquiparMetaDoc>) ||
  mongoose.model<EquiparMetaDoc>('EquiparMeta', EquiparMetaSchema, 'equiparmeta')
