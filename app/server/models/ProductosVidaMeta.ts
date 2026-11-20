import mongoose, { Schema, type Model } from 'mongoose'

// Compañero de ProductosVidaItem: un solo documento (`key` = PRODUCTOS_VIDA_META_KEY) con la última
// corrida de `sync_productos_vida.ts`. Misma forma que MovilidadMeta. `runs` lleva exactamente una
// entrada, la de Mercado Libre, y `uncovered` las categorías que no tuvieron banda en esa corrida.
interface ProductosVidaMetaDoc {
  key: string
  generatedAt: string
  usdUyu: number
  listings: number
  items: number
  runs: unknown[]
  uncovered: string[]
}

const ProductosVidaMetaSchema = new Schema<ProductosVidaMetaDoc>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    listings: { type: Number, default: 0 },
    items: { type: Number, default: 0 },
    runs: { type: [Schema.Types.Mixed], default: [] },
    uncovered: { type: [String], default: [] },
  },
  { timestamps: true }
)

ProductosVidaMetaSchema.index({ key: 1 }, { unique: true })

export const ProductosVidaMetaModel: Model<ProductosVidaMetaDoc> =
  (mongoose.models.ProductosVidaMeta as Model<ProductosVidaMetaDoc>) ||
  mongoose.model<ProductosVidaMetaDoc>(
    'ProductosVidaMeta',
    ProductosVidaMetaSchema,
    'productosvidameta'
  )
