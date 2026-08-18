// Fetch a page of the public site and reduce it to indexable text.
//
// The site is server-rendered, so the published HTML already contains everything a reader sees —
// no headless browser needed. What it also contains, on every single page, is the layout: the
// header, the drawer, the footer, the newsletter capture card, the ad slots and the "Seguí leyendo"
// recirculation block. Left in, that boilerplate is ~2 000 identical words per page; the index
// would then hold 430 copies of the footer, every one of them a plausible-looking match for any
// query that happens to mention a word the footer uses. Stripping it is not cosmetic — it is what
// makes a cosine score mean "this page is about that" instead of "this is a page of this site".

import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import type { CrawledPage, PageTier } from "./types";

/** Per-request ceiling. Bounded with the axios timeout AND a signal — see the note in fetchHtml. */
const REQUEST_TIMEOUT_MS = 20000;

/** Chrome-ish UA. A bare axios UA gets a different (cached, sometimes trimmed) response from Nitro. */
const USER_AGENT = "Mozilla/5.0 (compatible; CambioUruguayRagIndexer/1.0; +https://cambio-uruguay.com)";

/**
 * Everything that is layout rather than content. Removed before any text is read.
 *
 * `.related-pages` and `.nl-capture-form` are this site's own recirculation and newsletter blocks —
 * they live inside `<main>` on most pages, so the `<main>` selector alone does not exclude them.
 */
const CHROME_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "template",
  "nav",
  "header",
  "footer",
  "aside",
  ".v-navigation-drawer",
  ".v-app-bar",
  ".v-footer",
  ".cu-footer",
  ".related-pages",
  ".nl-capture-form",
  ".adsbygoogle",
  "[aria-hidden='true']",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
].join(",");

/** Blocks whose text is a heading. Kept as markers so the chunker can build a heading path. */
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4"]);

export const sha1 = (value: string): string => crypto.createHash("sha1").update(value).digest("hex");

/**
 * The absolute URL to request for a site-relative path.
 *
 * The sitemap endpoint hands back RAW paths, so a department page arrives as
 * `/sucursales/cambilex/RÍO NEGRO` — accent and space intact. Requesting that unencoded is a
 * malformed request, and it is why a batch of pages failed on the first index build while every
 * ASCII path beside them succeeded.
 *
 * Decode first, then encode. `encodeURI` alone is NOT idempotent — it escapes `%` too, so a path
 * that already arrived encoded would come back as `%2520` and 404. Sniffing for `%XX` and skipping
 * the encode instead fixes that case but breaks the mixed one, where a partly-encoded path still
 * has a raw space to escape. Normalising through a decode handles raw, encoded and mixed alike.
 *
 * `decodeURIComponent` rather than `decodeURI`, because `decodeURI` preserves the reserved
 * characters — it would leave an intentional `%23` as the literal text `%23` and the re-encode
 * would turn it into `%2523`. It throws on a malformed escape (a path with a bare `%`), which is
 * caught: the raw text is then the honest input, and `encodeURI` escapes the `%` correctly.
 *
 * `#` and `?` are escaped after encoding because `encodeURI` deliberately leaves both alone, and in
 * a path segment either one silently truncates the URL into a fragment or a query.
 */
export function pageUrl(baseUrl: string, path: string): string {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    /* malformed percent escape — encode the raw text as it stands */
  }
  const encoded = encodeURI(decoded).replace(/#/g, "%23").replace(/\?/g, "%3F");
  return `${baseUrl.replace(/\/+$/, "")}${encoded}`;
}

/**
 * GET one URL, or `null`.
 *
 * Both `timeout` and `signal` are set on purpose. axios's `timeout` covers the response, but a
 * connection that hangs before a socket exists never arms it — the failure mode this repo already
 * hit through a dead proxy. `AbortSignal.timeout` is the one that actually bounds the whole call.
 */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get<string>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS + 2000),
      responseType: "text",
      maxRedirects: 3,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      validateStatus: (s) => s === 200,
      transformResponse: (d) => d, // keep it a string; axios would try to JSON.parse an HTML body
    });
    return typeof res.data === "string" ? res.data : null;
  } catch {
    return null;
  }
}

