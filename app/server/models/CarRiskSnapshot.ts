import mongoose, { Schema } from 'mongoose'
import type { PublicCarRiskSnapshot } from '../../utils/carsPublic'

interface CarRiskSnapshotDocument {
  key: 'used'
  generatedAt: string
  snapshot: PublicCarRiskSnapshot
}

const CarRiskSnapshotSchema = new Schema<CarRiskSnapshotDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarRiskSnapshotModel =
  (mongoose.models.CarRiskSnapshot as mongoose.Model<CarRiskSnapshotDocument>) ||
  mongoose.model<CarRiskSnapshotDocument>(
    'CarRiskSnapshot',
    CarRiskSnapshotSchema,
    'carrisksnapshots'
  )
