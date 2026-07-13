// Minimal, polite Reddit API client for the backend sync jobs.
//
// Ported from app/server/utils/reddit.ts, which is the version proven against the real corpus
// (1 513 threads / 7 862 comments harvested for the bank tier list). Two differences only:
// credentials come from process.env instead of Nuxt's useRuntimeConfig(), and the HTTP calls go
// through the global fetch instead of ofetch's $fetch — the backend has no Nuxt around it.
//
// Auth: the app-only "installed_client" grant — no user account, no password, just the script
// credentials (REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET). The token is cached in module scope
// until shortly before it expires.
//
// Politeness: Reddit's OAuth limit is 100 requests/minute per client. We stay far below it with a
// serialized queue + a fixed gap between calls, honour `retry-after` on 429, and send a
// descriptive User-Agent (Reddit blocks generic ones).
//
// Null-safety is a design rule, not an accident: every exported function returns [] on failure.
// A Reddit outage must degrade the nightly job to "no new opinions today", never throw into it.
// With no credentials configured, every call here is a silent no-op.

import dotenv from "dotenv";

dotenv.config();

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const API = "https://oauth.reddit.com";

/** Minimum gap between two Reddit calls (ms) — ~50 req/min, half the allowance. */
export const MIN_GAP_MS = 1200;

/** Backoff base for a 429/5xx: 2 s, then 4 s. A `retry-after` header wins over this. */
const RETRY_BASE_MS = 2000;
const MAX_ATTEMPTS = 3;

export interface RedditPostRaw {
  id: string;
  sub: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  numComments: number;
  permalink: string;
  createdUtc: number;
  url: string;
}

export interface RedditCommentRaw {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  permalink: string;
}

interface RedditConfig {
  clientId?: string;
  clientSecret?: string;
  userAgent?: string;
}

/** Read lazily, never at import: the sync jobs load .env after this module is first required. */
function config(): RedditConfig {
  return {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    userAgent: process.env.REDDIT_USER_AGENT,
  };
}

const userAgentOf = (c: RedditConfig) => c.userAgent || "nodejs:cambio-uruguay:v1.0 (by /u/cambio_uruguay)";

/** True when the app has Reddit credentials — the whole feature is gated on this. */
export function redditConfigured(): boolean {
  const c = config();
  return Boolean(c.clientId && c.clientSecret);
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let lastCallAt = 0;
let queue: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Drop the token cache and the throttle clock. Test-only. */
export function __resetRedditForTests(): void {
  cachedToken = null;
  lastCallAt = 0;
  queue = Promise.resolve();
}

/** Serialize + space out calls so we never trip Reddit's rate limiter. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return fn();
  });
  // Keep the chain alive even when one call rejects.
  queue = run.catch(() => undefined);
  return run as Promise<T>;
}

async function accessToken(): Promise<string | null> {
  const c = config();
  if (!c.clientId || !c.clientSecret) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  try {
    const basic = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64");
    const res = await throttled(() =>
      fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": userAgentOf(c),
        },
        body: new URLSearchParams({
          grant_type: "https://oauth.reddit.com/grants/installed_client",
          device_id: "DO_NOT_TRACK_THIS_DEVICE",
        }).toString(),
        signal: AbortSignal.timeout(15_000),
      })
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json?.access_token) return null;
    cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return cachedToken.value;
  } catch {
    cachedToken = null;
    return null;
  }
}

/** Seconds Reddit asks us to wait, when it bothers to say. */
function retryAfterMs(res: Response, attempt: number): number {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 60_000);
  return RETRY_BASE_MS * (attempt + 1);
}

