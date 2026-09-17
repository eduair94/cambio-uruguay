import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PriceEventSnapshot } from "../priceevents/aggregate";

// Plan D — CyberLunes/Black Friday. Un documento por día (`key: "day:YYYY-MM-DD"`, un ARCHIVO que
// sync_price_events.ts poda a los 400 días) más un puntero `key: "current"` sobreescrito cada corrida
// — el mismo patrón `current`/`day:` que ya usa `RegionalSnapshot`. `event`/`byVertical`/`drops`/
// `sellers` son estructuras calculadas, no consultadas campo a campo, así que van como
// `Schema.Types.Mixed` (mismo criterio que `runs`/`baskets` en `EquiparMetaSchema`).
const PriceEventSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    day: { type: String, required: true },
    event: { type: Schema.Types.Mixed, default: null },
    generatedAt: { type: String, required: true },
    trackingSince: { type: String, default: null },
    analyzed: { type: Number, default: 0 },
    eligible: { type: Number, default: 0 },
    byVertical: { type: Schema.Types.Mixed, default: {} },
    drops: { type: [Schema.Types.Mixed], default: [] },
    sellers: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

PriceEventSnapshotSchema.index({ key: 1 }, { unique: true });

export const PriceEventSnapshotModel = appModel<PriceEventSnapshot>(
  "PriceEventSnapshot",
  PriceEventSnapshotSchema,
  "priceeventsnapshots"
);
