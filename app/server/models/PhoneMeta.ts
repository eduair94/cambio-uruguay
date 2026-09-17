import mongoose, { Schema, type Model } from 'mongoose'
import type { PhoneMetaDoc } from '../../utils/phones'

// Companion of PhoneModel: one document describing the last celulares run — mirrors
// app/server/models/EquiparMeta.ts / ChairCatalogMeta.ts. The page renders this so a silent source
// outage is visible instead of looking like an empty market.
//
// `PhoneMetaDoc` lives in `app/utils/phones.ts` (Task 6), not here — see PhoneModel.ts's own comment
// for why.
const PhoneMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    listings: { type: Number, default: 0 },
    models: { type: Number, default: 0 },
    runs: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

PhoneMetaSchema.index({ key: 1 }, { unique: true })

export const PhoneMetaModel: Model<PhoneMetaDoc> =
  (mongoose.models.PhoneMeta as Model<PhoneMetaDoc>) ||
  mongoose.model<PhoneMetaDoc>('PhoneMeta', PhoneMetaSchema, 'phonemeta')
