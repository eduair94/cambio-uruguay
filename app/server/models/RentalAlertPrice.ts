import mongoose, { Schema, type Model } from 'mongoose'

/** Last and lowest price the alert index has seen for one advert of one saved-search kind. */
export interface RentalAlertPriceDoc {
  _id: string
  amount: number
  currency: 'UYU' | 'USD'
  low: number
  seenAt: Date
}
const schema = new Schema<RentalAlertPriceDoc>(
  {
    _id: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['UYU', 'USD'], required: true },
    low: { type: Number, required: true },
    seenAt: { type: Date, required: true },
  },
  { versionKey: false }
)
// Intentionally no TTL, like the event ledger: a returning advert keeps its lowest price.
export const RentalAlertPriceModel: Model<RentalAlertPriceDoc> =
  (mongoose.models.RentalAlertPrice as Model<RentalAlertPriceDoc>) ||
  mongoose.model<RentalAlertPriceDoc>('RentalAlertPrice', schema, 'rentalalertprices')
