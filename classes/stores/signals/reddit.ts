// Signal for /tiendas-online-uruguay: how often a store is actually mentioned on r/uruguay and
// r/montevideo, read from Arctic Shift (arctic-shift.photon-reddit.com) — a public Reddit archive
// that keeps what got deleted later, the same source classes/charruadevs/harvest.ts already reads.
//
// **Reddit sin personas, por diseño:** no type here has a field for a Reddit username, and the only
// things this feature publishes (`RedditSignal`) are counts, years, thread titles and links — never an
// author, never a quoted comment body. What is persisted per store (`StoredRedditMention`) is metadata
// only. `RedditMention.text` exists ONLY so Task 7's classifier can read a newly fetched title/body
// once, in memory; `mergeStoredMentions` rebuilds every stored row field by field, so the text never
// reaches a document.
//
// Why re-filter locally after an already-scoped API query: Arctic Shift's own `query=`/`body=`
// search is a loose keyword match, and several store names are common Spanish words ("Divino",
// "Ta-Ta", "El Dorado"...) that need the registry's `redditMatch` disambiguator re-checked against
// the ACTUAL normalized title+text before a hit counts — the same guard classes/stores/registry.ts
// documents and tests/stores/registry.test.ts already exercises for those regexes.
//
// **Incremental, by windows.** Measured against Arctic Shift on 2026-09-16:
//   * an expensive search does not come back as a 429 but as HTTP 422 (or sometimes a 200) with
//     `{"error":"Timeout. Maybe slow down a bit"}`;
//   * on r/uruguay a comments search over one month and a posts `query=` search over three months
//     already time out, while 14–21-day comment windows and 30-day post windows answer;
//   * one answer is at most `limit=100` rows;
//   * `after` and `before` are both EXCLUSIVE (a row created exactly at `after` is not returned).
// So a single "last three years" search almost never answered, and truncated when it did. Instead,
// each store keeps a cursor (`RedditCursor`): the first runs backfill 24 months in windows (posts
// every 6 months, comments every 3), paginating each window, and once that is done every run only
// reads from a day before where the last one stopped. A window that keeps timing out is split in
// halves down to 14 days, and what failed and what answered is remembered for the rest of the process
// so the next window and the next store do not pay the same retries again. Every HTTP call spends one unit of the run's
// budget; when it runs out the store keeps what it completed and continues next week.
//
// The delays are env knobs read at call time (not bare constants) purely so tests don't wait tens of
// real seconds — the same pattern classes/stores/signals/age.ts (`STORES_AGE_RETRY_MS`) uses.
import type { StoreEntry } from "../types";
import { storeNorm } from "../registry";

/** What is persisted per mention: no text, no author. */
export interface StoredRedditMention {
  id: string;
  kind: "post" | "comment";
  sub: string;
  createdUtc: number;
  threadId: string;
  title: string | null;
  permalink: string;
  score: number;
}

export interface RedditMention extends StoredRedditMention {
  /** Raw title+selftext (posts) or body (comments) — in-memory only, see module header. */
  text: string;
}

export interface RedditSignal {
  mentions: number;
  byYear: Record<string, number>;
  /** Up to 5, posts only — never a comment, which has no title of its own. */
  threads: Array<{ title: string; date: string; url: string; score: number }>;
  /** Filled by Task 7; always `null` here. */
  tone: { complaints: number; recommendations: number; neutral: number; classified: number } | null;
  /** True when the stored mentions reached STORE_REDDIT_MAX_MENTIONS: the figure reads "500 or more". */
  capped: boolean;
  checkedAt: string;
}

/**
 * Where a store's Reddit reading stands, in Unix seconds. While `backfillDone` is false, everything in
 * [backfillStartUtc, backfillNextUtc) has been read; once it is true, everything in
 * [backfillStartUtc, checkedUntilUtc) has.
 */
export interface RedditCursor {
  backfillStartUtc: number;
  backfillNextUtc: number;
  backfillDone: boolean;
  checkedUntilUtc: number;
}

/** A half-open window [afterUtc, beforeUtc) of one kind of Reddit object. */
export interface RedditWindow {
  kind: "post" | "comment";
  afterUtc: number;
  beforeUtc: number;
}

export const STORE_REDDIT_BACKFILL_MONTHS = 24;
export const STORE_REDDIT_MAX_MENTIONS = 500;

