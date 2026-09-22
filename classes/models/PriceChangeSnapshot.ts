import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PriceChangeSnapshot } from "../pricehistory/types";

// Lo que publica /cambios-de-precio-uruguay, escrito por sync_price_changes.ts (pm2
// `currency-price-changes`). Dos clases de documento, con la misma forma:
//   - `current`: la foto de hoy, la que lee la página.
//   - `day:YYYY-MM-DD`: el archivo, podado a 400 días — el mismo patrón de `priceeventsnapshots`.
//
// Nada de esto se calcula en el pedido: recorrer las tres colecciones de historial (pricewatchoffers,
// carlistings, marketpricelogs, ~100k documentos) es trabajo de job, no de visita (regla del usuario,
// 2026-09-19).
//
// Espejo en app/server/models/PriceChangeSnapshot.ts — tests/appdb/schema_parity.test.ts falla si los
// dos lados se separan.
const PriceChangeSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    day: { type: String, required: true },
    generatedAt: { type: String, required: true },
    windowDays: { type: Number, required: true },
    verticals: { type: [Schema.Types.Mixed], default: [] },
    changes: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

PriceChangeSnapshotSchema.index({ key: 1 }, { unique: true });

export const PriceChangeSnapshotModel = appModel<PriceChangeSnapshot>(
  "PriceChangeSnapshot",
  PriceChangeSnapshotSchema,
  "pricechangesnapshots"
);