async function api<T>(path: string, query: Record<string, string | number | boolean>): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const token = await accessToken();
    if (!token) return null;
    const c = config();

    const url = new URL(`${API}${path}`);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

    try {
      const res = await throttled(() =>
        fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": userAgentOf(c),
          },
          signal: AbortSignal.timeout(25_000),
        })
      );

      if (res.status === 401) {
        cachedToken = null; // the token died early — one retry with a fresh one
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_ATTEMPTS - 1) await sleep(retryAfterMs(res, attempt));
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      // Network error / timeout: one more try, then give up quietly.
      if (attempt < MAX_ATTEMPTS - 1) await sleep(RETRY_BASE_MS * (attempt + 1));
    }
  }
  return null;
}

interface Listing<T> {
  data?: { children?: Array<{ kind: string; data: T }>; after?: string | null };
}

interface RawPost {
  id: string;
  subreddit: string;
  title: string;
  selftext?: string;
  author?: string;
  score?: number;
  num_comments?: number;
  permalink: string;
  created_utc: number;
  url?: string;
}

interface RawComment {
  id: string;
  author?: string;
  body?: string;
  score?: number;
  created_utc: number;
  permalink?: string;
  replies?: Listing<RawComment> | "";
}

function toPost(d: RawPost): RedditPostRaw {
  return {
    id: d.id,
    sub: d.subreddit,
    title: d.title ?? "",
    selftext: (d.selftext ?? "").slice(0, 4000),
    author: d.author ?? "",
    score: d.score ?? 0,
    numComments: d.num_comments ?? 0,
    permalink: `https://reddit.com${d.permalink}`,
    createdUtc: d.created_utc,
    url: d.url ?? "",
  };
}

/** Reddit caps a search listing at 100; more than that needs the `after` cursor. */
const SEARCH_PAGE = 100;
/** Safety stop for pagination — 10 pages × 100 = 1000 threads per (query × sub). */
const MAX_SEARCH_PAGES = 10;

export interface SearchOptions {
  t?: "day" | "week" | "month" | "year" | "all";
  sort?: "new" | "relevance" | "top";
  maxPages?: number;
}

/**
 * Search one subreddit, following the `after` cursor to the end of the results.
 *
 * A single listing tops out at 100 items, so the un-paginated version silently capped every query
 * at its first page and we simply never saw the rest of the threads. `t` bounds the age of the
 * results ('all' for the first harvest, 'year' for the incremental daily pass).
 */
export async function searchPosts(sub: string, query: string, opts: SearchOptions = {}): Promise<RedditPostRaw[]> {
  if (!redditConfigured()) return [];

  const out: RedditPostRaw[] = [];
  const maxPages = opts.maxPages ?? MAX_SEARCH_PAGES;
  let after: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const q: Record<string, string | number | boolean> = {
      q: query,
      restrict_sr: 1,
      limit: SEARCH_PAGE,
      t: opts.t ?? "all",
      sort: opts.sort ?? "new",
    };
    if (after) q.after = after;

    const res = await api<Listing<RawPost>>(`/r/${sub}/search`, q);
    const children = res?.data?.children ?? [];
    out.push(...children.filter((c) => c.kind === "t3").map((c) => toPost(c.data)));

    after = res?.data?.after ?? undefined;
    if (!after || children.length === 0) break;
  }
  return out;
}

/** Hard stop per thread, so one 10k-comment megathread can't blow up a run. */
const MAX_COMMENTS_PER_POST = 2000;
/** `/api/morechildren` accepts at most 100 ids per call. */
const MORE_BATCH = 100;
/** Safety stop for the expansion loop. */
const MAX_MORE_ROUNDS = 40;

/** Walk a comment listing, collecting real comments and the ids of collapsed "more" stubs. */
function walkComments(listing: Listing<RawComment> | "" | undefined, out: RedditCommentRaw[], moreIds: string[]): void {
  if (!listing || typeof listing !== "object") return;
  for (const child of listing.data?.children ?? []) {
    if (child.kind === "more") {
      // "load more comments" / "continue this thread" — the ids of everything Reddit collapsed.
      const d = child.data as unknown as { children?: string[] };
      if (Array.isArray(d.children)) moreIds.push(...d.children);
      continue;
    }
    if (child.kind !== "t1") continue;
    const d = child.data;
    const body = d.body ?? "";
    if (body && body !== "[deleted]" && body !== "[removed]") {
      out.push({
        id: d.id,
        author: d.author ?? "",
        body: body.slice(0, 2000),
        score: d.score ?? 0,
        createdUtc: d.created_utc,
        permalink: d.permalink ? `https://reddit.com${d.permalink}` : "",
      });
    }
    walkComments(d.replies, out, moreIds);
  }
}

