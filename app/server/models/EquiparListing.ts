import mongoose, { Schema, type Model } from 'mongoose'
import type { EquiparListingDoc } from '../../utils/equiparProductos'

// One document per listing the equipar harvest kept (every source, every category), written by the
// backend job `sync_equipar.ts` — see classes/models/EquiparListing.ts for the field-by-field story.
// The collection name is pinned because mongoose would pluralise the model name differently from
// what the backend writes. `tests/appdb/schema_parity.test.ts` keeps the two sides' fields equal.
const EquiparListingSchema = new Schema(
  {
    listingId: { type: String, required: true },
    category: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    variant: { type: String, required: true },
    variantLabel: { type: String, required: true },
    tier: { type: String, required: true },
    room: { type: String, required: true },
    rank: { type: Number, default: 999 },
    variantRank: { type: Number, default: 1 },
    regime: { type: String, required: true },
    condition: { type: String, required: true },
    source: { type: String, required: true },
    sellerKey: { type: String, required: true },
    sellerName: { type: String, required: true },
    channel: { type: String, default: '' },
    officialStore: { type: Boolean, default: false },
    brand: { type: String, default: '' },
    brandKey: { type: String, default: '' },
    title: { type: String, required: true },
    url: { type: String, required: true },
    image: { type: String, default: null },
    price: { type: Number, required: true },
    currency: { type: String, required: true },
    priceUyu: { type: Number, required: true },
    listPrice: { type: Number, default: null },
    location: { type: String, default: null },
    freeShipping: { type: Boolean, default: null },
    suspect: { type: Boolean, default: false },
    observedAt: { type: String, required: true },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
)

EquiparListingSchema.index({ listingId: 1 }, { unique: true })
EquiparListingSchema.index({ category: 1, lastSeen: 1 })
EquiparListingSchema.index({ lastSeen: 1, priceUyu: 1 })
EquiparListingSchema.index({ brandKey: 1 })
EquiparListingSchema.index({ sellerKey: 1 })

export const EquiparListingModel: Model<EquiparListingDoc> =
  (mongoose.models.EquiparListing as Model<EquiparListingDoc>) ||
  mongoose.model<EquiparListingDoc>('EquiparListing', EquiparListingSchema, 'equiparlistings')
