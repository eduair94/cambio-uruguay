import { Schema } from "mongoose";
import { appModel } from "../appdb";

/**
 * The bot's memory: one row per Reddit post it has ever considered acting on.
 *
 * Rows are written for rejections too, not only for posts. That is deliberate — without them the
 * bot re-scores the same rejected thread every twelve minutes forever, paying an embedding and a
 * judge call each time, and a threshold nudge would suddenly make it answer a week-old thread as
 * if it were new. A rejection is a decision, and decisions are what this collection stores.
 *
 * `status`:
 *   posted    — a live comment exists; `commentFullname` is its `t1_…` id
 *   dry_run   — everything ran, nothing was sent (no creds, or REDDIT_BOT_DRY_RUN)
 *   rejected  — a gate said no; `rejectReason` says which
 *   failed    — we tried to post and Reddit refused
 */
export interface RedditBotReplyDoc {
  postId: string;
  sub: string;
  /**
   * La cuenta de Reddit que escribió (o habría escrito) esto. Sin `u/`.
   *
   * Existe porque el ledger sobrevive al cambio de cuenta y las decisiones no. Cuando el bot pasó de
   * `AskUruguayanBot` a `SizeSouthern112`, el vigilante volvió a leer los comentarios del primero
   * con el token del segundo, los encontró invisibles —los había borrado AutoModerator por falta de
   * karma, que es justamente el problema que el cambio de cuenta resolvía— y pausó al bot nuevo
   * cuarenta y ocho horas por el pasado de otro. Los cupos tenían el mismo defecto: los comentarios
   * de una cuenta contaban contra el tope diario de la otra.
   *
   * Vacío en las filas viejas, y eso significa exactamente lo correcto: no son de la cuenta actual.
   */
  account: string;
  author: string;
  postTitle: string;
  postPermalink: string;
  postCreatedUtc: number;
  /**
   * `waiting_page` is the one that is not terminal: the site had no answer, the gap pipeline
   * published a page for it, and this thread is queued to be answered once that page is live and
   * indexed. Every other status means the decision is made.
   */
  status: "posted" | "dry_run" | "rejected" | "failed" | "waiting_page";
  rejectReason: string;
  pagePath: string;
  pageUrl: string;
  retrievalScore: number;
  retrievalCosine: number;
  judgeConfidence: number;
  judgeReason: string;
  replyText: string;
  commentId: string;
  commentFullname: string;
  postedAt: Date | null;
  /** Follow-up, written by the watcher: is the comment still alive, and how did it land? */
  checkedAt: Date | null;
  commentScore: number;
  removed: boolean;
}

const RedditBotReplySchema = new Schema<RedditBotReplyDoc>(
  {
    postId: { type: String, required: true },
    sub: { type: String, default: "" },
    account: { type: String, default: "" },
    author: { type: String, default: "" },
    postTitle: { type: String, default: "" },
    postPermalink: { type: String, default: "" },
    postCreatedUtc: { type: Number, default: 0 },
    status: { type: String, default: "rejected" },
    rejectReason: { type: String, default: "" },
    pagePath: { type: String, default: "" },
    pageUrl: { type: String, default: "" },
    retrievalScore: { type: Number, default: 0 },
    retrievalCosine: { type: Number, default: 0 },
    judgeConfidence: { type: Number, default: 0 },
    judgeReason: { type: String, default: "" },
    replyText: { type: String, default: "" },
    commentId: { type: String, default: "" },
    commentFullname: { type: String, default: "" },
    postedAt: { type: Date, default: null },
    checkedAt: { type: Date, default: null },
    commentScore: { type: Number, default: 0 },
    removed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RedditBotReplySchema.index({ postId: 1 }, { unique: true });
RedditBotReplySchema.index({ status: 1, postedAt: -1 });
RedditBotReplySchema.index({ account: 1, status: 1, postedAt: -1 });
RedditBotReplySchema.index({ author: 1, postedAt: -1 });
RedditBotReplySchema.index({ pagePath: 1, postedAt: -1 });

export const RedditBotReplyModel = appModel<RedditBotReplyDoc>(
  "RedditBotReply",
  RedditBotReplySchema,
  "redditbotreplies"
);
