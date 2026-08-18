// Download a cited source and reduce it to text we can check figures against.
//
// The difference between this and "the model says it read the page" is the whole safety argument
// for publishing without a human. A URL that answers 200 proves the page exists; the TEXT of that
// page is what proves the number in our paragraph came from somewhere real.
//
// Deliberately dumb about extraction: strip tags, keep everything. A cleverer reader that tried to
// find "the main content" would be one more thing that can silently drop the paragraph containing
// the figure, and a false "this number is not in the source" is just as bad as a false positive —
// it would block good pages forever with no way to tell why.

import axios from "axios";
import * as cheerio from "cheerio";

const TIMEOUT_MS = 20000;
/** Government PDFs and law texts get long; past this the figure is not going to be in the tail. */
const MAX_CHARS = 400000;
const USER_AGENT = "Mozilla/5.0 (compatible; CambioUruguayResearch/1.0; +https://cambio-uruguay.com)";

export interface FetchedSource {
  url: string;
  ok: boolean;
  status: number;
  /** Visible text, whitespace-collapsed. Empty when the fetch failed. */
  text: string;
}

/**
 * Fetch one source. Never throws.
 *
 * A GET rather than a HEAD because several Uruguayan government sites answer 405 to HEAD while
 * serving the page fine — and because the body is the point.
 */
export async function fetchSource(url: string): Promise<FetchedSource> {
  const dead: FetchedSource = { url, ok: false, status: 0, text: "" };
  if (!/^https?:\/\//i.test(url)) return dead;

  try {
    const res = await axios.get<string>(url, {
      timeout: TIMEOUT_MS,
      signal: AbortSignal.timeout(TIMEOUT_MS + 3000),
      responseType: "text",
      maxRedirects: 4,
      validateStatus: () => true,
      transformResponse: (d) => d,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,*/*" },
    });
    if (res.status !== 200 || typeof res.data !== "string") return { ...dead, status: res.status };

    const contentType = String(res.headers["content-type"] || "").toLowerCase();
    // A PDF arrives as bytes we cannot read as text here. It is not a failed fetch — the page
    // exists — but it cannot back a figure, so it is verified-without-evidence.
    if (contentType.includes("application/pdf")) return { url, ok: true, status: 200, text: "" };

    const text = contentType.includes("html") ? htmlToText(res.data) : res.data;
    return { url, ok: true, status: 200, text: text.slice(0, MAX_CHARS) };
  } catch {
    return dead;
  }
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg").remove();
  return $("body")
    .text()
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fetch several sources at once. Independent requests, so they go in parallel. */
export async function fetchSources(urls: readonly string[]): Promise<FetchedSource[]> {
  return Promise.all(urls.map(fetchSource));
}
