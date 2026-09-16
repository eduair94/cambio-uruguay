import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PricewatchPoint } from "../pricewatch/types";

// One row per offer, across every vertical that calls recordPricewatch (equipar, sillas, and
// whatever else joins later). This is the raw material a future job (Plan D) needs to tell a real
// CyberLunes/Black Friday discount from list-price theatre: an offer's price today against its own
// last ~60 days. That comparison only exists if something has been writing a daily point per offer
// BEFORE the season it needs to explain — hence recording starts now, well ahead of the need.
//
// Backend-only: nothing in app/ reads this collection yet, so there is no app-side mirror model and
// no schema-parity test entry (see tests/appdb/schema_parity.test.ts, which only tracks collections
// the app also declares).
export interface PricewatchOffer {
  listingId: string;
  vertical: string;
  category: string | null;
  productKey: string | null;
  source: string;
  sellerKey: string;
  sellerName: string;
  title: string;
  url: string;
  currency: string;
  firstSeen: string;
  lastSeen: string;
  history: PricewatchPoint[];
}

const PricewatchOfferSchema = new Schema(
  {
    listingId: { type: String, required: true },
    vertical: { type: String, required: true },
    category: { type: String, default: null },
    productKey: { type: String, default: null },
    source: { type: String, required: true },
    sellerKey: { type: String, required: true },
    sellerName: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    currency: { type: String, required: true },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
    history: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

PricewatchOfferSchema.index({ listingId: 1 }, { unique: true });
PricewatchOfferSchema.index({ vertical: 1, lastSeen: 1 });
PricewatchOfferSchema.index({ productKey: 1 });

export const PricewatchOfferModel = appModel<PricewatchOffer>("PricewatchOffer", PricewatchOfferSchema, "pricewatchoffers");
