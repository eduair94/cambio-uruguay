import { Schema } from "mongoose";
import { appModel } from "../appdb";

// La última corrida de `currency-reddit-opportunities`, un solo documento vivo. Lo muestra el
// encabezado de /oportunidades-reddit: cuándo corrió y qué leyó de cada sub. Un sub que pasa a leer
// cero es la única pista de que se volvió privado o de que la API dejó de contestar.
//
// Espejo de `app/server/models/RedditOpportunityMeta.ts` (tests/appdb/schema_parity.test.ts).
export const REDDIT_OPPS_META_KEY = "reddit_opportunities";

export interface OppsSubStat {
  sub: string;
  fetched: number;
  candidates: number;
  judged: number;
  recommended: number;
}

export interface RedditOpportunityMetaDoc {
  key: string;
  asOf: Date;
  windowDays: number;
  subs: OppsSubStat[];
  judged: number;
  judgeFailures: number;
  recommendedTotal: number;
  notes: string[];
}

const RedditOpportunityMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: Date, required: true },
    windowDays: { type: Number, default: 30 },
    subs: { type: [Schema.Types.Mixed], default: [] },
    judged: { type: Number, default: 0 },
    judgeFailures: { type: Number, default: 0 },
    recommendedTotal: { type: Number, default: 0 },
    notes: { type: [String], default: [] },
  },
  { timestamps: true }
);

RedditOpportunityMetaSchema.index({ key: 1 }, { unique: true });

export const RedditOpportunityMetaModel = appModel<RedditOpportunityMetaDoc>(
  "RedditOpportunityMeta",
  RedditOpportunityMetaSchema,
  "redditopportunitymetas"
);
