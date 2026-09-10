import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EquiparItem } from "../equipar/types";

// One document per category+variant ("heladera:media", "olla:chica"), in the APP database, which
// the Nuxt page reads directly. Kept as a row per item rather than one snapshot blob so a price
// history can accumulate per item and so the API can filter by tier without loading everything.
//
// `newBand` and `usedBand` are separate fields on purpose. They are separate markets and pooling
// them would publish a number that describes neither.
const EquiparItemSchema = new Schema(
  {
    key: { type: String, required: true },
    category: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    variant: { type: String, required: true },
    variantLabel: { type: String, required: true },
    room: { type: String, required: true },
    tier: { type: String, required: true },
    rank: { type: Number, default: 999 },
    regime: { type: String, required: true },
    reason: { type: String, default: "" },
    usedOk: { type: Boolean, default: true },
    usedNote: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    newBand: { type: Schema.Types.Mixed, default: null },
    usedBand: { type: Schema.Types.Mixed, default: null },
    usedSavingPct: { type: Number, default: null },
    products: { type: [Schema.Types.Mixed], default: [] },
    offers: { type: [Schema.Types.Mixed], default: [] },
    suspectDropped: { type: Number, default: 0 },
    observedAt: { type: String, default: null },
    history: { type: [Schema.Types.Mixed], default: [] },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
);

EquiparItemSchema.index({ key: 1 }, { unique: true });
EquiparItemSchema.index({ tier: 1, category: 1 });

export const EquiparItemModel = appModel<EquiparItem>("EquiparItem", EquiparItemSchema, "equiparitems");
