import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { CarModelInfoRecord } from "../autos/modelInfo/types";

// Public: one row per model with its Wikipedia summary and verified YouTube videos
// (classes/autos/modelInfo/). The advert page and the model's price page read it as is.
const CarModelInfoSchema = new Schema(
  {
    marketSlug: { type: String, required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    readAt: { type: String, required: true },
    wiki: { type: Schema.Types.Mixed },
    wikiReadAt: { type: String, default: null },
    videos: { type: Schema.Types.Mixed, default: [] },
    videosReadAt: { type: String, default: null },
    failures: { type: [String], default: [] },
  },
  { autoCreate: false, autoIndex: false, minimize: false },
);
CarModelInfoSchema.index({ marketSlug: 1 }, { unique: true });

export const CarModelInfoModel = appModel<CarModelInfoRecord>("CarModelInfo", CarModelInfoSchema, "carmodelinfos");
