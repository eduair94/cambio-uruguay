import mongoose, { Schema, type Model } from 'mongoose'
import type { RentalMeta } from '../../utils/rentals'

// Written by the root backend job `sync_rentals.ts` (see classes/models/RentalMeta.ts).
// Keep the two schemas in step — tests/appdb/schema_parity.test.ts enforces it.
const RentalMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    mode: { type: String, default: 'full' },
    durationMs: { type: Number, default: 0 },
    usdUyu: { type: Number, default: 0 },
    properties: { type: Number, default: 0 },
    offers: { type: Number, default: 0 },
    merged: { type: Number, default: 0 },
    sources: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

RentalMetaSchema.index({ key: 1 }, { unique: true })

export const RentalMetaModel: Model<RentalMeta> =
  (mongoose.models.RentalMeta as Model<RentalMeta>) ||
  mongoose.model<RentalMeta>('RentalMeta', RentalMetaSchema, 'rentalmetas')
