import mongoose, { Schema, type Model } from 'mongoose'

export interface DriverSnapshotDoc {
  date: string // 'YYYY-MM-DD' America/Montevideo
  values: Map<string, number>
}

const DriverSnapshotSchema = new Schema<DriverSnapshotDoc>(
  {
    date: { type: String, required: true, unique: true, index: true },
    values: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
)

export const DriverSnapshotModel: Model<DriverSnapshotDoc> =
  (mongoose.models.DriverSnapshot as Model<DriverSnapshotDoc>) ||
  mongoose.model<DriverSnapshotDoc>('DriverSnapshot', DriverSnapshotSchema)
