import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { CarGuideEntry } from "../autos/catalog/guide";

// Private: one row per model-year page of Mercado Libre's price guide (see classes/autos/catalog/guide.ts).
const CarGuideEntrySchema = new Schema({
  key: { type: String, required: true },
  brandSlug: { type: String, required: true },
  modelSlug: { type: String, required: true },
  year: { type: Number, required: true },
  status: { type: String, required: true },
  averageUsd: { type: Number, default: null },
  versions: { type: Schema.Types.Mixed, default: [] },
  updatedLabel: { type: String, default: null },
  fetchedAt: { type: String, required: true },
}, { autoCreate: false, autoIndex: false });
CarGuideEntrySchema.index({ key: 1 }, { unique: true });

export const CarGuideEntryModel = appModel<CarGuideEntry>("CarGuideEntry", CarGuideEntrySchema, "carguideentries");
