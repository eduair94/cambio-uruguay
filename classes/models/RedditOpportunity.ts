import { Schema } from "mongoose";
import { appModel } from "../appdb";

// La cola de /oportunidades-reddit: un documento por hilo que el juez ya miró (`sync_reddit_opportunities.ts`).
//
// Vive en la base del APP porque la lee la página privada, detrás de `requireAdmin`. Se guardan
// también los RECHAZADOS: no se muestran, pero sin ellos el juez volvería a pagar por el mismo hilo
// todos los días durante un mes.
//
// Dos dueños, y no se pisan: el job escribe todo menos `state`/`stateAt`/`answerUrl` (sólo los
// inicializa con `$setOnInsert`), y el app escribe esos tres cuando una persona marca el hilo. El
// job sí escribe `answerVisible`/`answerCheckedAt`: es quien relee el comentario con token anónimo.
//
// SIN AUTOR, a propósito: para contestar un hilo no hace falta saber quién lo escribió, y una cola
// de trabajo que guarda nombres es un perfil de personas que nadie pidió.
//
// Espejo campo a campo de `app/server/models/RedditOpportunity.ts` (tests/appdb/schema_parity.test.ts).
export interface RedditOpportunityDoc {
  postId: string;
  sub: string;
  title: string;
  excerpt: string;
  permalink: string;
  linkUrl: string;
  flair: string;
  lang: "es" | "en";
  createdAt: Date;
  score: number;
  numComments: number;
  locked: boolean;
  removed: boolean;
  verdict: "recommend" | "reject";
  path: string;
  pageTitle: string;
  family: string;
  confidence: number;
  reason: string;
  angle: string;
  alreadyLinked: boolean | null;
  linkCheckedAt: Date | null;
  linkCheckedComments: number;
  rank: number;
  judgedAt: Date;
  judgeModel: string;
  seenAt: Date;
  state: "open" | "answered" | "dismissed";
  stateAt: Date | null;
  answerUrl: string;
  answerVisible: boolean | null;
  answerCheckedAt: Date | null;
  duplicateOf: string;
  alsoIn: Array<{ sub: string; permalink: string }>;
}

const RedditOpportunitySchema = new Schema(
  {
    postId: { type: String, required: true },
    sub: { type: String, required: true },
    title: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    permalink: { type: String, default: "" },
    linkUrl: { type: String, default: "" },
    flair: { type: String, default: "" },
    lang: { type: String, default: "es" },
    createdAt: { type: Date, required: true },
    score: { type: Number, default: 0 },
    numComments: { type: Number, default: 0 },
    locked: { type: Boolean, default: false },
    removed: { type: Boolean, default: false },
    verdict: { type: String, required: true },
    path: { type: String, default: "" },
    pageTitle: { type: String, default: "" },
    family: { type: String, default: "otros" },
    confidence: { type: Number, default: 0 },
    reason: { type: String, default: "" },
    angle: { type: String, default: "" },
    alreadyLinked: { type: Boolean, default: null },
    linkCheckedAt: { type: Date, default: null },
    linkCheckedComments: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    judgedAt: { type: Date, required: true },
    judgeModel: { type: String, default: "" },
    seenAt: { type: Date, required: true },
    state: { type: String, default: "open" },
    stateAt: { type: Date, default: null },
    answerUrl: { type: String, default: "" },
    answerVisible: { type: Boolean, default: null },
    answerCheckedAt: { type: Date, default: null },
    duplicateOf: { type: String, default: "" },
    alsoIn: { type: [Schema.Types.Mixed], default: [] },
  },
  // Sin `timestamps`: `createdAt` es la fecha del HILO en Reddit, no la de la fila, y mongoose la
  // pisaría con la del insert.
  { timestamps: false }
);

RedditOpportunitySchema.index({ postId: 1 }, { unique: true });
RedditOpportunitySchema.index({ verdict: 1, state: 1, rank: -1 });
RedditOpportunitySchema.index({ createdAt: 1 });

export const RedditOpportunityModel = appModel<RedditOpportunityDoc>(
  "RedditOpportunity",
  RedditOpportunitySchema,
  "redditopportunities"
);
