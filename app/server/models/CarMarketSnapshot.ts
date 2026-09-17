import mongoose, { Schema } from 'mongoose'
import type { PublicCarMarketSnapshot } from '../../utils/carsPublic'

interface CarMarketSnapshotDocument {
  key: string
  generatedAt: string
  snapshot: PublicCarMarketSnapshot
}

const CarMarketSnapshotSchema = new Schema<CarMarketSnapshotDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarMarketSnapshotModel =
  (mongoose.models.CarMarketSnapshot as mongoose.Model<CarMarketSnapshotDocument>) ||
  mongoose.model<CarMarketSnapshotDocument>(
    'CarMarketSnapshot',
    CarMarketSnapshotSchema,
    'carmarketsnapshots'
  )
