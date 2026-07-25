import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { ChairCatalogMeta } from "../chairs/types";

// Single document describing the last catalogue run: when it happened, the USD rate used to make
// prices comparable, and how every source behaved. The page renders this so a silent gap (a store
// that changed its sitemap, Marketplace refusing to load) is visible instead of looking like an
// empty market.
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
);

ChairCatalogMetaSchema.index({ key: 1 }, { unique: true });

export const ChairCatalogMetaModel = appModel<ChairCatalogMeta>(
  "ChairCatalogMeta",
  ChairCatalogMetaSchema,
  "chaircatalogmeta"
);
