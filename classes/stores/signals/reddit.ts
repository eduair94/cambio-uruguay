// Signal for /tiendas-online-uruguay: how often a store is actually mentioned on r/uruguay and
// r/montevideo, read from Arctic Shift (arctic-shift.photon-reddit.com) — a public Reddit archive
// that keeps what got deleted later, the same source classes/charruadevs/harvest.ts already reads.
//
// **Reddit sin personas, por diseño:** `RedditMention` never carries a Reddit username, and the
// only thing this feature is allowed to publish (`RedditSignal`) is counts, thread titles and
// links — never an author, never a quoted comment body. `RedditMention.text` exists ONLY so
// Task 7's Gemini classifier can read the raw title/body once in memory; it is never copied into
// `RedditSignal`, so it never reaches a persisted document.
//
// Why re-filter locally after an already-scoped API query: Arctic Shift's own `query=`/`body=`
// search is a loose keyword match, and several store names are common Spanish words ("Divino",
// "Ta-Ta", "El Dorado"...) that need the registry's `redditMatch` disambiguator re-checked against
// the ACTUAL normalized title+text before a hit counts — the same guard classes/stores/registry.ts
// documents and tests/stores/registry.test.ts already exercises for those regexes.
//
// Rhythm: Arctic Shift really does rate-limit under load — `{"error":"Timeout. Maybe slow down a
// bit"}`, sometimes wrapped in an HTTP 200, not just a 429/5xx. Every request here is paced apart,
// and a 429/5xx/timeout-flavoured error waits and retries a few times; past that this returns
// `undefined` so the caller keeps the previous signal instead of publishing a run that only saw
// part of Reddit. The delays are env knobs (not bare constants) purely so tests don't wait tens of
// real seconds — the same pattern classes/stores/signals/age.ts (`STORES_AGE_RETRY_MS`) uses.
import type { StoreEntry } from "../types";
import { storeNorm } from "../registry";

export interface RedditMention {
  id: string;
  kind: "post" | "comment";
  createdUtc: number;
  threadId: string;
  title: string | null;
  permalink: string;
  score: number;
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
  checkedAt: string;
}

const BASE = "https://arctic-shift.photon-reddit.com/api";
const UA = "cambio-uruguay/1.0 (+https://cambio-uruguay.com/tiendas-online-uruguay)";
const SUBREDDITS = ["uruguay", "montevideo"] as const;

// 1 initial attempt + up to 3 retries, per the brief ("reintentar hasta 3 veces").
const MAX_ATTEMPTS = 4;
const RATE_GAP_MS = Number(process.env.STORES_REDDIT_GAP_MS || 4_000);
const RETRY_DELAY_MS = Number(process.env.STORES_REDDIT_RETRY_MS || 20_000);

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
 * Folds raw mentions into the publishable signal: dedupes by `id` (Arctic Shift's posts and
 * comments searches can both surface the same object across overlapping term queries), counts by
 * the UTC year of `createdUtc`, and picks up to 5 post threads (never a comment — a comment has no
 * title, only its parent thread does) ordered by score desc then recency desc. `now` is accepted
 * for signature parity with other store-signal aggregations (see app/utils/redditSentiment.ts's
 * `aggregateEntitySentiment`); nothing here decays with time — `tone` (Task 7) is what will.
 */
export function summarizeMentions(mentions: RedditMention[], checkedAt: string, now: Date = new Date()): RedditSignal {
  void now;

  const byId = new Map<string, RedditMention>();
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
    .filter((mention): mention is RedditMention & { kind: "post" } => mention.kind === "post")
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
    checkedAt,
  };
}

/** Arctic Shift posts/search row → RedditMention, or null when a required field is missing/wrong-typed. */
function toPostMention(raw: unknown): RedditMention | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = typeof row.id === "string" ? row.id : null;
  const createdUtc = typeof row.created_utc === "number" ? row.created_utc : null;
  const permalink = typeof row.permalink === "string" ? row.permalink : null;
  if (!id || createdUtc === null || !permalink) return null;

  const title = typeof row.title === "string" ? row.title : "";
  const selftext = typeof row.selftext === "string" ? row.selftext : "";
  const score = typeof row.score === "number" ? row.score : 0;

  // `row.author` is deliberately never read: RedditMention has no field for it (see module header).
  return {
    id,
    kind: "post",
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

  // `row.author` is deliberately never read: RedditMention has no field for it (see module header).
  return {
    id,
    kind: "comment",
    createdUtc,
    threadId,
    title: null,
    permalink: `/r/${sub}/comments/${threadId}/`,
    score,
    text: body,
  };
}

/**
 * One Arctic Shift search URL, with retry/backoff. Returns the raw `data` array on success;
 * `undefined` only once every attempt is exhausted (network failure, a 429/5xx, or a 200 whose body
 * is Arctic Shift's own `{"error":"Timeout. Maybe slow down a bit"}` overload signal) — a genuine
 * non-retryable HTTP error (anything else non-ok) fails immediately without burning retries.
 */
async function fetchJson(url: string): Promise<unknown[] | undefined> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response | undefined;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch {
      res = undefined;
    }

    if (!res) {
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
      continue;
    }
    if (!res.ok) return undefined;

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
      continue;
    }

    const body = (json ?? {}) as { data?: unknown; error?: unknown };
    if (typeof body.error === "string" && /timeout|slow down/i.test(body.error)) {
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
      continue;
    }
    return Array.isArray(body.data) ? body.data : [];
  }
  return undefined;
}

/**
 * Raw mentions for one store across r/uruguay and r/montevideo, going back to `sinceUtc` (a Unix
 * timestamp in seconds — the caller decides the window, 3 years per the brief). Stores with no
 * `redditTerms` are simply never queried here (an empty array, no network call at all); it is the
 * CALLER's job (Task 6's sync job) to turn that into a `null` signal rather than an empty-but-fresh
 * one, the same split classes/stores/signals/age.ts and google.ts leave to their callers for the
 * `kind === "tienda-uy"` filter.
 *
 * `undefined` only when Arctic Shift itself could not be reached/answered after retries for at
 * least one of the term/subreddit/kind combinations queried — the caller then keeps the previous
 * signal rather than publish a run that silently missed part of Reddit.
 */
export async function fetchRedditMentions(entry: StoreEntry, sinceUtc: number): Promise<RedditMention[] | undefined> {
  if (!entry.redditTerms.length) return [];

  const afterDate = new Date(sinceUtc * 1000).toISOString().slice(0, 10);
  const byId = new Map<string, RedditMention>();
  let calls = 0;

  for (const sub of SUBREDDITS) {
    for (const term of entry.redditTerms) {
      const encodedTerm = encodeURIComponent(term);

      if (calls > 0) await sleep(RATE_GAP_MS);
      calls++;
      const posts = await fetchJson(`${BASE}/posts/search?subreddit=${sub}&query=${encodedTerm}&after=${afterDate}&limit=100`);
      if (posts === undefined) return undefined;
      for (const raw of posts) {
        const mention = toPostMention(raw);
        if (mention && mentionMatches(entry, mention.text)) byId.set(mention.id, mention);
      }

      await sleep(RATE_GAP_MS);
      calls++;
      const comments = await fetchJson(
        `${BASE}/comments/search?subreddit=${sub}&body=${encodedTerm}&after=${afterDate}&limit=100&fields=id,link_id,created_utc,score,body`
      );
      if (comments === undefined) return undefined;
      for (const raw of comments) {
        const mention = toCommentMention(raw, sub);
        if (mention && mentionMatches(entry, mention.text)) byId.set(mention.id, mention);
      }
    }
  }

  return [...byId.values()];
}
