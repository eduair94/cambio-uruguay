import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { MovilidadModelDoc } from "../movilidad/models/build";

// Una fila por MODELO de monopatín (classes/movilidad/models/): todas sus ofertas, sus bandas de
// precio nuevo/usado y la ficha de consenso. Lo escribe `sync_movilidad_specs.ts` cada hora; lo leen
// /monopatines-electricos-uruguay/<modelo>, el comparador y la tabla de modelos del hub. Espejo del app
// en app/server/models/MovilidadModel.ts (`tests/appdb/schema_parity.test.ts`).
const MovilidadModelSchema = new Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    brandKey: { type: String, required: true },
    brandLabel: { type: String, required: true },
    modelLabel: { type: String, required: true },
    variant: { type: String, required: true },
    image: { type: String, default: null },
    offers: { type: [Schema.Types.Mixed], default: [] },
    newBand: { type: Schema.Types.Mixed, default: null },
    usedBand: { type: Schema.Types.Mixed, default: null },
    specs: { type: Schema.Types.Mixed, default: null },
    fichas: { type: Number, default: 0 },
    listings: { type: Number, default: 0 },
    sellers: { type: Number, default: 0 },
    indexable: { type: Boolean, default: false },
    retired: { type: Boolean, default: false },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
    generatedAt: { type: String, required: true },
    history: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

MovilidadModelSchema.index({ slug: 1 }, { unique: true });
MovilidadModelSchema.index({ lastSeen: 1 });

export const MovilidadModelModel = appModel<MovilidadModelDoc>("MovilidadModel", MovilidadModelSchema, "movilidadmodels");
