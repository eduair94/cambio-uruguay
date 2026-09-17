import mongoose, { Schema } from 'mongoose'
import type { PublicCarOpportunitySnapshot } from '../../utils/carsPublic'

interface CarOpportunitySnapshotDocument {
  key: 'used'
  generatedAt: string
  snapshot: PublicCarOpportunitySnapshot
}

const CarOpportunitySnapshotSchema = new Schema<CarOpportunitySnapshotDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarOpportunitySnapshotModel =
  (mongoose.models.CarOpportunitySnapshot as mongoose.Model<CarOpportunitySnapshotDocument>) ||
  mongoose.model<CarOpportunitySnapshotDocument>(
    'CarOpportunitySnapshot',
    CarOpportunitySnapshotSchema,
    'caropportunitysnapshots'
  )
