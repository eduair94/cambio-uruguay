import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EquiparListingRow } from "../equipar/listings";

// One document per listing the equipar harvest kept — every fridge, every pot, from every source —
// in the APP database, for the filterable directory behind /equipar-casa-uruguay/productos.
// `equiparitems` is the summary (bands and the cheapest few offers per variant); this is the raw
// material a reader filters by brand, condition, seller and price.
//
// `suspect` rows are stored so the count can be published, and never served: see
// classes/equipar/listings.ts. Rows stop being served after the freshness window and are pruned
// after EQUIPAR_LISTING_KEEP_DAYS (classes/equipar/store.ts) — the per-offer price HISTORY lives
// in pricewatchoffers, not here.
const EquiparListingSchema = new Schema(
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

EquiparListingSchema.index({ listingId: 1 }, { unique: true });
EquiparListingSchema.index({ category: 1, lastSeen: 1 });
EquiparListingSchema.index({ lastSeen: 1, priceUyu: 1 });
EquiparListingSchema.index({ brandKey: 1 });
EquiparListingSchema.index({ sellerKey: 1 });

export const EquiparListingModel = appModel<EquiparListingRow & { firstSeen: string }>(
  "EquiparListing",
  EquiparListingSchema,
  "equiparlistings"
);
