import mongoose, { Schema } from 'mongoose'
import type { PublicCarAdvisorSnapshot } from '../../utils/carsPublic'

interface CarAdvisorSnapshotDocument {
  key: 'used'
  generatedAt: string
  snapshot: PublicCarAdvisorSnapshot
}

const CarAdvisorSnapshotSchema = new Schema<CarAdvisorSnapshotDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarAdvisorSnapshotModel =
  (mongoose.models.CarAdvisorSnapshot as mongoose.Model<CarAdvisorSnapshotDocument>) ||
  mongoose.model<CarAdvisorSnapshotDocument>(
    'CarAdvisorSnapshot',
    CarAdvisorSnapshotSchema,
    'caradvisorsnapshots'
  )
