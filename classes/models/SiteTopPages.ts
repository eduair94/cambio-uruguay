import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicTopPagesSnapshot } from "../site-analytics/publicTopPages";

// Vive en la base del APP. PÚBLICO: `/api/site-top-pages` lo devuelve entero a
// /paginas-mas-visitadas. Por eso es una colección aparte de `sitepagerankings` (privada) y se arma
// campo por campo en classes/site-analytics/publicTopPages.ts.
//
// Espejo campo a campo de `app/server/models/SiteTopPages.ts` —
// tests/appdb/schema_parity.test.ts falla si los dos se separan.
const SiteTopPagesSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    range: { type: Schema.Types.Mixed, required: true },
    weeks: { type: [Schema.Types.Mixed], default: [] },
    totals: { type: Schema.Types.Mixed, required: true },
    pages: { type: [Schema.Types.Mixed], default: [] },
    rising: { type: [Schema.Types.Mixed], default: [] },
    aiCited: { type: [Schema.Types.Mixed], default: [] },
    topics: { type: [Schema.Types.Mixed], default: [] },
    guides: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

SiteTopPagesSchema.index({ key: 1 }, { unique: true });

export const SiteTopPagesModel = appModel<PublicTopPagesSnapshot>("SiteTopPages", SiteTopPagesSchema, "sitetoppages");
