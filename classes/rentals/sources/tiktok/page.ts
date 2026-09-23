// One TikTok video over plain HTTP: the page embeds the same itemStruct the list API serves.
//
// Measured 2026-09-23 from the VPS: `GET /@user/video/<id>` with a browser UA answers 200, 450 KB,
// with `__UNIVERSAL_DATA_FOR_REHYDRATION__` → `webapp.video-detail.itemInfo.itemStruct` — no
// proxy, no browser, no signing. The profile page is behind a WAF challenge and the tag page lists
// nothing without a browser; those live in browser.ts. This is the path for the videos a person
// hands us (`RENTALS_TIKTOK_VIDEOS`, `vt.tiktok.com/…` short links included).
//
// robots.txt: `/@user/video/<id>` is not disallowed for `User-agent: *`; `/search?` is, and is
// never requested from anywhere in this source.
import { fetchText } from "../../net";
import { postFromItemStruct, type TiktokPost } from "./post";

/**
 * A browser UA because the WAF answers the honest one with an interstitial, plus the header that
 * signs the request as ours (the same convention as El País, see `net.ts`/`elpais.ts`).
 */
export const TIKTOK_HEADERS: Record<string, string> = {
  "user-agent": process.env.RENTALS_TIKTOK_USER_AGENT
    || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "accept-language": "es-UY,es;q=0.9",
  "x-cambio-uruguay-bot": "CambioUruguayBot/1.0",
};

const VIDEO = /^https:\/\/www\.tiktok\.com\/@([\w.-]{1,80})\/video\/(\d{6,25})(?:[/?#]|$)/;
const SHORT = /^https:\/\/(?:vt|vm|www)\.tiktok\.com\/(?:t\/)?[\w-]{5,20}\/?(?:[?#]|$)/;

/** The canonical video URL, or null for anything that is not one (a search, a profile, a short link). */
export function canonicalVideoUrl(url: string): string | null {
  const match = VIDEO.exec(String(url || "").trim());
  return match ? `https://www.tiktok.com/@${match[1]}/video/${match[2]}` : null;
}

/** A `vt.tiktok.com/…` short link → its canonical video URL, by reading ONE redirect; never follows it further. */
export async function resolveTiktokUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const direct = canonicalVideoUrl(url);
  if (direct) return direct;
  const short = String(url || "").trim();
  if (!SHORT.test(short)) return null;
  try {
    const response = await fetchImpl(short, { method: "HEAD", redirect: "manual", headers: TIKTOK_HEADERS, signal: AbortSignal.timeout(15_000) });
    return canonicalVideoUrl(response.headers.get("location") || "");
  } catch {
    return null;
  }
}

const EMBEDDED = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/;

export function postFromVideoHtml(html: string): TiktokPost | null {
  const match = EMBEDDED.exec(String(html || ""));
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]!) as { __DEFAULT_SCOPE__?: { "webapp.video-detail"?: { itemInfo?: { itemStruct?: unknown } } } };
    const scope = data.__DEFAULT_SCOPE__;
    const detail = scope ? scope["webapp.video-detail"] : undefined;
    return postFromItemStruct(detail && detail.itemInfo ? detail.itemInfo.itemStruct : null);
  } catch {
    return null;
  }
}

export async function readVideoPage(url: string, fetchTextImpl: typeof fetchText = fetchText): Promise<TiktokPost | null> {
  const canonical = canonicalVideoUrl(url);
  if (!canonical) return null;
  const html = await fetchTextImpl(canonical, { headers: TIKTOK_HEADERS, timeoutMs: 30_000, retries: 1 });
  return html ? postFromVideoHtml(html) : null;
}
