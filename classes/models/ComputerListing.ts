import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { RawComputerListing } from "../computadoras/types";

// PRIVADA, sólo del backend: cada aviso de computadora o pieza visto en Facebook Marketplace o
// Mercado Libre, con la primera y la última vez que se lo vio. El catálogo público se arma de acá
// campo por campo (classes/computadoras/catalog.ts); el id del vendedor de ML no sale nunca.
const ComputerListingSchema = new Schema(
  {
    slug: { type: String, required: true },
    source: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { strict: false, timestamps: true }
);
ComputerListingSchema.index({ slug: 1 }, { unique: true });
ComputerListingSchema.index({ lastSeen: 1 });

export const ComputerListingModel = appModel<RawComputerListing>("ComputerListing", ComputerListingSchema, "computerlistings");
