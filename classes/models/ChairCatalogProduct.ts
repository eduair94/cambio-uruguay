import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { ChairCatalogProduct } from "../chairs/types";

// One document per chair, in the APP database — the Nuxt directory reads it directly. Kept as one
// doc per product (not a single snapshot blob) so /api/chairs can filter, sort and paginate in
// Mongo, and so a chair keeps its own price history across runs.
const ChairCatalogProductSchema = new Schema(
  {
    slug: { type: String, required: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    category: { type: String, default: "unknown" },
    stars: { type: Number, default: null },
    ratingCount: { type: Number, default: 0 },
    ratingSignals: { type: [Schema.Types.Mixed], default: [] },
    confidence: { type: String, default: "low" },
    redditSlug: { type: String, default: null },
    tier: { type: String, default: null },
    price: { type: Schema.Types.Mixed, default: null },
    offers: { type: [Schema.Types.Mixed], default: [] },
    sellers: { type: Number, default: 0 },
    specs: { type: [Schema.Types.Mixed], default: [] },
    verdict: { type: String, default: "" },
    pros: { type: [Schema.Types.Mixed], default: [] },
    cons: { type: [Schema.Types.Mixed], default: [] },
    evidence: { type: [Schema.Types.Mixed], default: [] },
    reviews: { type: [Schema.Types.Mixed], default: [] },
    images: { type: [Schema.Types.Mixed], default: [] },
    history: { type: [Schema.Types.Mixed], default: [] },
    reviewFingerprint: { type: String, default: "" },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
);

ChairCatalogProductSchema.index({ slug: 1 }, { unique: true });
ChairCatalogProductSchema.index({ lastSeen: -1, sellers: -1 });
ChairCatalogProductSchema.index({ category: 1, stars: -1 });

export const ChairCatalogProductModel = appModel<ChairCatalogProduct>(
  "ChairCatalogProduct",
  ChairCatalogProductSchema,
  "chaircatalogproducts"
);
