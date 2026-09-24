import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarAdvisorSnapshot } from "../autos/publicTypes";

// Public: the per-model table the buying advisor scores (/que-auto-comprar-uruguay). One document,
// key "used", rewritten by every currency-autos run next to the market report.
export interface CarAdvisorSnapshotDocument {
  key: "used";
  generatedAt: string;
  snapshot: PublicCarAdvisorSnapshot;
}

const CarAdvisorSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarAdvisorSnapshotSchema.index({ key: 1 }, { unique: true });

export const CarAdvisorSnapshotModel = appModel<CarAdvisorSnapshotDocument>(
  "CarAdvisorSnapshot", CarAdvisorSnapshotSchema, "caradvisorsnapshots"
);
