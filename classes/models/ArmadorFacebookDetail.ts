// PRIVATE, backend-only: the description each Marketplace armador advert carried when its own
// page was read (`sync_armadores.ts`). The directory publishes only what is derived from it (the
// barrios it names and its price list); the text itself never leaves this collection. One row per
// advert, read once — an advert that edits its price list shows it on the next re-read (60 days).
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface ArmadorFacebookDetailDocument {
  id: string;
  readAt: Date;
  found: boolean;
  description: string | null;
}

const ArmadorFacebookDetailSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    readAt: { type: Date, required: true },
    found: { type: Boolean, default: false },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

export const ArmadorFacebookDetailModel = appModel<ArmadorFacebookDetailDocument>(
  "ArmadorFacebookDetail",
  ArmadorFacebookDetailSchema,
  "armadorfacebookdetails"
);
