import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { DemandQueue } from "../demand/refresh";

// Vive en la base del APP, un solo documento vivo. Es una COLA DE TRABAJO para una persona, no un
// insumo de ninguna página pública: dice qué convendría escribir, y eso incluye decir dónde el
// sitio no llega. Lo lee /estadisticas-de-busqueda, que ya está detrás de `requireAdmin`.
const SearchDemandQueueSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    harvested: { type: Number, default: 0 },
    local: { type: Number, default: 0 },
    inScope: { type: Number, default: 0 },
    probed: { type: Number, default: 0 },
    items: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

SearchDemandQueueSchema.index({ key: 1 }, { unique: true });

export const SearchDemandQueueModel = appModel<DemandQueue>(
  "SearchDemandQueue",
  SearchDemandQueueSchema,
  "searchdemandqueues"
);
