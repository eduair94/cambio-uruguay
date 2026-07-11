// Minimal, polite Reddit API client (server-only).
//
// Auth: the app-only "installed_client" grant — no user account, no password, just the
// script credentials (REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET). The token is cached in
// module scope until shortly before it expires.
//
// Politeness: Reddit's OAuth limit is 100 requests/minute per client. We stay far below
// it with a serialized queue + a fixed gap between calls, honour `retry-after` on 429,
// and set a descriptive User-Agent (Reddit blocks generic ones). Every call is
// null-safe: an outage degrades the daily task, it never throws into a page render.
//
// Configuration lives in runtimeConfig.reddit; with no credentials every function here
// returns empty, and `reddit:sentiment` no-ops (the page then serves the last snapshot
// stored in MongoDB).

const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token'
const API = 'https://oauth.reddit.com'

/** Minimum gap between two Reddit calls (ms) — ~50 req/min, half the allowance. */
const MIN_GAP_MS = 1200

export interface RedditPostRaw {
  id: string
  sub: string
  title: string
  selftext: string
  author: string
  score: number
  numComments: number
  permalink: string
  createdUtc: number
  url: string
}

export interface RedditCommentRaw {
  id: string
  author: string
  body: string
  score: number
  createdUtc: number
  permalink: string
}

interface RedditConfig {
  clientId?: string
  clientSecret?: string
  userAgent?: string
}

function config(): RedditConfig {
  return (useRuntimeConfig().reddit ?? {}) as RedditConfig
}

/** True when the app has Reddit credentials — the whole feature is gated on this. */
export function redditConfigured(): boolean {
  const c = config()
  return Boolean(c.clientId && c.clientSecret)
}

let cachedToken: { value: string; expiresAt: number } | null = null
let lastCallAt = 0

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Serialize + space out calls so we never trip Reddit's rate limiter. */
let queue: Promise<unknown> = Promise.resolve()
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCallAt)
    if (wait > 0) await sleep(wait)
    lastCallAt = Date.now()
    return fn()
  })
  // Keep the chain alive even when one call rejects.
  queue = run.catch(() => undefined)
  return run as Promise<T>
}

async function accessToken(): Promise<string | null> {
  const { clientId, clientSecret, userAgent } = config()
  if (!clientId || !clientSecret) return null
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await $fetch<{ access_token?: string; expires_in?: number }>(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent || 'nodejs:cambio-uruguay:v1.0',
      },
      body: new URLSearchParams({
        grant_type: 'https://oauth.reddit.com/grants/installed_client',
        device_id: 'DO_NOT_TRACK_THIS_DEVICE',
      }).toString(),
      timeout: 15000,
    })
    if (!res?.access_token) return null
    cachedToken = {
      value: res.access_token,
      expiresAt: Date.now() + (res.expires_in ?? 3600) * 1000,
    }
    return cachedToken.value
  } catch {
    cachedToken = null
    return null
  }
}

async function api<T>(path: string, query: Record<string, string | number>): Promise<T | null> {
  const token = await accessToken()
  if (!token) return null
  const { userAgent } = config()

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await throttled(() =>
        $fetch<T>(`${API}${path}`, {
          query,
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': userAgent || 'nodejs:cambio-uruguay:v1.0',
          },
          timeout: 20000,
        })
      )
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        cachedToken = null // token died early — one retry with a fresh one
        continue
      }
      if (status === 429 || (status && status >= 500)) {
        await sleep(2000 * (attempt + 1))
        continue
      }
      return null
    }
  }
  return null
}

interface Listing<T> {
  data?: { children?: Array<{ kind: string; data: T }> }
}

interface RawPost {
  id: string
  subreddit: string
  title: string
  selftext?: string
  author?: string
  score?: number
  num_comments?: number
  permalink: string
  created_utc: number
  url?: string
}

interface RawComment {
  id: string
  author?: string
  body?: string
  score?: number
  created_utc: number
  permalink?: string
  replies?: Listing<RawComment> | ''
}

function toPost(d: RawPost): RedditPostRaw {
  return {
    id: d.id,
    sub: d.subreddit,
    title: d.title ?? '',
    selftext: (d.selftext ?? '').slice(0, 4000),
    author: d.author ?? '',
    score: d.score ?? 0,
    numComments: d.num_comments ?? 0,
    permalink: `https://reddit.com${d.permalink}`,
    createdUtc: d.created_utc,
    url: d.url ?? '',
  }
}

/** Reddit caps a search listing at 100; more than that needs the `after` cursor. */
const SEARCH_PAGE = 100
/** Safety stop for pagination — 10 pages × 100 = 1000 threads per (query × sub). */
const MAX_SEARCH_PAGES = 10

/**
 * Search one subreddit, following the `after` cursor to the end of the results.
 *
 * A single listing tops out at 100 items, so the un-paginated version silently capped every
 * query at its first page and we simply never saw the rest of the threads.
 * `t` bounds the age of results ('year' for the incremental daily pass, 'all' for a backfill).
 */
