import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { OpportunityOperation } from "../propertyopportunities/types";
import type { PropertyOpportunitySnapshot } from "../propertyopportunities/snapshotTypes";

export interface PropertyOpportunitySnapshotDocument {
  key: OpportunityOperation;
  generatedAt: string;
  snapshot: PropertyOpportunitySnapshot;
}

const PropertyOpportunitySnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, autoCreate: false, autoIndex: false }
);
PropertyOpportunitySnapshotSchema.index({ key: 1 }, { unique: true });

export const PropertyOpportunitySnapshotModel = appModel<PropertyOpportunitySnapshotDocument>(
  "PropertyOpportunitySnapshot", PropertyOpportunitySnapshotSchema, "propertyopportunitysnapshots"
);
