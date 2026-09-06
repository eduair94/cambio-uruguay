import mongoose, { Schema } from 'mongoose'

interface RentalAlertQuotaDoc {
  _id: string
  attempts: number
  expiresAt: Date
}
const schema = new Schema<RentalAlertQuotaDoc>(
  {
    _id: { type: String },
    attempts: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
)
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export const RentalAlertQuotaModel =
  (mongoose.models.RentalAlertQuota as mongoose.Model<RentalAlertQuotaDoc>) ||
  mongoose.model<RentalAlertQuotaDoc>('RentalAlertQuota', schema)
