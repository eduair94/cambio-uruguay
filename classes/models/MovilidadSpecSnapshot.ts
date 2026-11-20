import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { MonopatinSpecSnapshot } from "../movilidad/specs/snapshot";

// El documento precalculado de /monopatines-electricos-uruguay: los candidatos del asesor
// "¿Cuál te conviene?" (sólo avisos con ficha propia leída) y las medianas de cada tipo. Lo escribe
// `sync_movilidad_specs.ts` al final de cada corrida; la página sólo lo lee
// (`/api/movilidad/monopatin-asesor` y `/api/movilidad/monopatin-electrico`). Un documento por
// categoría, hoy sólo `monopatin-electrico`. Espejo del app en app/server/models/MovilidadSpecSnapshot.ts.
const MovilidadSpecSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    candidates: { type: [Schema.Types.Mixed], default: [] },
    stats: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

MovilidadSpecSnapshotSchema.index({ key: 1 }, { unique: true });

export const MovilidadSpecSnapshotModel = appModel<MonopatinSpecSnapshot>(
  "MovilidadSpecSnapshot",
  MovilidadSpecSnapshotSchema,
  "movilidadspecsnapshots"
);
