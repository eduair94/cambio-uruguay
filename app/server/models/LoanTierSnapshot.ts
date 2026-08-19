// Reads `loantiersnapshots` — the weekly fact refresh the backend job `currency-loan-tiers`
// upserts on this same app database (classes/models/LoanTierSnapshot.ts is the writer).
// One row, key: "uy-personal-loans".
import mongoose, { Schema, type Model } from 'mongoose'
import type { LoanTierSnapshot } from '../../utils/loanTierlist'

const LoanTierSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    model: { type: String, default: '' },
    patches: { type: [Schema.Types.Mixed], default: [] },
    changes: { type: [Schema.Types.Mixed], default: [] },
    verified: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
)

LoanTierSnapshotSchema.index({ key: 1 }, { unique: true })

export const LoanTierSnapshotModel: Model<LoanTierSnapshot> =
  (mongoose.models.LoanTierSnapshot as Model<LoanTierSnapshot>) ||
  mongoose.model<LoanTierSnapshot>('LoanTierSnapshot', LoanTierSnapshotSchema, 'loantiersnapshots')
