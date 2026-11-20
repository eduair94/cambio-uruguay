import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EquiparListingRow } from "../equipar/listings";
import { PRODUCTOS_VIDA_COLLECTIONS } from "../productosvida/registry";

// Una fila por aviso de Mercado Libre que la banda aceptó para /productos-que-te-cambian-la-vida-uruguay,
// en la APP DB. La v1 de la página no la lee: se guarda para que las subpáginas por producto de la v2
// salgan baratas.
//
// La FORMA es la de `movilidadlistings` sin `specs`, `uyuPerKm` ni `modelSlug` (esta categoría no tiene
// ficha técnica ni modelos), y el tipo es `EquiparListingRow` a propósito: `buildEquiparListings`
// devuelve esa fila cualquiera sea el registro inyectado. `firstSeen` lo escribe sólo el insert
// (`equiparListingUpsert`) y la poda es la de equipar (30 días después de `lastSeen`).
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
    channel: { type: String, default: "" },
    officialStore: { type: Boolean, default: false },
    brand: { type: String, default: "" },
    brandKey: { type: String, default: "" },
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
);

ProductosVidaListingSchema.index({ listingId: 1 }, { unique: true });
ProductosVidaListingSchema.index({ category: 1, lastSeen: 1 });
ProductosVidaListingSchema.index({ lastSeen: 1, priceUyu: 1 });
ProductosVidaListingSchema.index({ brandKey: 1 });
ProductosVidaListingSchema.index({ sellerKey: 1 });

export const ProductosVidaListingModel = appModel<EquiparListingRow & { firstSeen: string }>(
  "ProductosVidaListing",
  ProductosVidaListingSchema,
  PRODUCTOS_VIDA_COLLECTIONS.listings
);
