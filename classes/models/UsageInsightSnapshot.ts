import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { UsageInsightSnapshot } from "../insights/types";

// Vive en la base del APP. Dos documentos en la misma colección, escritos por
// `currency-usage-insights`:
//   key: "site"   el tablero (< 1 MB) que lee /api/usage-insights para /estadisticas-de-uso;
//   key: "state"  la memoria del job (primera vez en el sitemap, últimas inspecciones, contadores de
//                 cuota). La ruta lee sólo `key: 'site'` y además excluye `state`.
//
// PRIVADO: mezcla tráfico por página de ocho fuentes. Sin IP, sin ids de usuario, sin cifras de ingreso.
// tests/insights/privacy.test.ts vigila las claves.
//
// Espejo campo a campo de `app/server/models/UsageInsightSnapshot.ts` —
// tests/appdb/schema_parity.test.ts falla si los dos se separan. Sólo `key` es obligatorio porque el
// documento de estado no tiene los demás campos.
const UsageInsightSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    schemaVersion: { type: Number, default: 1 },
    asOf: { type: String, default: null },
    day: { type: String, default: null },
    timezone: { type: String, default: "America/Montevideo" },
    window: { type: Schema.Types.Mixed, default: null },
    run: { type: Schema.Types.Mixed, default: null },
    sources: { type: Schema.Types.Mixed, default: null },
    pages: { type: [Schema.Types.Mixed], default: [] },
    signals: { type: [Schema.Types.Mixed], default: [] },
    trend: { type: Schema.Types.Mixed, default: null },
    consentCheck: { type: Schema.Types.Mixed, default: null },
    state: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, minimize: false }
);

UsageInsightSnapshotSchema.index({ key: 1 }, { unique: true });

export const UsageInsightSnapshotModel = appModel<UsageInsightSnapshot>(
  "UsageInsightSnapshot",
  UsageInsightSnapshotSchema,
  "usageinsightsnapshots"
);
