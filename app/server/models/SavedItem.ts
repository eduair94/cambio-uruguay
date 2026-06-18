import mongoose, { Schema } from 'mongoose'

const RateRefSchema = new Schema(
  {
    label: { type: String, required: true },
    currency: { type: String, required: true, enum: ['USD', 'EUR', 'BRL', 'ARS'] },
    rateKind: { type: String, required: true, enum: ['bestBuy', 'bestSell'] },
    value: { type: Number, required: true },
  },
  { _id: false }
)

const SavedItemSchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    kind: { type: String, required: true, enum: ['conversion', 'tool'] },
    toolSlug: { type: String, required: true },
    title: { type: String, required: true },
    inputs: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed, default: {} },
    snapshot: {
      capturedAt: { type: Date, default: Date.now },
      rates: { type: [RateRefSchema], default: [] },
    },
  },
  { timestamps: true }
)

export const SavedItemModel =
  mongoose.models.SavedItem || mongoose.model('SavedItem', SavedItemSchema)
