import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Vive en la base del APP. La configuración del monitor de competencia: la escribe el app
// (/api/me/monitor), la LEE el job `currency-competitor-monitor`. Espejo campo a campo de
// app/server/models/CompetitorMonitor.ts — tests/appdb/schema_parity.test.ts falla si se separan.
const CompetitorMonitorSchema = new Schema(
  {
    uid: { type: String, required: true },
    email: { type: String, default: null },
    ownOrigin: { type: String, default: null },
    competitors: { type: [String], default: [] },
    currencies: { type: [String], default: ["USD"] },
    alerts: { type: Schema.Types.Mixed, default: {} },
    channels: { type: Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
    trialStartedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const CompetitorMonitorModel = appModel<any>("CompetitorMonitor", CompetitorMonitorSchema, "competitormonitors");
