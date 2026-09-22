import mongoose, { Schema, type Model } from 'mongoose'
import type { RentalIndexAllowlistDoc } from '../../utils/rentalIndexHygiene'

// Written by the backend job `currency-gsc` (root `classes/gsc/indexAllowlist.ts`), read here by
// `server/utils/rentalIndexAllowlist.ts`. Field-for-field mirror of
// `classes/models/SeoIndexAllowlist.ts` — the root suite's tests/gsc/index_allowlist.test.ts fails
// if the two drift.
//
// One document per page family (`family: 'alquileres'`): the routes Search Console saw with real
// demand. Only paths, never queries or metrics — nothing here that the sitemap does not already say.
const SeoIndexAllowlistSchema = new Schema(
  {
    family: { type: String, required: true },
    asOf: { type: String, required: true },
    windowDays: { type: Number, required: true },
    minImpressions: { type: Number, required: true },
    urls: { type: [String], default: [] },
    rowCount: { type: Number, default: 0 },
    complete: { type: Boolean, default: false },
  },
  { timestamps: true }
)

SeoIndexAllowlistSchema.index({ family: 1 }, { unique: true })

export const SeoIndexAllowlistModel: Model<RentalIndexAllowlistDoc> =
  (mongoose.models.SeoIndexAllowlist as Model<RentalIndexAllowlistDoc>) ||
  mongoose.model<RentalIndexAllowlistDoc>(
    'SeoIndexAllowlist',
    SeoIndexAllowlistSchema,
    'seoindexallowlists'
  )
