import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { RentalMeta } from "../rentals/types";

// One row: what the last rental harvest did. The page publishes it verbatim — when a portal is
// down, the honest thing is to say so beside the count, not to quietly show fewer listings.
//
// Keep in step with app/server/models/RentalMeta.ts (tests/appdb/schema_parity.test.ts).
const RentalMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    mode: { type: String, default: "full" },
    durationMs: { type: Number, default: 0 },
    usdUyu: { type: Number, default: 0 },
    properties: { type: Number, default: 0 },
    offers: { type: Number, default: 0 },
    merged: { type: Number, default: 0 },
    sources: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

RentalMetaSchema.index({ key: 1 }, { unique: true });

export const RentalMetaModel = appModel<RentalMeta>("RentalMeta", RentalMetaSchema, "rentalmetas");
