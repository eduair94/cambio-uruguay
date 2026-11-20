// Reads `lrmsnapshots` — the single `key:"uy"` document the backend job `currency-lrm` upserts
// (classes/models/LrmSnapshot.ts is the writer, on the SAME app database).
//
// The app never writes here: the BCU's spreadsheet is read by the backend, which is the only
// process that is single-instance and allowed to spend time on network I/O on a schedule. The
// shape lives in `utils/lrm.ts` (pure, so the page and its tests share it).
import mongoose, { Schema, type Model } from 'mongoose'
import type { LrmSnapshotDoc } from '../../utils/lrm'

const LrmSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    sources: { type: Schema.Types.Mixed, default: {} },
    latest: { type: [Schema.Types.Mixed], default: [] },
    recent: { type: [Schema.Types.Mixed], default: [] },
    treasury: { type: [Schema.Types.Mixed], default: [] },
    calendar: { type: Schema.Types.Mixed, default: null },
    counts: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export const LrmSnapshotModel: Model<LrmSnapshotDoc> =
  (mongoose.models.LrmSnapshot as Model<LrmSnapshotDoc>) ||
  mongoose.model<LrmSnapshotDoc>('LrmSnapshot', LrmSnapshotSchema, 'lrmsnapshots')
