import mongoose, { Schema, type Model } from 'mongoose'
import type { EquiparListingDoc } from '../../utils/equiparProductos'

// Una fila por aviso de monopatín o bicicleta eléctrica que la banda aceptó, escrita por el job
// `sync_movilidad.ts` — ver classes/models/MovilidadListing.ts para el porqué de cada campo y de
// por qué la colección es aparte de `equiparlistings` aunque la FORMA sea la misma.
// El nombre de la colección va pinneado porque mongoose pluralizaría el del modelo distinto de lo
// que escribe el backend. `tests/appdb/schema_parity.test.ts` mantiene los dos lados iguales.
const MovilidadListingSchema = new Schema(
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

MovilidadListingSchema.index({ listingId: 1 }, { unique: true })
MovilidadListingSchema.index({ category: 1, lastSeen: 1 })
MovilidadListingSchema.index({ lastSeen: 1, priceUyu: 1 })
MovilidadListingSchema.index({ brandKey: 1 })
MovilidadListingSchema.index({ sellerKey: 1 })

export const MovilidadListingModel: Model<EquiparListingDoc> =
  (mongoose.models.EquiparListing as Model<EquiparListingDoc>) ||
  mongoose.model<EquiparListingDoc>('MovilidadListing', MovilidadListingSchema, 'movilidadlistings')
