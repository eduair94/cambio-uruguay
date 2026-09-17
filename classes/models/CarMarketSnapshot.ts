import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarMarketSnapshot } from "../autos/publicTypes";

export interface CarMarketSnapshotDocument {
  key: string;
  generatedAt: string;
  snapshot: PublicCarMarketSnapshot;
}

const CarMarketSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarMarketSnapshotSchema.index({ key: 1 }, { unique: true });

export const CarMarketSnapshotModel = appModel<CarMarketSnapshotDocument>("CarMarketSnapshot", CarMarketSnapshotSchema, "carmarketsnapshots");
