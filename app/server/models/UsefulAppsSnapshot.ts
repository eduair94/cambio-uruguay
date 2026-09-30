// Reads `usefulappssnapshots` — the single `key:"uy"` document the backend job
// `currency-useful-apps` upserts every week (classes/models/UsefulAppsSnapshot.ts is the writer,
// on the SAME app database). The app never writes here.
import mongoose, { Schema, type Model } from 'mongoose'
import type { UsefulAppsSnapshotDoc } from '../../utils/usefulAppsStores'

const UsefulAppsSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    apps: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
    developerChanges: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

export const UsefulAppsSnapshotModel: Model<UsefulAppsSnapshotDoc> =
  (mongoose.models.UsefulAppsSnapshot as Model<UsefulAppsSnapshotDoc>) ||
  mongoose.model<UsefulAppsSnapshotDoc>(
    'UsefulAppsSnapshot',
    UsefulAppsSnapshotSchema,
    'usefulappssnapshots'
  )