/** Collapse runs of whitespace, and never let a NBSP masquerade as a normal space. */
const squash = (t: string): string => t.replace(/ /g, " ").replace(/\s+/g, " ").trim();

/**
 * Main-content text, with `\n## <heading>\n` markers left in.
 *
 * Cheerio's `.text()` on the container would concatenate adjacent block elements without a
 * separator ("…al courierEl Decreto 50/026…"), which corrupts both the embedding and any sentence
 * the composer might quote. Walking the block children and joining with newlines is the fix.
 */
function extractText($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>): string {
  const parts: string[] = [];

  container.find("h1,h2,h3,h4,p,li,td,th,dd,dt,blockquote,figcaption").each((_i, el) => {
    const tag = (el as any).tagName?.toLowerCase?.() ?? "";
    const text = squash($(el).text());
    if (!text) return;
    if (HEADING_TAGS.has(tag)) {
      // The `#` count encodes depth, which chunk.ts reads back to build the heading path.
      parts.push(`\n${"#".repeat(Number(tag.slice(1)))} ${text}\n`);
      return;
    }
    // A table cell or list item on its own line reads as a fragment; that is fine for retrieval and
    // it keeps the numbers attached to their labels, which is what the no-invented-number gate needs.
    parts.push(text);
  });

  return parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface CrawlOptions {
  baseUrl: string;
  tier: PageTier;
  lastmod: string;
  /** Injected in tests. */
  fetchImpl?: (url: string) => Promise<string | null>;
}

/** One page, crawled and reduced. `null` when the fetch failed or the page had no usable content. */
export async function crawlPage(path: string, opts: CrawlOptions): Promise<CrawledPage | null> {
  // `path` stays exactly as the sitemap gave it in everything we store — only the request is
  // encoded. Storing the encoded form would orphan every existing row and make pruneMissing delete
  // and re-add the page on the next run.
  const url = pageUrl(opts.baseUrl, path);
  const html = await (opts.fetchImpl ?? fetchHtml)(url);
  if (!html) return null;

  const $ = cheerio.load(html);

  const title = squash($("head > title").first().text()).replace(/\s*\|\s*Cambio Uruguay\s*$/i, "");
  const description = squash($('head meta[name="description"]').attr("content") ?? "");

  $(CHROME_SELECTORS).remove();

  const main = $("main").first();
  const container = main.length ? main : $("body");
  const h1 = squash(container.find("h1").first().text());
  // A stub page is indexed by its title and description alone: its body is a shared template, and
  // including it would make 529 branch pages look identical to the retriever.
  const text = opts.tier === "stub" ? "" : extractText($, container);

  if (!title && !description && !text) return null;

  return {
    path,
    tier: opts.tier,
    title: title || h1,
    description,
    h1,
    text,
    lastmod: opts.lastmod,
    crawledAt: new Date(),
  };
}

/**
 * Crawl many paths with bounded concurrency.
 *
 * Four at a time against our own Nitro server: enough to finish ~2 300 pages in about ten minutes,
 * low enough that the indexer never competes with real visitors for the server it is reading.
 */
export async function crawlAll(
  targets: ReadonlyArray<{ path: string; tier: PageTier; lastmod: string }>,
  opts: { baseUrl: string; concurrency?: number; fetchImpl?: CrawlOptions["fetchImpl"]; onPage?: (page: CrawledPage) => Promise<void> | void }
): Promise<{ crawled: number; failed: string[] }> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const queue = [...targets];
  const failed: string[] = [];
  let crawled = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const page = await crawlPage(next.path, {
        baseUrl: opts.baseUrl,
        tier: next.tier,
        lastmod: next.lastmod,
        fetchImpl: opts.fetchImpl,
      });
      if (!page) {
        failed.push(next.path);
        continue;
      }
      crawled++;
      if (opts.onPage) await opts.onPage(page);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  return { crawled, failed };
}
