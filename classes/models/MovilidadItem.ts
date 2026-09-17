import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EquiparItem } from "../equipar/types";

// One document per category+variant ("monopatin-electrico:urbano", "bicicleta-electrica:plegable"),
// in the APP database, which the Nuxt page reads directly. Mirrors classes/models/EquiparItem.ts
// field for field: `buildEquiparCatalog` (classes/equipar/catalog.ts) produces exactly an
// `EquiparItem` regardless of which registry it classified against (see
// classes/movilidad/registry.ts), so this file reuses that type rather than declaring a parallel
// one that could drift from it.
//
// `newBand` and `usedBand` are separate fields on purpose — they are separate markets, and pooling
// them would publish a number that describes neither.
//
// `history` is daily price points. Any list endpoint built on this collection MUST project it out —
// it grows one entry per day since the item was first seen, and a directory card only ever needs the
// current band.
const MovilidadItemSchema = new Schema(
  {
    key: { type: String, required: true },
    category: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    variant: { type: String, required: true },
    variantLabel: { type: String, required: true },
    room: { type: String, required: true },
    tier: { type: String, required: true },
    rank: { type: Number, default: 999 },
    variantRank: { type: Number, default: 1 },
    image: { type: String, default: null },
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

MovilidadItemSchema.index({ key: 1 }, { unique: true });
MovilidadItemSchema.index({ tier: 1, category: 1 });

export const MovilidadItemModel = appModel<EquiparItem>("MovilidadItem", MovilidadItemSchema, "movilidaditems");
