import mongoose, { Schema, type Model } from 'mongoose'

export interface SavedRateRefDoc {
  label: string
  currency: 'USD' | 'EUR' | 'BRL' | 'ARS'
  rateKind: 'bestBuy' | 'bestSell'
  value: number
}

export interface SavedItemDoc {
  uid: string
  kind: 'conversion' | 'tool'
  toolSlug: string
  title: string
  inputs: Record<string, unknown>
  result: Record<string, unknown>
  snapshot: {
    capturedAt: Date
    rates: SavedRateRefDoc[]
  }
}

const RateRefSchema = new Schema<SavedRateRefDoc>(
  {
    label: { type: String, required: true },
    currency: { type: String, required: true, enum: ['USD', 'EUR', 'BRL', 'ARS'] },
    rateKind: { type: String, required: true, enum: ['bestBuy', 'bestSell'] },
    value: { type: Number, required: true },
  },
  { _id: false }
)

const SavedItemSchema = new Schema<SavedItemDoc>(
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

export const SavedItemModel: Model<SavedItemDoc> =
  (mongoose.models.SavedItem as Model<SavedItemDoc>) ||
  mongoose.model<SavedItemDoc>('SavedItem', SavedItemSchema)
