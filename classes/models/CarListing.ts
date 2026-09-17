import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { StoredCar } from "../autos/types";

// Private observations: descriptions, seller ids and price history never leave this collection.
const CarListingSchema = new Schema({
  key: { type: String, required: true },
  firstSeen: { type: String, required: true },
  lastSeen: { type: String, required: true },
  listing: { type: Schema.Types.Mixed, required: true },
  priceHistory: { type: Schema.Types.Mixed, default: [] },
  retiredAt: { type: String, default: null },
  missedFullSweeps: { type: Number, default: 0 },
  detail: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true, autoCreate: false, autoIndex: false });
CarListingSchema.index({ key: 1 }, { unique: true });
CarListingSchema.index({ lastSeen: 1 });

export const CarListingModel = appModel<StoredCar>("CarListing", CarListingSchema, "carlistings");
