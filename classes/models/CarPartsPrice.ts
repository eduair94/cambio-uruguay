import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { CarPartsRecord } from "../autos/repuestos";

// Private: one row per model with the six spare-parts medians read from Mercado Libre
// (classes/autos/repuestosHarvest.ts). The advisor snapshot publishes the index built from them.
const CarPartsPriceSchema = new Schema({
  marketSlug: { type: String, required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  readAt: { type: String, required: true },
  parts: { type: Schema.Types.Mixed, default: [] },
}, { autoCreate: false, autoIndex: false });
CarPartsPriceSchema.index({ marketSlug: 1 }, { unique: true });

export const CarPartsPriceModel = appModel<CarPartsRecord>("CarPartsPrice", CarPartsPriceSchema, "carpartsprices");