const BASE = "https://arctic-shift.photon-reddit.com/api";
const UA = "cambio-uruguay/1.0 (+https://cambio-uruguay.com/tiendas-online-uruguay)";
const SUBREDDITS = ["uruguay", "montevideo"] as const;

const PAGE_LIMIT = 100;
const POST_WINDOW_MONTHS = 6;
const COMMENT_WINDOW_MONTHS = 3;
const DAY_SECONDS = 86_400;
/** Incremental runs re-read one day before where the last one stopped: late-archived rows land there. */
const INCREMENTAL_OVERLAP_SECONDS = DAY_SECONDS;
/** A failing window shorter than this is not split again: the store stops and resumes next run. */
const MIN_SPLIT_SECONDS = 14 * DAY_SECONDS;
// 1 initial attempt + up to 3 retries ("se reintentan hasta 3 veces").
const MAX_ATTEMPTS = 4;

const gapMs = (): number => Number(process.env.STORES_REDDIT_GAP_MS || 4_000);
const retryMs = (): number => Number(process.env.STORES_REDDIT_RETRY_MS || 20_000);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * True when `text` mentions the store: at least one of `redditTerms` matches as a whole phrase on
 * `storeNorm`-normalized text (word-bounded, so "divino" never matches inside a longer word), AND,
 * when the entry also carries a `redditMatch` disambiguator (common-word store names), that regex
 * ALSO matches the normalized text — a bare term hit is not enough for those.
 */
export function mentionMatches(entry: Pick<StoreEntry, "redditTerms" | "redditMatch">, text: string): boolean {
  const norm = storeNorm(text);
  if (!norm) return false;

  const termHit = entry.redditTerms.some((term) => {
    const normTerm = storeNorm(term);
    if (!normTerm) return false;
    return new RegExp(`\\b${escapeRegExp(normTerm)}\\b`).test(norm);
  });
  if (!termHit) return false;

  if (entry.redditMatch && !entry.redditMatch.test(norm)) return false;
  return true;
}

/**
 * A fingerprint of what decides which mentions a store has: its search terms (normalized, in any
 * order) and its local disambiguator. Mentions stored under another fingerprint were searched or
 * filtered differently, so the profile discards them and the cursor starts over.
 */
export function redditTermsKey(entry: Pick<StoreEntry, "redditTerms" | "redditMatch">): string {
  const terms = [...new Set(entry.redditTerms.map((term) => storeNorm(term)).filter(Boolean))].sort();
  const match = entry.redditMatch ? `/${entry.redditMatch.source}/${entry.redditMatch.flags}` : "";
  return JSON.stringify([terms, match]);
}

/**
 * Folds mentions into the publishable signal: dedupes by `id`, counts by the UTC year of
 * `createdUtc`, and picks up to 5 post threads (never a comment — a comment has no title, only its
 * parent thread does) ordered by score desc then recency desc. Called over the STORED mentions of a
 * store, so `capped` says whether that list hit STORE_REDDIT_MAX_MENTIONS. `now` is accepted for
 * signature parity with other store-signal aggregations (see app/utils/redditSentiment.ts's
 * `aggregateEntitySentiment`); nothing here decays with time — `tone` (Task 7) is what will.
 */
export function summarizeMentions(
  mentions: readonly StoredRedditMention[],
  checkedAt: string,
  now: Date = new Date(),
  capped = false
): RedditSignal {
  void now;

  const byId = new Map<string, StoredRedditMention>();
  for (const mention of mentions) {
    if (!byId.has(mention.id)) byId.set(mention.id, mention);
  }
  const deduped = [...byId.values()];

  const byYear: Record<string, number> = {};
  for (const mention of deduped) {
    const year = String(new Date(mention.createdUtc * 1000).getUTCFullYear());
    byYear[year] = (byYear[year] ?? 0) + 1;
  }

  const threads = deduped
    .filter((mention) => mention.kind === "post")
    .slice()
    .sort((a, b) => b.score - a.score || b.createdUtc - a.createdUtc)
    .slice(0, 5)
    .map((mention) => ({
      title: mention.title ?? "",
      date: new Date(mention.createdUtc * 1000).toISOString().slice(0, 10),
      url: `https://www.reddit.com${mention.permalink}`,
      score: mention.score,
    }));

  return {
    mentions: deduped.length,
    byYear,
    threads,
    tone: null,
    capped,
    checkedAt,
  };
}

