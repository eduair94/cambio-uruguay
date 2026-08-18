import { Schema } from "mongoose";
import { appModel } from "../appdb";

/**
 * Comentarios que NO promocionan nada.
 *
 * El bot nace con cero karma, y varios subs uruguayos borran por AutoModerator lo que escribe una
 * cuenta nueva sin historial — medido: el primer comentario en r/uruguay y el de r/Burises
 * volvieron `[removed]` mientras el de r/test se veía perfecto. Así que antes de poder contestar
 * preguntas de plata, la cuenta necesita existir como cuenta: comentarios comunes, en hilos que no
 * son nuestro tema, sin un solo enlace.
 *
 * Colección aparte de `redditbotreplies` a propósito. Aquella tiene índice único por `postId` y
 * toda su lógica de límites gira alrededor de "a qué página enlacé y cuándo"; acá no hay página, no
 * hay cosine y no hay juez. Mezclarlas obligaría a que cada consulta de las dos filtrara por un
 * campo `kind`, y la primera que se olvidara de hacerlo contaría chistes como si fueran respuestas.
 *
 * `visible` es el campo que hace el trabajo interesante: se llena leyendo el comentario con un
 * token anónimo, porque el autor de un comentario borrado lo sigue viendo normal. De ahí sale qué
 * subs aceptan a la cuenta y cuáles no.
 */
export interface RedditSocialCommentDoc {
  postId: string;
  sub: string;
  author: string;
  postTitle: string;
  postPermalink: string;
  postCreatedUtc: number;
  status: "posted" | "dry_run" | "rejected" | "failed";
  /** "util" = alguien preguntó en serio; "liviano" = charla. Fija el largo permitido. */
  register: "util" | "liviano";
  rejectReason: string;
  text: string;
  commentId: string;
  commentFullname: string;
  postedAt: Date | null;
  checkedAt: Date | null;
  /** null = todavía no se miró. false = el sub lo borró. */
  visible: boolean | null;
  score: number;
}

const RedditSocialCommentSchema = new Schema<RedditSocialCommentDoc>(
  {
    postId: { type: String, required: true },
    sub: { type: String, default: "" },
    author: { type: String, default: "" },
    postTitle: { type: String, default: "" },
    postPermalink: { type: String, default: "" },
    postCreatedUtc: { type: Number, default: 0 },
    status: { type: String, default: "rejected" },
    register: { type: String, default: "liviano" },
    rejectReason: { type: String, default: "" },
    text: { type: String, default: "" },
    commentId: { type: String, default: "" },
    commentFullname: { type: String, default: "" },
    postedAt: { type: Date, default: null },
    checkedAt: { type: Date, default: null },
    visible: { type: Boolean, default: null },
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RedditSocialCommentSchema.index({ postId: 1 }, { unique: true });
RedditSocialCommentSchema.index({ status: 1, postedAt: -1 });
RedditSocialCommentSchema.index({ sub: 1, postedAt: -1 });

export const RedditSocialCommentModel = appModel<RedditSocialCommentDoc>(
  "RedditSocialComment",
  RedditSocialCommentSchema,
  "redditsocialcomments"
);
