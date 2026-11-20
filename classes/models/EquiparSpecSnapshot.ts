import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EquiparFichaSnapshot } from "../equipar/specs/snapshot";

// El documento precalculado del asesor "¿Qué tamaño necesitás?" de /equipar-casa-uruguay/<categoria>:
// los avisos con ficha del vendedor, uno por categoría (heladera, lavarropas, tv, aire-acondicionado).
// Lo escribe `sync_equipar_specs.ts`; la página sólo lo lee (`/api/equipar/asesor/<categoria>`).
// Espejo del app en app/server/models/EquiparSpecSnapshot.ts (`tests/appdb/schema_parity.test.ts`).
const EquiparSpecSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    candidates: { type: [Schema.Types.Mixed], default: [] },
    total: { type: Number, default: 0 },
    withFicha: { type: Number, default: 0 },
  },
  { timestamps: true }
);

EquiparSpecSnapshotSchema.index({ key: 1 }, { unique: true });

export const EquiparSpecSnapshotModel = appModel<EquiparFichaSnapshot>(
  "EquiparSpecSnapshot",
  EquiparSpecSnapshotSchema,
  "equiparspecsnapshots"
);
