import mongoose, { Schema, type Model } from 'mongoose'
import type { ChairCatalogProduct } from '../../utils/chairCatalog'

// Written by the root backend job `sync_chairs.ts` (see classes/models/ChairCatalogProduct.ts).
// Keep the two schemas in step — tests/appdb/schema_parity.test.ts enforces it.
const ChairCatalogProductSchema = new Schema(
  {
    slug: { type: String, required: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    model: { type: String, default: '' },
    category: { type: String, default: 'unknown' },
    stars: { type: Number, default: null },
    ratingCount: { type: Number, default: 0 },
    ratingSignals: { type: [Schema.Types.Mixed], default: [] },
    confidence: { type: String, default: 'low' },
    redditSlug: { type: String, default: null },
    tier: { type: String, default: null },
    price: { type: Schema.Types.Mixed, default: null },
    offers: { type: [Schema.Types.Mixed], default: [] },
    sellers: { type: Number, default: 0 },
    specs: { type: [Schema.Types.Mixed], default: [] },
    verdict: { type: String, default: '' },
    pros: { type: [Schema.Types.Mixed], default: [] },
    cons: { type: [Schema.Types.Mixed], default: [] },
    evidence: { type: [Schema.Types.Mixed], default: [] },
    reviews: { type: [Schema.Types.Mixed], default: [] },
    images: { type: [Schema.Types.Mixed], default: [] },
    history: { type: [Schema.Types.Mixed], default: [] },
    reviewFingerprint: { type: String, default: '' },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
)

ChairCatalogProductSchema.index({ slug: 1 }, { unique: true })
ChairCatalogProductSchema.index({ lastSeen: -1, sellers: -1 })

export const ChairCatalogProductModel: Model<ChairCatalogProduct> =
  (mongoose.models.ChairCatalogProduct as Model<ChairCatalogProduct>) ||
  mongoose.model<ChairCatalogProduct>(
    'ChairCatalogProduct',
    ChairCatalogProductSchema,
    'chaircatalogproducts'
  )
