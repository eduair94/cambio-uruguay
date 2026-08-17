// Mongo access for the bot's memory. Every read the rate limiter needs, and every write the run
// produces, in one place — so `limits.ts` can stay a pure function of a snapshot and be tested
// without a database.

import { RedditBotReplyModel, type RedditBotReplyDoc } from "../models/RedditBotReply";

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

/** Post ids already decided on, so a run never re-scores what it already judged. */
export async function seenPostIds(postIds: readonly string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const rows = await RedditBotReplyModel.find({ postId: { $in: [...postIds] } })
    .select({ postId: 1 })
    .lean<Array<{ postId: string }>>();
  return new Set(rows.map((r) => r.postId));
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
