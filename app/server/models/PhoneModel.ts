import mongoose, { Schema, type Model } from 'mongoose'

// One document per phone MODEL (brand+family+storage), written by the backend job
// `sync_phones.ts`. Mirrors app/server/models/EquiparItem.ts / ChairCatalogProduct.ts: a model that
// stops selling is NOT deleted, its price history is the only record of what it used to cost. The
// collection name is pinned because mongoose would pluralise the model name into `phonemodels`
// differently from what the backend writes.
//
// `bands` holds one entry per condition ("new"/"open-box"/"refurbished"/"used"), never pooled: they
// are separate markets, and pooling them would publish a number that describes neither.
// `ambiguousConditions`/`ambiguousDropped` record a condition the backend abstained on — two
// co-equal price populations merged onto one key — rather than arbitrate between them; a page must
// treat a model whose "new" condition is ambiguous with nothing else to publish as unpublishable.
export interface PhoneModelDoc {
  key: string
  slug: string
  brand: string
  brandLabel: string
  family: string
  familyLabel: string
  storageGb: number
  name: string
  image: string | null
  bands: Record<
    string,
    { min: number; p25: number; median: number; p75: number; n: number; sellers: number }
  >
  offers: unknown[]
  newSellers: number
  esimOnlySeen: boolean
  suspectDropped: number
  ambiguousDropped: number
  ambiguousConditions: string[]
  observedAt: string | null
  history: Array<{ date: string; newMin: number | null; newMedian: number | null; sellers: number }>
  firstSeen: string
  lastSeen: string
}

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
    // Up to 365 daily points — real weight on a directory-list document. NOTE for Task 6: any LIST
    // endpoint (the directory, a brand/family listing) must project this field OUT; only a single
    // model's own page needs it.
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
