import mongoose, { Schema, type Model } from 'mongoose'
import type { ChairCatalogMeta } from '../../utils/chairCatalog'

// Companion of ChairCatalogProduct: one document describing the last harvest, including how each
// source behaved. The collection name is pinned because mongoose would pluralise the model name
// into `chaircatalogmetas`, which is not what the backend writes.
const ChairCatalogMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    products: { type: Number, default: 0 },
    offers: { type: Number, default: 0 },
    sellers: { type: Number, default: 0 },
    sources: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

ChairCatalogMetaSchema.index({ key: 1 }, { unique: true })

export const ChairCatalogMetaModel: Model<ChairCatalogMeta> =
  (mongoose.models.ChairCatalogMeta as Model<ChairCatalogMeta>) ||
  mongoose.model<ChairCatalogMeta>('ChairCatalogMeta', ChairCatalogMetaSchema, 'chaircatalogmeta')
