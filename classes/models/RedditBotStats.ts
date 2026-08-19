import { Schema } from "mongoose";
import { appModel } from "../appdb";

/**
 * La foto pública de lo que el bot de Reddit viene haciendo, para /estadisticas-reddit.
 *
 * UNA fila, `key: "reddit"`, reescrita cada día. La pregunta obvia es por qué existe: el ledger
 * (`redditbotreplies`) ya tiene todo, está en esta misma base, y agregarlo en vivo cuesta
 * milisegundos con los volúmenes reales. Dos razones, y la segunda es la que manda.
 *
 *  1. La página la lee cualquiera. Agregar en vivo significa que cada visita corre una agregación
 *     sobre la colección que el bot está escribiendo, y el bot escribe una fila por hilo evaluado —
 *     cientos por corrida. Una foto la sirve entera desde un documento.
 *  2. **El histórico no puede depender de que el ledger no se limpie nunca.** El ledger es memoria
 *     operativa: existe para que el bot no re-evalúe lo mismo, y el día que alguien borre las
 *     rechazadas viejas —cosa razonable— el histórico se iría con ellas. Por eso `days` se MEZCLA
 *     en vez de recalcularse entero: un día ya registrado se conserva aunque sus filas desaparezcan.
 *     Eso es lo que hace que esto sea un registro y no una consulta guardada.
 */

/** Un día del histórico. La unidad, porque es la que se lee en un gráfico. */
export interface RedditStatsDay {
  /** YYYY-MM-DD, en UTC. */
  date: string;
  /** Comentarios efectivamente publicados ese día. */
  posted: number;
  /** Hilos evaluados y descartados ese día. */
  rejected: number;
  /** Hilos que el sitio no supo contestar: el material de las páginas que faltan. */
  gaps: number;
  /** Suma de votos de los comentarios de ese día, tal como se los vio la última vez. */
  score: number;
  /** Cuántos de esos comentarios terminaron borrados. */
  removed: number;
}

/** Un hilo contestado, para la tabla pública. Sin nada que identifique a nadie más que el sub. */
export interface RedditStatsAnswer {
  postTitle: string;
  postPermalink: string;
  sub: string;
  /** La página del sitio que se enlazó. */
  pagePath: string;
  postedAt: Date | null;
  score: number;
  removed: boolean;
  /** El comentario tal como se publicó. Es lo que hace auditable la promesa de "respuestas útiles". */
  replyText: string;
}

/** Un conteo con nombre: por sub, por página, por motivo de descarte. */
export interface RedditStatsCount {
  name: string;
  count: number;
}

export interface RedditBotStatsDoc {
  key: string;
  /** Cuándo se calculó esta foto. */
  asOf: Date;
  /** La cuenta que está publicando hoy. */
  account: string;
  /** Totales de todos los tiempos. */
  totals: {
    answered: number;
    evaluated: number;
    gaps: number;
    subs: number;
    pages: number;
    score: number;
    removed: number;
    /** Comentarios vivos: publicados menos borrados. */
    alive: number;
  };
  /** Día más viejo con datos, para poder decir "desde el …". */
  since: string;
  days: RedditStatsDay[];
  bySub: RedditStatsCount[];
  byPage: RedditStatsCount[];
  /** Por qué se descartaron los hilos. Es la mitad honesta de la estadística. */
  byRejectReason: RedditStatsCount[];
  /** Los últimos hilos contestados. */
  answers: RedditStatsAnswer[];
  /** Preguntas que el sitio todavía no sabe contestar, agrupadas. */
  openQuestions: Array<{ title: string; sub: string; permalink: string; createdUtc: number }>;
}

const CountSchema = new Schema<RedditStatsCount>(
  { name: { type: String, default: "" }, count: { type: Number, default: 0 } },
  { _id: false }
);

const DaySchema = new Schema<RedditStatsDay>(
  {
    date: { type: String, default: "" },
    posted: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    gaps: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    removed: { type: Number, default: 0 },
  },
  { _id: false }
);

const AnswerSchema = new Schema<RedditStatsAnswer>(
  {
    postTitle: { type: String, default: "" },
    postPermalink: { type: String, default: "" },
    sub: { type: String, default: "" },
    pagePath: { type: String, default: "" },
    postedAt: { type: Date, default: null },
    score: { type: Number, default: 0 },
    removed: { type: Boolean, default: false },
    replyText: { type: String, default: "" },
  },
  { _id: false }
);

const RedditBotStatsSchema = new Schema<RedditBotStatsDoc>(
  {
    key: { type: String, required: true, unique: true },
    asOf: { type: Date, default: null },
    account: { type: String, default: "" },
    totals: {
      answered: { type: Number, default: 0 },
      evaluated: { type: Number, default: 0 },
      gaps: { type: Number, default: 0 },
      subs: { type: Number, default: 0 },
      pages: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      removed: { type: Number, default: 0 },
      alive: { type: Number, default: 0 },
    },
    since: { type: String, default: "" },
    days: { type: [DaySchema], default: [] },
    bySub: { type: [CountSchema], default: [] },
    byPage: { type: [CountSchema], default: [] },
    byRejectReason: { type: [CountSchema], default: [] },
    answers: { type: [AnswerSchema], default: [] },
    openQuestions: {
      type: [
        new Schema(
          {
            title: { type: String, default: "" },
            sub: { type: String, default: "" },
            permalink: { type: String, default: "" },
            createdUtc: { type: Number, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const RedditBotStatsModel = appModel<RedditBotStatsDoc>(
  "RedditBotStats",
  RedditBotStatsSchema,
  "redditbotstats"
);
