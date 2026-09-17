import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { FbCard, FbItem } from "../autos/sources/facebook";

export interface CarFbCardDocument {
  key: string;
  card: FbCard;
  item: FbItem | null;
  firstSeen: string;
  lastSeen: string;
}

// Private: Facebook Marketplace vehicle cards as read (no seller names are ever stored), plus the
// last item page read for each. Only cards identified as a car become carlistings rows.
const CarFbCardSchema = new Schema({
  key: { type: String, required: true },
  card: { type: Schema.Types.Mixed, required: true },
  item: { type: Schema.Types.Mixed, default: null },
  firstSeen: { type: String, required: true },
  lastSeen: { type: String, required: true },
}, { autoCreate: false, autoIndex: false });
CarFbCardSchema.index({ key: 1 }, { unique: true });
CarFbCardSchema.index({ lastSeen: 1 });

export const CarFbCardModel = appModel<CarFbCardDocument>("CarFbCard", CarFbCardSchema, "carfbcards");
