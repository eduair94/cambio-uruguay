import mongoose, { Schema, type Model } from 'mongoose'

export interface AlertDoc {
  uid: string
  currency: 'USD' | 'EUR' | 'BRL' | 'ARS'
  origin: string // 'any' or a specific casa origin key
  kind: 'bestBuy' | 'bestSell'
  op: '<' | '>' | '<=' | '>='
  target: number
  channels: { push: boolean; email: boolean; telegram: boolean }
  active: boolean
  armed: boolean
  lastFiredAt: Date | null
}

const AlertSchema = new Schema<AlertDoc>(
  {
    uid: { type: String, required: true, index: true },
    currency: { type: String, required: true, enum: ['USD', 'EUR', 'BRL', 'ARS'] },
    origin: { type: String, default: 'any' },
    kind: { type: String, required: true, enum: ['bestBuy', 'bestSell'] },
    op: { type: String, required: true, enum: ['<', '>', '<=', '>='] },
    target: { type: Number, required: true },
    channels: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      telegram: { type: Boolean, default: false },
    },
    active: { type: Boolean, default: true },
    armed: { type: Boolean, default: true },
    lastFiredAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export const AlertModel: Model<AlertDoc> =
  (mongoose.models.Alert as Model<AlertDoc>) || mongoose.model<AlertDoc>('Alert', AlertSchema)
