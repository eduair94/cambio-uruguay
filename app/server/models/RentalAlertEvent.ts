import mongoose, { Schema, type Model } from 'mongoose'
import type { RentalAlertKind } from '../../utils/rentalAlerts'

export interface RentalAlertEventDoc {
  _id: string
  kind: RentalAlertKind
  candidateId: string
  discoveredAt: Date
  baseline: boolean
}
const schema = new Schema<RentalAlertEventDoc>(
  {
    _id: { type: String, required: true },
    kind: { type: String, required: true },
    candidateId: { type: String, required: true },
    discoveredAt: { type: Date, required: true },
    baseline: { type: Boolean, required: true },
  },
  { versionKey: false }
)
schema.index({ kind: 1, baseline: 1, discoveredAt: 1, candidateId: 1 })
// Intentionally no TTL: returning adverts and physical splits must not become new again.
export const RentalAlertEventModel: Model<RentalAlertEventDoc> =
  (mongoose.models.RentalAlertEvent as Model<RentalAlertEventDoc>) ||
  mongoose.model<RentalAlertEventDoc>('RentalAlertEvent', schema, 'rentalalertevents')

export interface RentalAlertIndexDoc {
  _id: RentalAlertKind
  scannedAt: Date
  baselineAt: Date
  algorithm: string
  sourceVersion: string
}
const indexSchema = new Schema<RentalAlertIndexDoc>(
  {
    _id: { type: String, required: true },
    scannedAt: { type: Date, required: true },
    baselineAt: { type: Date, required: true },
    algorithm: { type: String, required: true },
    sourceVersion: { type: String, required: true },
  },
  { versionKey: false }
)
export const RentalAlertIndexModel: Model<RentalAlertIndexDoc> =
  (mongoose.models.RentalAlertIndex as Model<RentalAlertIndexDoc>) ||
  mongoose.model<RentalAlertIndexDoc>('RentalAlertIndex', indexSchema, 'rentalalertindexes')
