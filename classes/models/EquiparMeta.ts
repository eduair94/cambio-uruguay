import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EquiparMeta } from "../equipar/types";

// Single document describing the last run: when, at what USD rate, how every source behaved, the
// three published baskets, and which categories produced nothing.
//
// `uncovered` and the `missing` inside each basket are the honest half of this document. A basket
// total that quietly skipped the fridge is LOWER than the truth and reads as a better deal, so the
// gaps travel with the number rather than being dropped on the way to the page.
const EquiparMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    listings: { type: Number, default: 0 },
    items: { type: Number, default: 0 },
    runs: { type: [Schema.Types.Mixed], default: [] },
    baskets: { type: [Schema.Types.Mixed], default: [] },
    uncovered: { type: [String], default: [] },
  },
  { timestamps: true }
);

EquiparMetaSchema.index({ key: 1 }, { unique: true });

export const EquiparMetaModel = appModel<EquiparMeta & { key: string }>(
  "EquiparMeta",
  EquiparMetaSchema,
  "equiparmeta"
);
