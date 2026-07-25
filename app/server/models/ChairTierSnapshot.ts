import mongoose, { Schema, type Model } from 'mongoose'
import type { ChairTierSnapshot } from '../../utils/chairTiers'

const ChairTierSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    subreddit: { type: String, required: true },
    queries: { type: [String], default: [] },
    classifierModel: { type: String, default: '' },
    methodologyVersion: { type: Number, default: 2 },
    corpus: { type: Schema.Types.Mixed, required: true },
    tiers: { type: [Schema.Types.Mixed], default: [] },
    watchlist: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

ChairTierSnapshotSchema.index({ key: 1 }, { unique: true })

export const ChairTierSnapshotModel: Model<ChairTierSnapshot> =
  (mongoose.models.ChairTierSnapshot as Model<ChairTierSnapshot>) ||
  mongoose.model<ChairTierSnapshot>('ChairTierSnapshot', ChairTierSnapshotSchema)
