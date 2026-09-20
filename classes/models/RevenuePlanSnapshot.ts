import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { RevenuePlanSnapshot } from "../revenueplan/types";

// Vive en la base del APP, un solo documento vivo, escrito por `currency-revenue-plan`.
//
// NO ES PÚBLICO y es el más sensible de los tres tableros: cruza las consultas de Search Console
// con el ingreso por familia de página. Lo sirve `/api/revenue-plan` con `requireAdmin` y lo vigila
// `tests/revenueplan/privacy.test.ts`, que falla si alguna ruta sin `requireAdmin` lo lee.
//
// Espejo de `app/server/models/RevenuePlanSnapshot.ts`; `tests/appdb/schema_parity.test.ts` falla
// si los dos se separan.
const RevenuePlanSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    searchWindow: { type: Schema.Types.Mixed, default: {} },
    revenueWindow: { type: Schema.Types.Mixed, default: {} },
    currency: { type: String, default: "USD" },
    siteRpm: { type: Number, default: 0 },
    siteUsdPerClick: { type: Number, default: 0 },
    revenuePending: { type: Boolean, default: true },
    totalUpsideUsd: { type: Number, default: 0 },
    actions: { type: [Schema.Types.Mixed], default: [] },
    defend: { type: [Schema.Types.Mixed], default: [] },
    families: { type: [Schema.Types.Mixed], default: [] },
    experiments: { type: [Schema.Types.Mixed], default: [] },
    alerts: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

RevenuePlanSnapshotSchema.index({ key: 1 }, { unique: true });

export const RevenuePlanSnapshotModel = appModel<RevenuePlanSnapshot>(
  "RevenuePlanSnapshot",
  RevenuePlanSnapshotSchema,
  "revenueplansnapshots"
);
