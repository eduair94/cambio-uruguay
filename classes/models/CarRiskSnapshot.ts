import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarRiskSnapshot } from "../autos/publicTypes";

export interface CarRiskSnapshotDocument {
  key: "used";
  generatedAt: string;
  snapshot: PublicCarRiskSnapshot;
}

const CarRiskSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarRiskSnapshotSchema.index({ key: 1 }, { unique: true });

export const CarRiskSnapshotModel = appModel<CarRiskSnapshotDocument>(
  "CarRiskSnapshot", CarRiskSnapshotSchema, "carrisksnapshots"
);
