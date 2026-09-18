import mongoose, { Schema } from 'mongoose'
import type { PublicCarReportSnapshot } from '../../utils/carsPublic'

interface CarReportSnapshotDocument {
  key: 'used'
  generatedAt: string
  snapshot: PublicCarReportSnapshot
}

const CarReportSnapshotSchema = new Schema<CarReportSnapshotDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarReportSnapshotModel =
  (mongoose.models.CarReportSnapshot as mongoose.Model<CarReportSnapshotDocument>) ||
  mongoose.model<CarReportSnapshotDocument>(
    'CarReportSnapshot',
    CarReportSnapshotSchema,
    'carreportsnapshots'
  )
