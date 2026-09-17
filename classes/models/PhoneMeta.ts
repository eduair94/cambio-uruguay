import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PhoneMeta } from "../phones/catalog";

// Companion of PhoneModel: single document describing the last celulares run — mirrors
// classes/models/EquiparMeta.ts / ChairCatalogMeta.ts. The page renders this so a silent source
// outage (a storefront sitemap that changed, MercadoLibre refusing the bridge) is visible instead of
// looking like an empty market.
const PhoneMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    listings: { type: Number, default: 0 },
    models: { type: Number, default: 0 },
    runs: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

PhoneMetaSchema.index({ key: 1 }, { unique: true });

export const PhoneMetaModel = appModel<PhoneMeta & { key: string }>("PhoneMeta", PhoneMetaSchema, "phonemeta");
