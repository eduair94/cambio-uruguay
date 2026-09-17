import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarOpportunitySnapshot } from "../autos/publicTypes";

export interface CarOpportunitySnapshotDocument {
  key: "used";
  generatedAt: string;
  snapshot: PublicCarOpportunitySnapshot;
}

const CarOpportunitySnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarOpportunitySnapshotSchema.index({ key: 1 }, { unique: true });

export const CarOpportunitySnapshotModel = appModel<CarOpportunitySnapshotDocument>(
  "CarOpportunitySnapshot", CarOpportunitySnapshotSchema, "caropportunitysnapshots"
);
