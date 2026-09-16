// Shared HTTP plumbing for the two store signals (site.ts, signals/age.ts). Every request here is
// a single best-effort GET against a page we do not control (a store's own homepage, crt.sh, the
// Wayback Machine), so the ONLY job of this module is: fetch, and if the network itself fails,
// return `undefined` instead of throwing — the convention every signal in classes/stores/signals/
// follows (undefined = "could not be queried, keep the previous value"; a proper HTTP answer, even
// a 403 or a 5xx, is NOT a network failure and is handed back untouched so the caller can look at
// its body — a Cloudflare challenge page is exactly a >=400 response with a very recognizable body).
//
// Identification follows the same policy as the rentals harvester's El País adapter
// (classes/rentals/sources/elpais.ts): a browser User-Agent so ordinary storefronts and Cloudflare
// don't out of hand refuse a bot UA, PLUS a dedicated `x-cambio-uruguay-bot` header that always
// carries our identity so a store operator can allowlist or block us from their own logs without us
// having to lie about what we are in the UA string itself.
const DEFAULT_TIMEOUT_MS = Number(process.env.STORES_HTTP_TIMEOUT_MS || 20_000);

const BROWSER_UA =
  process.env.STORES_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const BOT_HEADER = "store-profiles";

export interface HttpTextOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface HttpTextResult {
  status: number;
  /** The final URL after redirects (`redirect: "follow"`); falls back to the requested URL. */
  url: string;
  body: string;
}

/**
 * One GET, text body. Returns `undefined` only when the network itself failed (DNS, TCP, TLS,
 * timeout) — never when the server answered, however rude that answer was.
 */
export async function httpText(url: string, opts: HttpTextOptions = {}): Promise<HttpTextResult | undefined> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "user-agent": BROWSER_UA,
        "x-cambio-uruguay-bot": BOT_HEADER,
        accept: "text/html,application/json,application/xhtml+xml,*/*;q=0.8",
        ...opts.headers,
      },
    });
    const body = await response.text();
    return { status: response.status, url: response.url || url, body };
  } catch {
    return undefined;
  }
}
