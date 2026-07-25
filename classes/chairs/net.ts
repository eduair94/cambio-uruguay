// Shared HTTP plumbing for the chair harvesters.
//
// Every source we read is somebody else's storefront, so the rules here are deliberately
// conservative: one in-flight request per host, a minimum gap between two hits on the same host,
// a hard timeout, and a small number of retries. A store that rate-limits us must never be able to
// stall the whole daily job, so a failed fetch resolves to null instead of throwing.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Minimum delay between two requests to the same host. */
const HOST_GAP_MS = Number(process.env.CHAIR_HOST_GAP_MS || 350);
const DEFAULT_TIMEOUT_MS = Number(process.env.CHAIR_HTTP_TIMEOUT_MS || 20_000);

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  /** Skip the per-host throttle (for our own bridges on the same box). */
  unthrottled?: boolean;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const lastHit = new Map<string, number>();
const hostChain = new Map<string, Promise<unknown>>();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Serialises calls per host and keeps at least {@link HOST_GAP_MS} between them. Callers still see
 * plain promises, so `mapLimit` can fan out across many hosts while any single host stays polite.
 */
async function throttled<T>(host: string, task: () => Promise<T>): Promise<T> {
  const previous = hostChain.get(host) ?? Promise.resolve();
  const run = previous.then(async () => {
    const gap = Date.now() - (lastHit.get(host) ?? 0);
    if (gap < HOST_GAP_MS) await sleep(HOST_GAP_MS - gap);
    try {
      return await task();
    } finally {
      lastHit.set(host, Date.now());
    }
  });
  // Keep the chain alive even when this link rejects, or every later call to the host rejects too.
  hostChain.set(
    host,
    run.catch(() => undefined)
  );
  return run;
}

async function rawFetch(url: string, options: FetchOptions): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": BROWSER_UA,
        "accept-language": "es-UY,es;q=0.9,en;q=0.8",
        ...options.headers,
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string | null> {
  const attempts = Math.max(1, (options.retries ?? 1) + 1);
  const run = async (): Promise<string | null> => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const response = await rawFetch(url, options);
      if (response?.ok) return response.text();
      // 4xx other than 429 will not get better by trying again.
      if (response && response.status < 500 && response.status !== 429) return null;
      if (attempt < attempts - 1) await sleep(600 * (attempt + 1));
    }
    return null;
  };
  return options.unthrottled ? run() : throttled(hostOf(url), run);
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T | null> {
  const text = await fetchText(url, {
    ...options,
    headers: { accept: "application/json", ...options.headers },
  });
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Runs `task` over `items` with at most `limit` promises in flight, preserving input order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await task(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Collects every `<loc>` in a sitemap, following one level of `<sitemapindex>` when present. */
export async function readSitemap(url: string, depth = 0, seen = new Set<string>()): Promise<string[]> {
  if (seen.has(url) || seen.size > 40) return [];
  seen.add(url);
  const xml = await fetchText(url, { retries: 1 });
  if (!xml) return [];
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1]!);
  if (!/<sitemapindex/i.test(xml) || depth >= 2) return locs;
  const nested: string[] = [];
  for (const child of locs) nested.push(...(await readSitemap(child, depth + 1, seen)));
  return nested;
}

/** Downloads an image for the vision fallback. Refuses anything too big to be worth base64-ing. */
export async function fetchImage(
  url: string,
  maxBytes: number
): Promise<{ data: Buffer; mimeType: string } | null> {
  const run = async (): Promise<{ data: Buffer; mimeType: string } | null> => {
    const response = await rawFetch(url, { timeoutMs: 20_000 });
    if (!response?.ok) return null;
    const mimeType = (response.headers.get("content-type") || "image/jpeg").split(";")[0]!.trim();
    if (!mimeType.startsWith("image/")) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > maxBytes) return null;
    return { data: buffer, mimeType };
  };
  return throttled(hostOf(url), run);
}
