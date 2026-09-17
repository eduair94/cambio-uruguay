import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PriceEventSnapshot } from "../priceevents/aggregate";

// Plan D — CyberLunes/Black Friday. Un documento por día (`key: "day:YYYY-MM-DD"`, un ARCHIVO que
// sync_price_events.ts poda a los 400 días) más un puntero `key: "current"` sobreescrito cada corrida
// — el mismo patrón `current`/`day:` que ya usa `RegionalSnapshot`. `event`/`byVertical`/`topDrops`/
// `sellers` son estructuras calculadas, no consultadas campo a campo, así que van como
// `Schema.Types.Mixed` (mismo criterio que `runs`/`baskets` en `EquiparMetaSchema`).
//
// `topDrops` es la VITRINA (recortada a 200, ver `classes/priceevents/aggregate.ts`); `dropsCount`/
// `inflatedCount` son los totales del día SIN recortar — el titular y la serie de 30 días leen de
// estos dos, nunca de `topDrops.length`, que se achata apenas el día tiene más de 200 bajas.
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
    topDrops: { type: [Schema.Types.Mixed], default: [] },
    dropsCount: { type: Number, default: 0 },
    inflatedCount: { type: Number, default: 0 },
    sellers: { type: [Schema.Types.Mixed], default: [] },
    // Final review M5/I2a: qué fracción del día vino de cada `source` (mercadolibre/fenicio/…) y
    // cuántas ofertas la guarda de plausibilidad descartó por implausibles — ver
    // `classes/priceevents/aggregate.ts`.
    bySource: { type: Schema.Types.Mixed, default: {} },
    suspect: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PriceEventSnapshotSchema.index({ key: 1 }, { unique: true });

export const PriceEventSnapshotModel = appModel<PriceEventSnapshot>(
  "PriceEventSnapshot",
  PriceEventSnapshotSchema,
  "priceeventsnapshots"
);
