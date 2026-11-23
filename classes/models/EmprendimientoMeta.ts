// Mirror of app/server/models/EmprendimientoMeta.ts: one document (`key: "current"`) with the counts
// and the last run of /emprendimientos-de-instagram-uruguay.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EmprendimientoMeta } from "../emprendimientos/types";

const EmprendimientoMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    listed: { type: Number, default: 0 },
    byRubro: { type: Schema.Types.Mixed, default: {} },
    byDepartamento: { type: Schema.Types.Mixed, default: {} },
    candidates: { type: Schema.Types.Mixed, default: {} },
    sources: { type: Schema.Types.Mixed, default: {} },
    lastRun: { type: Schema.Types.Mixed, default: null },
    state: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

EmprendimientoMetaSchema.index({ key: 1 }, { unique: true });

export const EmprendimientoMetaModel = appModel<EmprendimientoMeta>(
  "EmprendimientoMeta",
  EmprendimientoMetaSchema,
  "emprendimientometas"
);
