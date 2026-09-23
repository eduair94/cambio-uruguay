import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { StoredMoto } from "../motos/types";

// Observaciones privadas del directorio de motos: el historial de precios y el id del vendedor no
// salen nunca de esta colección. Lo que se publica se arma campo por campo en classes/motos/catalog.ts.
const MotoListingSchema = new Schema(
  {
    key: { type: String, required: true },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
    listing: { type: Schema.Types.Mixed, required: true },
    priceHistory: { type: Schema.Types.Mixed, default: [] },
    retiredAt: { type: String, default: null },
    missedFullSweeps: { type: Number, default: 0 },
    // Lo que declararon las facetas `MOTO_TYPE` y `ENGINE_DISPLACEMENT` de Mercado Libre la última
    // vez que una corrida COMPLETA las barrió: la horaria no las barre y sin esto las borraría.
    facets: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, autoCreate: false, autoIndex: false }
);
MotoListingSchema.index({ key: 1 }, { unique: true });
MotoListingSchema.index({ lastSeen: 1 });

export const MotoListingModel = appModel<StoredMoto>("MotoListing", MotoListingSchema, "motolistings");
