// Mongo access for the bot's memory. Every read the rate limiter needs, and every write the run
// produces, in one place — so `limits.ts` can stay a pure function of a snapshot and be tested
// without a database.

import { RedditBotReplyModel, type RedditBotReplyDoc } from "../models/RedditBotReply";
import { RedditSocialCommentModel } from "../models/RedditSocialComment";

export interface LedgerSnapshot {
  /** Comments actually posted in the last 24 h. */
  postedLast24h: Array<{ sub: string; author: string; pagePath: string; postedAt: Date }>;
  /** The most recent posted comment, whenever it was. */
  lastPostedAt: Date | null;
  /** Bad outcomes (removed, or score ≤ the breaker threshold) seen in the last 24 h. */
  recentNegatives: number;
  /** Set by the watcher when the breaker trips. */
  pausedUntil: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Post ids already decided on, so a run never re-scores what it already judged.
 *
 * `waiting_page` is excluded: that thread is not decided, it is parked until the page written for
 * it goes live. Including it here would mean the pipeline researched, wrote and published a page
 * and then never went back to answer the question that asked for it.
 */
export async function seenPostIds(postIds: readonly string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const [propias, sociales] = await Promise.all([
    RedditBotReplyModel.find({ postId: { $in: [...postIds] }, status: { $ne: "waiting_page" } })
      .select({ postId: 1 })
      .lean<Array<{ postId: string }>>(),
    // Un hilo donde ya comentamos sin enlace está hablado. Ver hasPostedTo.
    RedditSocialCommentModel.find({ postId: { $in: [...postIds] }, status: { $in: ["posted", "failed"] } })
      .select({ postId: 1 })
      .lean<Array<{ postId: string }>>(),
  ]);
  return new Set([...propias, ...sociales].map((r) => r.postId));
}

/**
 * Have we actually left a comment on this thread?
 *
 * The narrow question, and the only one that must never be answered twice. Distinct from
 * `seenPostIds`, which is the broad "did we already decide about this" used by the scheduled run to
 * avoid re-spending on a thread it already dismissed. A past REJECTION is not a duplicate — it is a
 * decision that a deliberate manual answer is entitled to override, and conflating the two meant
 * `reddit_answer` refused every thread the cron had ever declined for being too old.
 */
export async function hasPostedTo(postId: string): Promise<boolean> {
  // Las DOS colecciones. El pase social ya consulta ésta antes de comentar; sin la vuelta simétrica,
  // el bot de respuestas podía escribir sobre un hilo donde la misma cuenta ya había comentado, y
  // para quien lee el hilo no hay dos bots: hay una cuenta hablando dos veces.
  const [propia, social] = await Promise.all([
    RedditBotReplyModel.findOne({ postId, status: "posted" }).select({ _id: 1 }).lean(),
    RedditSocialCommentModel.findOne({ postId, status: { $in: ["posted", "failed"] } }).select({ _id: 1 }).lean(),
  ]);
  return !!propia || !!social;
}

/**
 * Park the threads a freshly published page was written for.
 *
 * They keep the route so the revisit pass knows what to wait for, and they stay out of
 * `seenPostIds` so the bot picks them up again the moment the page is answerable.
 */
export async function markWaitingForPage(postIds: readonly string[], pagePath: string): Promise<number> {
  if (!postIds.length) return 0;
  const res = await RedditBotReplyModel.updateMany(
    { postId: { $in: [...postIds] } },
    { $set: { status: "waiting_page", pagePath, rejectReason: "esperando la página generada" } }
  );
  return res?.modifiedCount ?? 0;
}

/** Threads parked on a page, oldest first. */
export async function waitingForPage(): Promise<Array<{ postId: string; pagePath: string; sub: string }>> {
  return RedditBotReplyModel.find({ status: "waiting_page" })
    .select({ postId: 1, pagePath: 1, sub: 1 })
    .lean<Array<{ postId: string; pagePath: string; sub: string }>>();
}

/**
 * Olvidar los "demasiado viejo" que hoy caen DENTRO de la ventana.
 *
 * `too_old` se anota como decisión durable, y con razón: un hilo sólo envejece, así que la
 * respuesta nunca va a cambiar. Con una salvedad que costó encontrar — eso vale mientras la ventana
 * no cambie. Cuando `maxAgeHours` pasó de 8 h a una semana, cada hilo que el bot había descartado
 * por tener nueve horas quedó marcado para siempre, y esos hilos son EXACTAMENTE el atraso que la
 * ventana nueva existe para contestar. El síntoma habría sido perfecto: el bot lee 400 hilos, los
 * reporta todos como "ya decididos" y contesta cero, con los logs diciendo que todo anda bien.
 *
 * Sólo `filter:too_old`, y sólo dentro de la ventana actual. Un `gap:` o un `judge` son decisiones
 * sobre el contenido y siguen valiendo; un `too_old` de hace un mes también.
 *
 * Devuelve cuántas filas borró.
 */
export async function forgetTooOldWithin(sinceUtcSeconds: number): Promise<number> {
  const res = await RedditBotReplyModel.deleteMany({
    status: "rejected",
    rejectReason: "filter:too_old",
    postCreatedUtc: { $gte: sinceUtcSeconds },
  });
  return res?.deletedCount ?? 0;
}

export async function readSnapshot(now: number = Date.now()): Promise<LedgerSnapshot> {
  const since = new Date(now - DAY_MS);

  const posted = await RedditBotReplyModel.find({ status: "posted", postedAt: { $gte: since } })
    .select({ sub: 1, author: 1, pagePath: 1, postedAt: 1 })
    .lean<Array<{ sub: string; author: string; pagePath: string; postedAt: Date }>>();

  const [latest] = await RedditBotReplyModel.find({ status: "posted" })
    .sort({ postedAt: -1 })
    .limit(1)
    .select({ postedAt: 1 })
    .lean<Array<{ postedAt: Date }>>();

  const recentNegatives = await RedditBotReplyModel.countDocuments({
    status: "posted",
    postedAt: { $gte: since },
    $or: [{ removed: true }, { commentScore: { $lte: -2 } }],
  });

  return {
    postedLast24h: posted,
    lastPostedAt: latest?.postedAt ?? null,
    recentNegatives,
    pausedUntil: await readPausedUntil(),
  };
}

/** How recently we linked a given page, and how recently we replied to a given author. Unbounded
 *  in time on purpose: the cooldowns are measured in days, not within the 24 h window. */
export async function lastLinkedAt(pagePath: string): Promise<Date | null> {
  const [row] = await RedditBotReplyModel.find({ status: "posted", pagePath })
    .sort({ postedAt: -1 })
    .limit(1)
    .select({ postedAt: 1 })
    .lean<Array<{ postedAt: Date }>>();
  return row?.postedAt ?? null;
}

export async function lastRepliedToAuthorAt(author: string): Promise<Date | null> {
  if (!author) return null;
  const [row] = await RedditBotReplyModel.find({ status: "posted", author })
    .sort({ postedAt: -1 })
    .limit(1)
    .select({ postedAt: 1 })
    .lean<Array<{ postedAt: Date }>>();
  return row?.postedAt ?? null;
}

export type LedgerWrite = Partial<RedditBotReplyDoc> & { postId: string };

/**
 * Record a decision. Upsert by `postId`, so a re-run that reaches the same thread updates the row
 * rather than creating a second one — and so a crash between "posted" and "recorded" is repaired
 * on the next pass instead of producing a duplicate comment (the unique index is the real guard).
 */
export async function recordDecision(row: LedgerWrite): Promise<void> {
  await RedditBotReplyModel.updateOne({ postId: row.postId }, { $set: row }, { upsert: true });
}

/** Rows whose comment is live and young enough that its score can still move. */
export async function postedWithin(hours: number): Promise<RedditBotReplyDoc[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return RedditBotReplyModel.find({ status: "posted", postedAt: { $gte: since }, removed: false })
    .select({ postId: 1, sub: 1, commentId: 1, commentFullname: 1, postedAt: 1, commentScore: 1, pageUrl: 1 })
    .lean<RedditBotReplyDoc[]>();
}

export async function recordWatch(
  postId: string,
  update: { commentScore: number; removed: boolean }
): Promise<void> {
  await RedditBotReplyModel.updateOne(
    { postId },
    { $set: { ...update, checkedAt: new Date() } }
  );
}

// The breaker's pause is stored as a row in the same collection rather than in a second one: a
// sentinel `postId` keeps it in a place the bot already reads and cannot forget to migrate.
const PAUSE_SENTINEL = "__paused__";

export async function readPausedUntil(): Promise<Date | null> {
  const row = await RedditBotReplyModel.findOne({ postId: PAUSE_SENTINEL })
    .select({ postedAt: 1 })
    .lean<{ postedAt: Date | null } | null>();
  return row?.postedAt ?? null;
}

export async function pauseUntil(until: Date, reason: string): Promise<void> {
  await RedditBotReplyModel.updateOne(
    { postId: PAUSE_SENTINEL },
    { $set: { postedAt: until, status: "rejected", rejectReason: reason, sub: "", postTitle: "circuit breaker" } },
    { upsert: true }
  );
}