export async function searchSubreddit(
  sub: string,
  q: string,
  opts: {
    t?: 'day' | 'week' | 'month' | 'year' | 'all'
    sort?: 'new' | 'relevance' | 'top'
    maxPages?: number
  } = {}
): Promise<RedditPostRaw[]> {
  const out: RedditPostRaw[] = []
  const maxPages = opts.maxPages ?? MAX_SEARCH_PAGES
  let after: string | undefined

  for (let page = 0; page < maxPages; page++) {
    const query: Record<string, string | number> = {
      q,
      restrict_sr: 1,
      limit: SEARCH_PAGE,
      t: opts.t ?? 'year',
      sort: opts.sort ?? 'new',
    }
    if (after) query.after = after

    const res = await api<Listing<RawPost>>(`/r/${sub}/search`, query)
    const children = res?.data?.children ?? []
    out.push(...children.filter(c => c.kind === 't3').map(c => toPost(c.data)))

    after = res?.data?.after ?? undefined
    if (!after || children.length === 0) break
  }
  return out
}

/** Hard stop per thread, so one 10k-comment megathread can't blow the 16MB Mongo doc limit. */
const MAX_COMMENTS_PER_POST = 2000
/** `/api/morechildren` accepts at most 100 ids per call. */
const MORE_BATCH = 100
/** Safety stop for the expansion loop. */
const MAX_MORE_ROUNDS = 40

/** Walk a comment listing, collecting real comments and the ids of collapsed "more" stubs. */
function walkComments(
  listing: Listing<RawComment> | '' | undefined,
  out: RedditCommentRaw[],
  moreIds: string[]
): void {
  if (!listing || typeof listing !== 'object') return
  for (const child of listing.data?.children ?? []) {
    if (child.kind === 'more') {
      // "load more comments" / "continue this thread" — the ids of everything Reddit collapsed.
      const d = child.data as unknown as { children?: string[] }
      if (Array.isArray(d.children)) moreIds.push(...d.children)
      continue
    }
    if (child.kind !== 't1') continue
    const d = child.data
    const body = d.body ?? ''
    if (body && body !== '[deleted]' && body !== '[removed]') {
      out.push({
        id: d.id,
        author: d.author ?? '',
        body: body.slice(0, 2000),
        score: d.score ?? 0,
        createdUtc: d.created_utc,
        permalink: d.permalink ? `https://reddit.com${d.permalink}` : '',
      })
    }
    walkComments(d.replies, out, moreIds)
  }
}

interface MoreChildrenResponse {
  json?: { data?: { things?: Array<{ kind: string; data: RawComment & { children?: string[] } }> } }
}

/**
 * EVERY comment of a thread — replies, nested replies, and the ones Reddit hides behind
 * "load more comments" / "continue this thread".
 *
 * The naive version (`limit=80, depth=4`) quietly returned only the top of each thread: Reddit
 * replaces everything past the limit/depth with `kind: "more"` stubs, so long threads — exactly
 * the ones where the argument actually happens — were being truncated without a word. Here we
 * take the full tree, then drain those stubs through `/api/morechildren` until none are left.
 *
 * `known` = the comment ids already in MongoDB. They are pre-seeded into the "seen" set, so a
 * collapsed branch we have already stored is never requested again: re-reading a thread that
 * gained one reply costs one request, not a full re-download of the thread.
 */
export async function fetchComments(
  postId: string,
  known: ReadonlySet<string> = new Set()
): Promise<RedditCommentRaw[]> {
  const res = await api<[Listing<RawPost>, Listing<RawComment>]>(`/comments/${postId}`, {
    limit: 500,
    depth: 50,
    sort: 'top',
  })
  if (!Array.isArray(res) || res.length < 2) return []

  const out: RedditCommentRaw[] = []
  const seen = new Set<string>(known)
  const pending: string[] = []
  walkComments(res[1], out, pending)
  for (const c of out) seen.add(c.id)

  const { userAgent } = config()
  const token = await accessToken()

  for (let round = 0; round < MAX_MORE_ROUNDS; round++) {
    // Never ask Reddit for a comment we already have in Mongo.
    const batch = pending.splice(0, MORE_BATCH).filter(id => !seen.has(id))
    if (!batch.length) {
      if (!pending.length) break
      continue
    }
    if (out.length >= MAX_COMMENTS_PER_POST || !token) break

    let more: MoreChildrenResponse | null = null
    try {
      more = await throttled(() =>
        $fetch<MoreChildrenResponse>(`${API}/api/morechildren`, {
          query: {
            api_type: 'json',
            link_id: `t3_${postId}`,
            children: batch.join(','),
            sort: 'top',
            limit_children: false,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': userAgent || 'nodejs:cambio-uruguay:v1.0',
          },
          timeout: 25000,
        })
      )
    } catch {
      break // a failed expansion costs us the tail of one thread, not the run
    }

    for (const thing of more?.json?.data?.things ?? []) {
      if (thing.kind === 'more') {
        if (Array.isArray(thing.data.children)) pending.push(...thing.data.children)
        continue
      }
      if (thing.kind !== 't1') continue
      const d = thing.data
      const body = d.body ?? ''
      if (!body || body === '[deleted]' || body === '[removed]' || seen.has(d.id)) continue
      seen.add(d.id)
      out.push({
        id: d.id,
        author: d.author ?? '',
        body: body.slice(0, 2000),
        score: d.score ?? 0,
        createdUtc: d.created_utc,
        permalink: d.permalink ? `https://reddit.com${d.permalink}` : '',
      })
    }
  }

  return out.slice(0, MAX_COMMENTS_PER_POST)
}
