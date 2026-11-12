// Reads `armadorsnapshots` — the single `key:"mvd"` document the backend job `currency-armadores`
// upserts every day (classes/models/ArmadorSnapshot.ts is the writer, on the SAME app database).
// The app never writes here.
import mongoose, { Schema, type Model } from 'mongoose'
import type { ArmadorSnapshotDoc } from '../../utils/armadores'

const ArmadorSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    googleAt: { type: String, default: null },
    editorialReviewedAt: { type: String, default: null },
    entries: { type: [Schema.Types.Mixed], default: [] },
    counts: { type: Schema.Types.Mixed, default: {} },
    notes: { type: [String], default: [] },
  },
  { timestamps: true }
)

export const ArmadorSnapshotModel: Model<ArmadorSnapshotDoc> =
  (mongoose.models.ArmadorSnapshot as Model<ArmadorSnapshotDoc>) ||
  mongoose.model<ArmadorSnapshotDoc>('ArmadorSnapshot', ArmadorSnapshotSchema, 'armadorsnapshots')
