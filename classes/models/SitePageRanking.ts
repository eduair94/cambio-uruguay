import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PageRankingSnapshot } from "../site-analytics/pageRanking";

// Vive en la base del APP. Un solo documento (`key: "site"`), reescrito cada día por
// `currency-site-analytics`: GA4 es el archivo, así que acá no se guarda historia.
//
// PRIVADO: lo sirve `/api/site-page-ranking` con `requireAdmin` a /estadisticas-por-pagina. Lleva
// el tramo de valor de cada familia y por dónde se entra a cada página, que no se publica.
//
// Espejo campo a campo de `app/server/models/SitePageRanking.ts` —
// tests/appdb/schema_parity.test.ts falla si los dos se separan.
const SitePageRankingSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    timezone: { type: String, default: "America/Montevideo" },
    range: { type: Schema.Types.Mixed, required: true },
    weeks: { type: [Schema.Types.Mixed], default: [] },
    totals: { type: Schema.Types.Mixed, required: true },
    pageCount: { type: Number, default: 0 },
    truncated: { type: Boolean, default: false },
    pages: { type: [Schema.Types.Mixed], default: [] },
    families: { type: [Schema.Types.Mixed], default: [] },
    focus: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

SitePageRankingSchema.index({ key: 1 }, { unique: true });

export const SitePageRankingModel = appModel<PageRankingSnapshot>(
  "SitePageRanking",
  SitePageRankingSchema,
  "sitepagerankings"
);
