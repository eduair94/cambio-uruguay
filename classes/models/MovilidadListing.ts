import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EquiparListingRow } from "../equipar/listings";

// Una fila por aviso de monopatín o bicicleta eléctrica que la banda aceptó, en la APP DB, para el
// directorio con filtros de /monopatines-electricos-uruguay y /bicicletas-electricas-uruguay.
//
// La FORMA es la de `equiparlistings` y el tipo es el mismo a propósito: `buildEquiparListings`
// devuelve `EquiparListingRow` cualquiera sea el registro que se le inyecte (classes/equipar/
// listings.ts), así que declarar una fila paralela sólo habilitaría que las dos deriven.
//
// La COLECCIÓN sí es aparte: un monopatín no puede aparecer en el directorio de equipar la casa, y
// `classes/equipar/basket.ts` sólo itera `EQUIPAR_CATEGORIES` — la misma frontera que ya documenta
// `classes/movilidad/registry.ts`. Las filas `suspect` se guardan para poder publicar el conteo y
// nunca se sirven; la poda es la misma de equipar (`equiparListingPruneCutoff`).
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

MovilidadListingSchema.index({ listingId: 1 }, { unique: true });
MovilidadListingSchema.index({ category: 1, lastSeen: 1 });
MovilidadListingSchema.index({ lastSeen: 1, priceUyu: 1 });
MovilidadListingSchema.index({ brandKey: 1 });
MovilidadListingSchema.index({ sellerKey: 1 });

export const MovilidadListingModel = appModel<EquiparListingRow & { firstSeen: string }>(
  "MovilidadListing",
  MovilidadListingSchema,
  "movilidadlistings"
);