/** A stored row rebuilt field by field: whatever else the source object carried (text, author) stays behind. */
function toStored(mention: StoredRedditMention): StoredRedditMention {
  return {
    id: mention.id,
    kind: mention.kind,
    sub: mention.sub,
    createdUtc: mention.createdUtc,
    threadId: mention.threadId,
    title: mention.title,
    permalink: mention.permalink,
    score: mention.score,
  };
}

const isStorable = (value: unknown): value is StoredRedditMention =>
  Boolean(value) &&
  typeof (value as StoredRedditMention).id === "string" &&
  typeof (value as StoredRedditMention).createdUtc === "number";

/**
 * Stored mentions plus a fresh increment: united by `id` (a fresh row wins, it carries the current
 * score), newest first, at most STORE_REDDIT_MAX_MENTIONS. `capped` is true whenever the list is
 * full — not only when this call dropped something — because a full stored list may already have
 * lost older mentions in an earlier run, and the stored list does not remember that.
 */
export function mergeStoredMentions(
  stored: readonly StoredRedditMention[],
  fresh: readonly RedditMention[]
): { mentions: StoredRedditMention[]; capped: boolean } {
  const byId = new Map<string, StoredRedditMention>();
  for (const mention of stored) if (isStorable(mention)) byId.set(mention.id, toStored(mention));
  for (const mention of fresh) if (isStorable(mention)) byId.set(mention.id, toStored(mention));

  const all = [...byId.values()].sort(
    (a, b) => b.createdUtc - a.createdUtc || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  return { mentions: all.slice(0, STORE_REDDIT_MAX_MENTIONS), capped: all.length >= STORE_REDDIT_MAX_MENTIONS };
}

function addMonthsUtc(utc: number, months: number): number {
  const date = new Date(utc * 1000);
  return Math.floor(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    ) / 1000
  );
}

/** Contiguous windows of `months` from `fromUtc`, the last one clamped at `toUtc`. */
function monthWindows(kind: RedditWindow["kind"], fromUtc: number, toUtc: number, months: number): RedditWindow[] {
  const windows: RedditWindow[] = [];
  for (let k = 0; ; k++) {
    const afterUtc = addMonthsUtc(fromUtc, k * months);
    if (afterUtc >= toUtc) break;
    windows.push({ kind, afterUtc, beforeUtc: Math.min(addMonthsUtc(fromUtc, (k + 1) * months), toUtc) });
  }
  return windows;
}

/**
 * The windows a run should read, ordered by start (posts first on a tie) so the cursor can advance
 * as far as both kinds are complete:
 *   * no cursor — the backfill starts STORE_REDDIT_BACKFILL_MONTHS before `nowUtc`;
 *   * backfill under way — it continues from `backfillNextUtc`;
 *   * backfill done — one window per kind, from a day before `checkedUntilUtc` to `nowUtc`.
 */
export function planRedditWindows(cursor: RedditCursor | null, nowUtc: number): RedditWindow[] {
  if (cursor && cursor.backfillDone) {
    const afterUtc = cursor.checkedUntilUtc - INCREMENTAL_OVERLAP_SECONDS;
    if (afterUtc >= nowUtc) return [];
    return [
      { kind: "post", afterUtc, beforeUtc: nowUtc },
      { kind: "comment", afterUtc, beforeUtc: nowUtc },
    ];
  }

  const fromUtc = cursor ? cursor.backfillNextUtc : addMonthsUtc(nowUtc, -STORE_REDDIT_BACKFILL_MONTHS);
  return [
    ...monthWindows("post", fromUtc, nowUtc, POST_WINDOW_MONTHS),
    ...monthWindows("comment", fromUtc, nowUtc, COMMENT_WINDOW_MONTHS),
  ].sort((a, b) => a.afterUtc - b.afterUtc || (a.kind === b.kind ? 0 : a.kind === "post" ? -1 : 1));
}