interface MoreChildrenResponse {
  json?: { data?: { things?: Array<{ kind: string; data: RawComment & { children?: string[] } }> } };
}

/**
 * EVERY comment of a thread — replies, nested replies, and the ones Reddit hides behind
 * "load more comments" / "continue this thread".
 *
 * The naive version (`limit=80, depth=4`) quietly returns only the top of each thread: Reddit
 * replaces everything past the limit/depth with `kind: "more"` stubs, so long threads — exactly
 * the ones where the argument actually happens — were truncated without a word. Here we take the
 * full tree, then drain those stubs through `/api/morechildren` until none are left.
 *
 * `known` = the comment ids already stored. They are pre-seeded into the "seen" set, so a
 * collapsed branch we already have is never requested again: re-reading a thread that gained one
 * reply costs one request, not a full re-download.
 */
export async function fetchComments(
  sub: string,
  postId: string,
  known: ReadonlySet<string> = new Set()
): Promise<RedditCommentRaw[]> {
  if (!redditConfigured()) return [];

  const res = await api<[Listing<RawPost>, Listing<RawComment>]>(`/r/${sub}/comments/${postId}`, {
    limit: 500,
    depth: 50,
    sort: "top",
  });
  if (!Array.isArray(res) || res.length < 2) return [];

  const out: RedditCommentRaw[] = [];
  const seen = new Set<string>(known);
  const pending: string[] = [];
  walkComments(res[1], out, pending);
  for (const c of out) seen.add(c.id);

  for (let round = 0; round < MAX_MORE_ROUNDS; round++) {
    // Never ask Reddit for a comment we already have.
    const batch = pending.splice(0, MORE_BATCH).filter((id) => !seen.has(id));
    if (!batch.length) {
      if (!pending.length) break;
      continue;
    }
    if (out.length >= MAX_COMMENTS_PER_POST) break;

    const token = await accessToken();
    if (!token) break;
    const c = config();

    let more: MoreChildrenResponse | null = null;
    try {
      const url = new URL(`${API}/api/morechildren`);
      url.searchParams.set("api_type", "json");
      url.searchParams.set("link_id", `t3_${postId}`);
      url.searchParams.set("children", batch.join(","));
      url.searchParams.set("sort", "top");
      url.searchParams.set("limit_children", "false");

      const r = await throttled(() =>
        fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}`, "User-Agent": userAgentOf(c) },
          signal: AbortSignal.timeout(25_000),
        })
      );
      if (!r.ok) break;
      more = (await r.json()) as MoreChildrenResponse;
    } catch {
      break; // a failed expansion costs us the tail of one thread, not the run
    }

    for (const thing of more?.json?.data?.things ?? []) {
      if (thing.kind === "more") {
        if (Array.isArray(thing.data.children)) pending.push(...thing.data.children);
        continue;
      }
      if (thing.kind !== "t1") continue;
      const d = thing.data;
      const body = d.body ?? "";
      if (!body || body === "[deleted]" || body === "[removed]" || seen.has(d.id)) continue;
      seen.add(d.id);
      out.push({
        id: d.id,
        author: d.author ?? "",
        body: body.slice(0, 2000),
        score: d.score ?? 0,
        createdUtc: d.created_utc,
        permalink: d.permalink ? `https://reddit.com${d.permalink}` : "",
      });
    }
  }

  return out.slice(0, MAX_COMMENTS_PER_POST);
}
