import mongoose, { Schema } from 'mongoose'
import type { RentalSource } from '../../utils/rentals'
import type { RentalAvailabilityEvidence } from '../utils/rentalAvailabilityIdentity'

export interface RentalAvailabilityReportDoc {
  _id: string
  revision: string
  uid: string
  advertId: string
  source: RentalSource
  listingId: string
  evidence: RentalAvailabilityEvidence
  reportedAt: Date
  expiresAt: Date
  withdrawnAt: Date | null
}

const schema = new Schema<RentalAvailabilityReportDoc>(
  {
    _id: { type: String },
    revision: { type: String, required: true },
    uid: { type: String, required: true, select: false },
    advertId: { type: String, required: true },
    source: { type: String, required: true },
    listingId: { type: String, required: true },
    evidence: { type: Schema.Types.Mixed, required: true, select: false },
    reportedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    withdrawnAt: { type: Date, default: null },
  },
  { versionKey: false }
)
schema.index({ uid: 1, advertId: 1 }, { unique: true })
schema.index({ withdrawnAt: 1, expiresAt: 1, advertId: 1 })
// No TTL here: keeping the unique row makes late retries and withdrawals idempotent.
export const RentalAvailabilityReportModel =
  (mongoose.models.RentalAvailabilityReport as mongoose.Model<RentalAvailabilityReportDoc>) ||
  mongoose.model<RentalAvailabilityReportDoc>('RentalAvailabilityReport', schema)

interface AvailabilityQuotaDoc {
  _id: string
  attempts: number
  expiresAt: Date
}
const quotaSchema = new Schema<AvailabilityQuotaDoc>({
  _id: { type: String },
  attempts: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
})
quotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export const RentalAvailabilityQuotaModel =
  (mongoose.models.RentalAvailabilityQuota as mongoose.Model<AvailabilityQuotaDoc>) ||
  mongoose.model<AvailabilityQuotaDoc>('RentalAvailabilityQuota', quotaSchema)