/** Arctic Shift posts/search row → RedditMention, or null when a required field is missing/wrong-typed. */
function toPostMention(raw: unknown, sub: string): RedditMention | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = typeof row.id === "string" ? row.id : null;
  const createdUtc = typeof row.created_utc === "number" ? row.created_utc : null;
  const permalink = typeof row.permalink === "string" ? row.permalink : null;
  if (!id || createdUtc === null || !permalink) return null;

  const title = typeof row.title === "string" ? row.title : "";
  const selftext = typeof row.selftext === "string" ? row.selftext : "";
  const score = typeof row.score === "number" ? row.score : 0;

  // `row.author` is deliberately never read: no type here has a field for it (see module header).
  return {
    id,
    kind: "post",
    sub,
    createdUtc,
    threadId: id,
    title: title || null,
    permalink,
    score,
    text: [title, selftext].filter(Boolean).join(" "),
  };
}

/**
 * Arctic Shift comments/search row → RedditMention. The `fields=` list this module requests has no
 * `permalink`/`title` (Arctic Shift's field allowlist rejects them for comments), so both are
 * derived: the thread id comes off `link_id` ("t3_<id>" → "<id>"), and the permalink is built from
 * it — good enough for counting, never listed under `threads` (posts only, see summarizeMentions).
 */
function toCommentMention(raw: unknown, sub: string): RedditMention | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = typeof row.id === "string" ? row.id : null;
  const linkId = typeof row.link_id === "string" ? row.link_id : null;
  const createdUtc = typeof row.created_utc === "number" ? row.created_utc : null;
  if (!id || !linkId || createdUtc === null) return null;

  const threadId = linkId.startsWith("t3_") ? linkId.slice(3) : linkId;
  const body = typeof row.body === "string" ? row.body : "";
  const score = typeof row.score === "number" ? row.score : 0;

  // `row.author` is deliberately never read: no type here has a field for it (see module header).
  return {
    id,
    kind: "comment",
    sub,
    createdUtc,
    threadId,
    title: null,
    permalink: `/r/${sub}/comments/${threadId}/`,
    score,
    text: body,
  };
}

/** One store's fetch: the entry, the run-wide budget and what was read so far. */
interface FetchRun {
  entry: StoreEntry;
  budget: { calls: number };
  calls: number;
  byId: Map<string, RedditMention>;
}

type PageResult =
  | { ok: true; rows: unknown[] }
  | { ok: false; reason: "budget" | "failed" | "fatal"; timeout: boolean };

type RangeResult = { ok: true } | { ok: false; coveredUntil: number };

/**
 * For the whole process, per kind and subreddit: the shortest span on which Arctic Shift timed out
 * after every retry, and the longest shorter span that then answered. Once a timeout is known, a
 * later window is cut BEFORE asking — into equal chunks no longer than the span that answered, or in
 * halves while none has — instead of paying four failed calls and a minute of waits again for every
 * store. Equal chunks rather than halves because calendar windows differ by a day or two: halving a
 * 90-day window after a 91-day one failed at 22.8 days gives 22.5-day halves that fail all over again
 * (measured 2026-09-16).
 */
const spanMemory = new Map<string, { failing: number; working: number }>();

function rememberTimeout(key: string, span: number): void {
  const memory = spanMemory.get(key) ?? { failing: Number.POSITIVE_INFINITY, working: 0 };
  memory.failing = Math.min(memory.failing, span);
  if (memory.working >= memory.failing) memory.working = 0;
  spanMemory.set(key, memory);
}

function rememberAnswer(key: string, span: number): void {
  const memory = spanMemory.get(key);
  if (memory && span < memory.failing) memory.working = Math.max(memory.working, span);
}

/** How many equal parts to ask `span` in, from what this process learned; 1 = ask it whole. */
function plannedParts(key: string, span: number): number {
  const memory = spanMemory.get(key);
  if (!memory || span < MIN_SPLIT_SECONDS) return 1;
  if (memory.working > 0) return span > memory.working ? Math.ceil(span / memory.working) : 1;
  return span >= memory.failing ? 2 : 1;
}

/** `[fromUtc, beforeUtc)` as Arctic Shift parameters: its `after` is exclusive, so it gets `fromUtc - 1`. */
function searchUrl(kind: RedditWindow["kind"], sub: string, term: string, fromUtc: number, beforeUtc: number): string {
  const encodedTerm = encodeURIComponent(term);
  const range = `after=${fromUtc - 1}&before=${beforeUtc}&sort=asc&limit=${PAGE_LIMIT}`;
  return kind === "post"
    ? `${BASE}/posts/search?subreddit=${sub}&query=${encodedTerm}&${range}`
    : `${BASE}/comments/search?subreddit=${sub}&body=${encodedTerm}&${range}&fields=id,link_id,created_utc,score,body`;
}

