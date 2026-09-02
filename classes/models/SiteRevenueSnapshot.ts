import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { RevenueSnapshot } from "../site-analytics/revenue";

// Vive en la base del APP, en su PROPIA colección — deliberadamente separada de
// `siteanalyticssnapshots`.
//
// El documento de al lado se publica entero en /estadisticas-del-sitio. Éste dice cuánto factura el
// sitio, que no es lo mismo, y guardarlo en el mismo documento sería confiar para siempre en que
// nadie escriba mal un `.select()`. Ninguna ruta pública lee esta colección; la sirve
// `/api/site-revenue` con `requireAdmin`.
//
// Espejo campo a campo de `app/server/models/SiteRevenueSnapshot.ts` —
// tests/appdb/schema_parity.test.ts falla si los dos se separan.
const SiteRevenueSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    currency: { type: String, default: "USD" },
    range: { type: Schema.Types.Mixed, required: true },
    totals: { type: Schema.Types.Mixed, required: true },
    families: { type: [Schema.Types.Mixed], default: [] },
    topPages: { type: [Schema.Types.Mixed], default: [] },
    daily: { type: [Schema.Types.Mixed], default: [] },
    pending: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SiteRevenueSnapshotSchema.index({ key: 1 }, { unique: true });

export const SiteRevenueSnapshotModel = appModel<RevenueSnapshot>(
  "SiteRevenueSnapshot",
  SiteRevenueSnapshotSchema,
  "siterevenuesnapshots"
);
