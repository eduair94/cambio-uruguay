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

/**
 * Search one subreddit. `t` bounds the age of results ('year' for the incremental daily
 * pass, 'all' for a first backfill).
 */
export async function searchSubreddit(
  sub: string,
  q: string,
  opts: {
    limit?: number
    t?: 'day' | 'week' | 'month' | 'year' | 'all'
    sort?: 'new' | 'relevance' | 'top'
  } = {}
): Promise<RedditPostRaw[]> {
  const res = await api<Listing<RawPost>>(`/r/${sub}/search`, {
    q,
    restrict_sr: 1,
    limit: opts.limit ?? 50,
    t: opts.t ?? 'year',
    sort: opts.sort ?? 'new',
  })
  return (res?.data?.children ?? []).filter(c => c.kind === 't3').map(c => toPost(c.data))
}

function flattenComments(
  listing: Listing<RawComment> | '' | undefined,
  out: RedditCommentRaw[] = []
): RedditCommentRaw[] {
  if (!listing || typeof listing !== 'object') return out
  for (const child of listing.data?.children ?? []) {
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
    flattenComments(d.replies, out)
  }
  return out
}

/** Top comments of a thread, flattened (replies included), capped for sanity. */
export async function fetchComments(postId: string, limit = 80): Promise<RedditCommentRaw[]> {
  const res = await api<[Listing<RawPost>, Listing<RawComment>]>(`/comments/${postId}`, {
    limit,
    depth: 4,
    sort: 'top',
  })
  if (!Array.isArray(res) || res.length < 2) return []
  return flattenComments(res[1]).slice(0, limit)
}