/**
 * One Arctic Shift page, paced and retried. A network error, a 429/5xx, an unreadable body, or
 * Arctic Shift's own timeout error (whatever the status: it arrives as 422 and as 200) is retried up
 * to 3 times; any other error fails at once (`fatal`: the query itself is wrong, retrying or splitting
 * would not help). Every HTTP call spends one unit of `budget.calls`, retries included.
 */
async function fetchPage(run: FetchRun, url: string): Promise<PageResult> {
  let timeout = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (run.budget.calls <= 0) return { ok: false, reason: "budget", timeout };
    if (attempt > 1) await sleep(retryMs());
    else if (run.calls > 0) await sleep(gapMs());
    run.budget.calls--;
    run.calls++;

    let res: Response | undefined;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch {
      res = undefined;
    }
    if (!res) {
      timeout = false;
      continue;
    }

    let body: { data?: unknown; error?: unknown } | undefined;
    try {
      body = ((await res.json()) ?? {}) as { data?: unknown; error?: unknown };
    } catch {
      body = undefined;
    }
    const error = typeof body?.error === "string" ? body.error : null;

    if (error !== null && /timeout|slow down/i.test(error)) {
      timeout = true;
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      timeout = false;
      continue;
    }
    if (!res.ok || error !== null) return { ok: false, reason: "fatal", timeout: false };
    if (!body) {
      timeout = false;
      continue;
    }
    return { ok: true, rows: Array.isArray(body.data) ? body.data : [] };
  }
  return { ok: false, reason: "failed", timeout };
}

/** `[fromUtc, beforeUtc)` as `parts` contiguous equal ranges, read in order; stops at the first failure. */
async function splitRange(
  run: FetchRun,
  kind: RedditWindow["kind"],
  sub: string,
  term: string,
  fromUtc: number,
  beforeUtc: number,
  parts: number
): Promise<RangeResult> {
  const span = beforeUtc - fromUtc;
  for (let k = 0; k < parts; k++) {
    const partFrom = fromUtc + Math.floor((k * span) / parts);
    const partBefore = k === parts - 1 ? beforeUtc : fromUtc + Math.floor(((k + 1) * span) / parts);
    const result = await fetchRange(run, kind, sub, term, partFrom, partBefore);
    if (!result.ok) return result;
  }
  return { ok: true };
}

/**
 * Every row of one term in one subreddit within `[fromUtc, beforeUtc)`, paginated: a full page asks
 * for the next one starting AT its last row's second (so a row sharing that second is not skipped;
 * the repeated ones are dropped by id), and a full page with nothing new moves one second past it so
 * the loop always ends. Matching mentions go into `run.byId`.
 *
 * On failure, `coveredUntil` is how far this range is complete: sorted ascending, everything before
 * the page that failed was already read.
 */
async function fetchRange(
  run: FetchRun,
  kind: RedditWindow["kind"],
  sub: string,
  term: string,
  fromUtc: number,
  beforeUtc: number
): Promise<RangeResult> {
  const learnKey = `${kind}:${sub}`;
  const parts = plannedParts(learnKey, beforeUtc - fromUtc);
  if (parts > 1) return splitRange(run, kind, sub, term, fromUtc, beforeUtc, parts);

  const seen = new Set<string>();
  let from = fromUtc;
  for (;;) {
    const page = await fetchPage(run, searchUrl(kind, sub, term, from, beforeUtc));
    // `=== false`, not `!page.ok`: TypeScript 4.9 does not narrow the union on a negated boolean.
    if (page.ok === false) {
      const span = beforeUtc - from;
      if (page.reason === "failed" && page.timeout) rememberTimeout(learnKey, span);
      if (page.reason === "failed" && span >= MIN_SPLIT_SECONDS) return splitRange(run, kind, sub, term, from, beforeUtc, 2);
      return { ok: false, coveredUntil: from };
    }

    rememberAnswer(learnKey, beforeUtc - from);
    let fresh = 0;
    let lastCreated: number | null = null;
    for (const raw of page.rows) {
      const row = (raw ?? {}) as { id?: unknown; created_utc?: unknown };
      if (typeof row.created_utc === "number") lastCreated = row.created_utc;
      if (typeof row.id === "string" && !seen.has(row.id)) {
        seen.add(row.id);
        fresh++;
      }
      const mention = kind === "post" ? toPostMention(raw, sub) : toCommentMention(raw, sub);
      if (mention && mentionMatches(run.entry, mention.text)) run.byId.set(mention.id, mention);
    }

    if (page.rows.length < PAGE_LIMIT || lastCreated === null) return { ok: true };
    from = fresh > 0 ? Math.max(from, lastCreated) : Math.max(from, lastCreated) + 1;
    if (from >= beforeUtc) return { ok: true };
  }
}

