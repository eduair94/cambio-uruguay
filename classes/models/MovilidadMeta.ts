import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { MovilidadMeta } from "../movilidad/types";

// Companion of MovilidadItem: one document describing the last monopatines/bicicletas eléctricas
// run — when, at what USD rate, how every source behaved, and which categories produced nothing.
// Mirrors classes/models/EquiparMeta.ts minus `baskets`: see classes/movilidad/types.ts for why this
// catalogue has no basket total to publish.
//
// `uncovered` is the honest half of this document, same reasoning as equipar's meta: a category that
// produced nothing this run says so instead of just vanishing from the page.
const MovilidadMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    listings: { type: Number, default: 0 },
    items: { type: Number, default: 0 },
    runs: { type: [Schema.Types.Mixed], default: [] },
    uncovered: { type: [String], default: [] },
  },
  { timestamps: true }
);

MovilidadMetaSchema.index({ key: 1 }, { unique: true });

export const MovilidadMetaModel = appModel<MovilidadMeta & { key: string }>(
  "MovilidadMeta",
  MovilidadMetaSchema,
  "movilidadmeta"
);
