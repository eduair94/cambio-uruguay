import mongoose, { Schema, type Model } from 'mongoose'
export interface RentalAlertLeaseDoc {
  _id: string
  owner: string
  expiresAt: Date
}
const schema = new Schema<RentalAlertLeaseDoc>(
  { _id: String, owner: String, expiresAt: Date },
  { versionKey: false }
)
export const RentalAlertLeaseModel: Model<RentalAlertLeaseDoc> =
  (mongoose.models.RentalAlertLease as Model<RentalAlertLeaseDoc>) ||
  mongoose.model<RentalAlertLeaseDoc>('RentalAlertLease', schema, 'rentalalertleases')
