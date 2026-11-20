import mongoose, { Schema, type Model } from 'mongoose'
import type { EquiparListingDoc } from '../../utils/equiparProductos'

// Una fila por aviso de Mercado Libre que la banda aceptó para
// /productos-que-te-cambian-la-vida-uruguay, escrita por `sync_productos_vida.ts`. Es la fila de
// `equiparlistings` más `firstSeen`: la de `movilidadlistings` sin ficha técnica, precio por km ni
// modelo. La página de v1 NO la lee: se guarda para las subpáginas por producto de v2, que la
// leerían con el mismo cuerpo que `/api/equipar/productos`.
// El nombre de la colección va pinneado (mongoose pluralizaría distinto) y
// `tests/appdb/schema_parity.test.ts` mantiene los dos lados iguales.
const ProductosVidaListingSchema = new Schema(
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

ProductosVidaListingSchema.index({ listingId: 1 }, { unique: true })
ProductosVidaListingSchema.index({ category: 1, lastSeen: 1 })
ProductosVidaListingSchema.index({ lastSeen: 1, priceUyu: 1 })
ProductosVidaListingSchema.index({ brandKey: 1 })
ProductosVidaListingSchema.index({ sellerKey: 1 })

export const ProductosVidaListingModel: Model<EquiparListingDoc> =
  (mongoose.models.ProductosVidaListing as Model<EquiparListingDoc>) ||
  mongoose.model<EquiparListingDoc>(
    'ProductosVidaListing',
    ProductosVidaListingSchema,
    'productosvidalistings'
  )
