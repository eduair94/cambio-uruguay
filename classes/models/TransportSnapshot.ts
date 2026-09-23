// Espejo de app/server/models/TransportSnapshot.ts, atado a la Mongo del APP (classes/appdb.ts) — no
// a la del backend. `sync_transporte.ts` hace upsert de UN documento `slug:"current"` y
// /api/transporte/comparador se lo sirve a `/conviene-auto-moto-o-omnibus-uruguay`.
//
// Todo acá es recomputable: precios que los catálogos publican todos los días, y una matriz de rutas
// que se vuelve a armar contra el ruteador. Por eso los bloques grandes van como `Mixed` y no campo
// por campo — no es un archivo histórico como el ledger de predicciones, es una foto.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { TransportSnapshot } from "../transporte/types";

const TransportSnapshotSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    builtAt: { type: Date, required: true },
    prices: { type: Schema.Types.Mixed, default: {} },
    zones: { type: [Schema.Types.Mixed], default: [] },
    // Pares aplanados `[from, to, modeIndex, meters, seconds]`: son decenas de miles y guardarlos
    // como documentos con nombres de campo multiplicaría el tamaño por seis sin agregar nada.
    routes: { type: [[Number]], default: [] },
    transit: { type: [Schema.Types.Mixed], default: [] },
    coverage: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const TransportSnapshotModel = appModel<TransportSnapshot>(
  "TransportSnapshot",
  TransportSnapshotSchema,
  "transportsnapshots"
);
