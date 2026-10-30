import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { TrafficSourcesSnapshot } from "../site-analytics/trafficSources";

// Vive en la base del APP. PÚBLICO: `/api/site-traffic-sources` lo devuelve entero a
// /origen-del-trafico. Se arma campo por campo en classes/site-analytics/trafficSources.ts.
//
// Espejo campo a campo de `app/server/models/SiteTrafficSources.ts` —
// tests/appdb/schema_parity.test.ts falla si los dos se separan.
const SiteTrafficSourcesSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    range: { type: Schema.Types.Mixed, required: true },
    history: { type: Schema.Types.Mixed, required: true },
    months: { type: [String], default: [] },
    totals: { type: Schema.Types.Mixed, required: true },
    kinds: { type: [Schema.Types.Mixed], default: [] },
    sources: { type: [Schema.Types.Mixed], default: [] },
    others: { type: Schema.Types.Mixed, default: null },
    referrers: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

SiteTrafficSourcesSchema.index({ key: 1 }, { unique: true });

export const SiteTrafficSourcesModel = appModel<TrafficSourcesSnapshot>(
  "SiteTrafficSources",
  SiteTrafficSourcesSchema,
  "sitetrafficsources",
);