/**
 * Reads the next stretch of r/uruguay and r/montevideo for one store, from `cursor` (null: never read)
 * up to `nowUtc`, spending `budget.calls` (shared by the whole run, decremented in place).
 *
 *   * `complete: true` — every planned window was read; the cursor ends at `nowUtc`.
 *   * `complete: false` — the budget ran out, or a window kept failing below the 14-day floor. The
 *     cursor stops at the last point both kinds are complete (never beyond), and only mentions before
 *     it are returned; the rest is read again next run.
 *   * `undefined` — nothing got completed at all (Arctic Shift did not answer, or the budget was
 *     already spent): the caller keeps the stored mentions, cursor and signal exactly as they were.
 *
 * `mentions` carry their raw `text`, for the tone classifier only; they are never stored as they are.
 */
export async function fetchRedditIncrement(
  entry: StoreEntry,
  cursor: RedditCursor | null,
  nowUtc: number,
  budget: { calls: number }
): Promise<{ mentions: RedditMention[]; cursor: RedditCursor; complete: boolean } | undefined> {
  const backfilling = !cursor || !cursor.backfillDone;
  const backfillStartUtc = cursor ? cursor.backfillStartUtc : addMonthsUtc(nowUtc, -STORE_REDDIT_BACKFILL_MONTHS);
  const coveredBefore = !cursor ? backfillStartUtc : cursor.backfillDone ? cursor.checkedUntilUtc : cursor.backfillNextUtc;

  const cursorAt = (coveredUntil: number, complete: boolean): RedditCursor =>
    backfilling
      ? { backfillStartUtc, backfillNextUtc: coveredUntil, backfillDone: complete, checkedUntilUtc: coveredUntil }
      : { backfillStartUtc, backfillNextUtc: cursor!.backfillNextUtc, backfillDone: true, checkedUntilUtc: coveredUntil };

  if (!entry.redditTerms.length) {
    const coveredUntil = Math.max(coveredBefore, nowUtc);
    return { mentions: [], cursor: cursorAt(coveredUntil, true), complete: true };
  }

  const windows = planRedditWindows(cursor, nowUtc);
  const planStart = windows.length ? windows[0]!.afterUtc : nowUtc;
  const doneUntil: Record<RedditWindow["kind"], number> = { post: planStart, comment: planStart };
  const run: FetchRun = { entry, budget, calls: 0, byId: new Map() };
  const queries = SUBREDDITS.flatMap((sub) => entry.redditTerms.map((term) => ({ sub, term })));

  let complete = true;
  windows: for (const window of windows) {
    for (let i = 0; i < queries.length; i++) {
      const { sub, term } = queries[i]!;
      const result = await fetchRange(run, window.kind, sub, term, window.afterUtc, window.beforeUtc);
      if (result.ok === false) {
        // Queries after this one never ran, so the window is only as complete as its start — unless
        // this was its last query, whose own partial progress then counts.
        doneUntil[window.kind] = i === queries.length - 1 ? result.coveredUntil : window.afterUtc;
        complete = false;
        break windows;
      }
    }
    doneUntil[window.kind] = window.beforeUtc;
  }

  const coveredUntil = Math.max(coveredBefore, complete ? nowUtc : Math.min(doneUntil.post, doneUntil.comment));
  if (!complete && coveredUntil <= coveredBefore) return undefined;

  const mentions = [...run.byId.values()].filter((mention) => complete || mention.createdUtc < coveredUntil);
  return { mentions, cursor: cursorAt(coveredUntil, complete), complete };
}
