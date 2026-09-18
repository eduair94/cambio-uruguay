import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarReportSnapshot } from "../autos/publicTypes";

export interface CarReportSnapshotDocument {
  key: "used";
  generatedAt: string;
  snapshot: PublicCarReportSnapshot;
}

const CarReportSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarReportSnapshotSchema.index({ key: 1 }, { unique: true });

export const CarReportSnapshotModel = appModel<CarReportSnapshotDocument>(
  "CarReportSnapshot", CarReportSnapshotSchema, "carreportsnapshots"
);
