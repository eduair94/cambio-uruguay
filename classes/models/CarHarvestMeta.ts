import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface CarHarvestMetaDocument {
  key: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

// Private run notes of the used-car job: the source of truth when a run fails (pm2 logs rotate).
const CarHarvestMetaSchema = new Schema({
  key: { type: String, required: true },
  updatedAt: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
}, { autoCreate: false, autoIndex: false });
CarHarvestMetaSchema.index({ key: 1 }, { unique: true });

export const CarHarvestMetaModel = appModel<CarHarvestMetaDocument>("CarHarvestMeta", CarHarvestMetaSchema, "carharvestmetas");
