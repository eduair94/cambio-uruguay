import mongoose, { Schema, type Model } from 'mongoose'

// Un documento por categoría+variante («calientacama:una-plaza») de
// /productos-que-te-cambian-la-vida-uruguay, escrito por el job `sync_productos_vida.ts`. Es
// exactamente un EquiparItem más el historial, la misma lista de campos que MovilidadItem:
// `buildEquiparCatalog` (classes/equipar/catalog.ts) devuelve esa forma con cualquier registro que
// se le inyecte (classes/productosvida/registry.ts). El nombre de la colección va pinneado porque
// mongoose pluralizaría el del modelo distinto de lo que escribe el backend;
// `tests/appdb/schema_parity.test.ts` mantiene los dos lados iguales.
//
// `history` es un punto por día. La ruta `GET /api/productos-vida` nunca lo selecciona, ni
// `products` ni lo usado: la página de v1 sólo dibuja la banda nueva y cuatro ofertas.
interface ProductosVidaItemDoc {
  key: string
  category: string
  categoryLabel: string
  variant: string
  variantLabel: string
  room: string
  tier: string
  rank: number
  variantRank: number
  image: string | null
  regime: string
  reason: string
  usedOk: boolean
  usedNote: string
  quantity: number
  newBand: { p25: number; median: number; p75: number; min: number; n: number } | null
  usedBand: { p25: number; median: number; p75: number; min: number; n: number } | null
  usedSavingPct: number | null
  products: unknown[]
  offers: unknown[]
  suspectDropped: number
  observedAt: string | null
  history: Array<{ date: string; newMedian: number | null; usedMedian: number | null }>
  firstSeen: string
  lastSeen: string
}

const ProductosVidaItemSchema = new Schema<ProductosVidaItemDoc>(
  {
    key: { type: String, required: true },
    category: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    variant: { type: String, required: true },
    variantLabel: { type: String, required: true },
    room: { type: String, required: true },
    tier: { type: String, required: true },
    rank: { type: Number, default: 999 },
    variantRank: { type: Number, default: 1 },
    image: { type: String, default: null },
    regime: { type: String, required: true },
    reason: { type: String, default: '' },
    usedOk: { type: Boolean, default: true },
    usedNote: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    newBand: { type: Schema.Types.Mixed, default: null },
    usedBand: { type: Schema.Types.Mixed, default: null },
    usedSavingPct: { type: Number, default: null },
    products: { type: [Schema.Types.Mixed], default: [] },
    offers: { type: [Schema.Types.Mixed], default: [] },
    suspectDropped: { type: Number, default: 0 },
    observedAt: { type: String, default: null },
    history: { type: [Schema.Types.Mixed], default: [] },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
)

ProductosVidaItemSchema.index({ key: 1 }, { unique: true })
ProductosVidaItemSchema.index({ category: 1, lastSeen: 1 })

export const ProductosVidaItemModel: Model<ProductosVidaItemDoc> =
  (mongoose.models.ProductosVidaItem as Model<ProductosVidaItemDoc>) ||
  mongoose.model<ProductosVidaItemDoc>(
    'ProductosVidaItem',
    ProductosVidaItemSchema,
    'productosvidaitems'
  )
