import mongoose, { Schema, type Model } from 'mongoose'

// Companion of PhoneModel: one document describing the last celulares run — mirrors
// app/server/models/EquiparMeta.ts / ChairCatalogMeta.ts. The page renders this so a silent source
// outage is visible instead of looking like an empty market.
export interface PhoneMetaDoc {
  key: string
  generatedAt: string
  usdUyu: number
  listings: number
  models: number
  runs: Array<{
    key: string
    label: string
    adapter: string
    listings: number
    ok: boolean
    note: string
  }>
}

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
