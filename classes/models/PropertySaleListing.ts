import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { OpportunityListing } from "../propertyopportunities/types";

export interface PropertySaleListingDocument {
  id: string;
  firstSeen: string;
  lastSeen: string;
  listing: OpportunityListing;
}

// This collection is never served by the app: source prose and identity are private inputs.
const PropertySaleListingSchema = new Schema({
  id: { type: String, required: true },
  firstSeen: { type: String, required: true },
  lastSeen: { type: String, required: true },
  listing: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true, autoCreate: false, autoIndex: false });
PropertySaleListingSchema.index({ id: 1 }, { unique: true });
PropertySaleListingSchema.index({ lastSeen: 1 });

export const PropertySaleListingModel = appModel<PropertySaleListingDocument>(
  "PropertySaleListing", PropertySaleListingSchema, "propertysalelistings"
);
