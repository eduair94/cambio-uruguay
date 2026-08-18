import { Schema } from "mongoose";
import { appModel } from "../appdb";

/**
 * Los posts que la cuenta publicó, y los que se descartaron antes de publicar.
 *
 * Guardar los descartes no es prolijidad: los títulos que ya escribimos —salgan o no— son la
 * memoria contra la que se mide "¿esto ya lo preguntamos?". Sin ellos, un generador diario
 * converge en dos semanas a la misma pregunta con otras palabras, que es la forma más rápida de
 * que un sub identifique una cuenta como automática.
 *
 * `sourceTopics` deja escrito de dónde salió la idea. Cuando un post funcione muy bien o muy mal,
 * es la única forma de saber si fue por el tema o por cómo estaba escrito.
 */
export interface RedditSubmissionDoc {
  sub: string;
  title: string;
  body: string;
  flair: string;
  flairId: string;
  /**
   * `reaped` = se publicó, pasó una hora sin que nadie lo comentara ni lo votara, y se borró.
   * Es un estado propio y no `rejected` porque la fila sigue siendo memoria útil: el título cuenta
   * para no repetir la pregunta, y la tasa de reaped es la medida de si el generador está
   * funcionando o publicando cosas que a nadie le importan.
   */
  status: "posted" | "dry_run" | "rejected" | "failed" | "reaped";
  rejectReason: string;
  /** Cuán parecido era al título más parecido que ya existía en el sub, 0 a 1. */
  noveltyScore: number;
  nearestTitle: string;
  why: string;
  expectedAnswers: string;
  sourceTopics: string[];
  postId: string;
  fullname: string;
  permalink: string;
  postedAt: Date | null;
  checkedAt: Date | null;
  visible: boolean | null;
  score: number;
  numComments: number;
}

const RedditSubmissionSchema = new Schema<RedditSubmissionDoc>(
  {
    sub: { type: String, default: "" },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    flair: { type: String, default: "" },
    flairId: { type: String, default: "" },
    status: { type: String, default: "rejected" },
    rejectReason: { type: String, default: "" },
    noveltyScore: { type: Number, default: 0 },
    nearestTitle: { type: String, default: "" },
    why: { type: String, default: "" },
    expectedAnswers: { type: String, default: "" },
    sourceTopics: { type: [String], default: [] },
    postId: { type: String, default: "" },
    fullname: { type: String, default: "" },
    permalink: { type: String, default: "" },
    postedAt: { type: Date, default: null },
    checkedAt: { type: Date, default: null },
    visible: { type: Boolean, default: null },
    score: { type: Number, default: 0 },
    numComments: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RedditSubmissionSchema.index({ status: 1, postedAt: -1 });
RedditSubmissionSchema.index({ sub: 1, createdAt: -1 });

export const RedditSubmissionModel = appModel<RedditSubmissionDoc>(
  "RedditSubmission",
  RedditSubmissionSchema,
  "redditsubmissions"
);
