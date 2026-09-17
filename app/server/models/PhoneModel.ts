import mongoose, { Schema, type Model } from 'mongoose'
import type { PhoneModelDoc } from '../../utils/phones'

// One document per phone MODEL (brand+family+storage), written by the backend job
// `sync_phones.ts`. Mirrors app/server/models/EquiparItem.ts / ChairCatalogProduct.ts: a model that
// stops selling is NOT deleted, its price history is the only record of what it used to cost. The
// collection name is pinned because mongoose would pluralise the model name into `phonemodels`
// differently from what the backend writes.
//
// `PhoneModelDoc` (and the condition/band/offer shapes it is built from) lives in
// `app/utils/phones.ts` — Task 6's own mirror of `classes/phones/{types,catalog}.ts` — not here,
// the same direction `EquiparItem.ts`/`ChairCatalogProduct.ts` already use for their own Doc types.
// See that file's own doc comments for `bands`/`ambiguousConditions`/`ambiguousDropped`.
const PhoneModelSchema = new Schema(
  {
    key: { type: String, required: true },
    slug: { type: String, required: true },
    brand: { type: String, required: true },
    brandLabel: { type: String, required: true },
    family: { type: String, required: true },
    familyLabel: { type: String, required: true },
    storageGb: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String, default: null },
    bands: { type: Schema.Types.Mixed, default: {} },
    offers: { type: [Schema.Types.Mixed], default: [] },
    newSellers: { type: Number, default: 0 },
    esimOnlySeen: { type: Boolean, default: false },
    suspectDropped: { type: Number, default: 0 },
    ambiguousDropped: { type: Number, default: 0 },
    ambiguousConditions: { type: [String], default: [] },
    observedAt: { type: String, default: null },
    // Up to 365 daily points — real weight on a directory-list document. Any LIST endpoint (the
    // directory, a brand/family listing) must project this field OUT via PHONE_LIST_PROJECTION
    // (app/utils/phones.ts); only a single model's own page needs it.
    history: { type: [Schema.Types.Mixed], default: [] },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
)

PhoneModelSchema.index({ key: 1 }, { unique: true })
PhoneModelSchema.index({ brand: 1, lastSeen: -1 })

export const PhoneModelModel: Model<PhoneModelDoc> =
  (mongoose.models.PhoneModel as Model<PhoneModelDoc>) ||
  mongoose.model<PhoneModelDoc>('PhoneModel', PhoneModelSchema, 'phonemodels')
