import mongoose, { Schema, type Model } from 'mongoose'

/** One product line stored in a user's import cart. */
export interface ImportCartItemDoc {
  id: string
  name: string
  url?: string
  imageUrl?: string
  priceUsd: number
  qty: number
  weightKg?: number
  categoryId: string
}

/** A user's persisted import cart (one document per uid). */
export interface ImportCartDoc {
  uid: string
  items: ImportCartItemDoc[]
  settings: Record<string, unknown>
}

const ImportCartItemSchema = new Schema<ImportCartItemDoc>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String },
    imageUrl: { type: String },
    priceUsd: { type: Number, required: true },
    qty: { type: Number, required: true, default: 1 },
    weightKg: { type: Number },
    categoryId: { type: String, required: true, default: 'general' },
  },
  { _id: false }
)

const ImportCartSchema = new Schema<ImportCartDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    items: { type: [ImportCartItemSchema], default: [] },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export const ImportCartModel: Model<ImportCartDoc> =
  (mongoose.models.ImportCart as Model<ImportCartDoc>) ||
  mongoose.model<ImportCartDoc>('ImportCart', ImportCartSchema)
