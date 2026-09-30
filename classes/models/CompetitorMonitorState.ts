import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Vive en la base del APP y lo escribe SÓLO el job `currency-competitor-monitor`: cursor del
// ledger, posiciones vistas y avisadas, días de avisos. Espejo de
// app/server/models/CompetitorMonitorState.ts (tests/appdb/schema_parity.test.ts).
const CompetitorMonitorStateSchema = new Schema(
  {
    uid: { type: String, required: true },
    cursor: { type: Date, default: null },
    positions: { type: Schema.Types.Mixed, default: {} },
    quietDay: { type: Schema.Types.Mixed, default: {} },
    dailyDay: { type: String, default: null },
    lastQuotes: { type: Schema.Types.Mixed, default: {} },
    accessEndedAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
);

CompetitorMonitorStateSchema.index({ uid: 1 }, { unique: true });

export const CompetitorMonitorStateModel = appModel<any>(
  "CompetitorMonitorState",
  CompetitorMonitorStateSchema,
  "competitormonitorstates"
);
