// Where the videos come from: YouTube's per-channel Atom feed.
//
// No key, no quota, no login. `https://www.youtube.com/feeds/videos.xml?channel_id=UC…` returns the
// channel's latest ~15 uploads with the id, title, description, thumbnail, publish date and (when
// YouTube feels like it) the view count. That is everything the page renders, which is why this
// job deliberately does NOT use the YouTube Data API: the API costs quota per call, needs a key on
// the VPS, and would buy us only the duration field.
//
// The consequence, stated here so nobody re-discovers it: the feed is a WINDOW, not an archive.
// It carries the last ~15 uploads and nothing older, so a channel that posts daily gives us two
// weeks and a channel that posts monthly gives us a year. The snapshot therefore accumulates
// nothing — what a run cannot see, the page does not show.

/** One entry of a channel feed, before classification. */
export interface RawVideo {
  videoId: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  views: number | null;
  /** YouTube marks Shorts by URL shape. They are dropped upstream; see `refresh.ts`. */
  isShort: boolean;
}

export interface ChannelFeed {
  /** The channel's own <title>, which is the name to trust over anything we hardcoded. */
  name: string;
  videos: RawVideo[];
}

const UA = "cambio-uruguay.com videos bot (+https://cambio-uruguay.com)";

export function feedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

/**
 * Fetch with an explicit per-request deadline.
 *
 * `AbortSignal.timeout` and not an axios-style `timeout` option on purpose: a hung TCP connect
 * never produces a socket, so a timer keyed on the socket never fires (see the proxy timeout gotcha
 * this repo already paid for once).
 */
async function getText(url: string, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "application/atom+xml, application/xml, text/xml, */*",
      "accept-language": "es-UY,es;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Undo XML entities, drop any CDATA wrapper, resolve the numeric ones YouTube emits. */
function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // &amp; LAST, so "&amp;lt;" decodes to "&lt;" and not to "<".
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Build a matcher for one XML element.
 *
 * Written with `String.raw` rather than a plain template literal: the pattern needs a literal
 * backslash-s, and every escape level in a hand-written `new RegExp(\`…\`)` is one more place for a
 * silently-wrong pattern that matches nothing and reports an empty feed.
 */
function elementRe(name: string, flags = ""): RegExp {
  return new RegExp(String.raw`<${name}(?:\s[^>]*)?>([\s\S]*?)</${name}>`, flags);
}

/** Text of the first `<name>` element inside `block`, whitespace collapsed. */
function tag(block: string, name: string): string {
  const m = elementRe(name).exec(block);
  return m ? decodeXml(m[1] ?? "").replace(/\s+/g, " ").trim() : "";
}

/** Same, but keeps line breaks — descriptions are multi-line and the first paragraph matters. */
function tagMultiline(block: string, name: string): string {
  const m = elementRe(name).exec(block);
  return m ? decodeXml(m[1] ?? "") : "";
}

/** Value of one attribute on the first self-closing `<name …>` element inside `block`. */
function attr(block: string, name: string, attribute: string): string {
  const el = new RegExp(String.raw`<${name}\s[^>]*>`).exec(block);
  if (!el) return "";
  const m = new RegExp(String.raw`${attribute}="([^"]*)"`).exec(el[0]);
  return m ? decodeXml(m[1] ?? "") : "";
}

function entries(xml: string): string[] {
  const out: string[] = [];
  const re = elementRe("entry", "g");
  for (;;) {
    const m = re.exec(xml);
    if (!m) break;
    out.push(m[1] ?? "");
  }
  return out;
}

/**
 * The description as the page shows it: the first paragraph only.
 *
 * YouTube descriptions are a wall of affiliate links, timestamps and "suscribite" boilerplate. The
 * first paragraph is the part a human wrote about the video, and it is what both the card and the
 * VideoObject `description` need. Truncated on a word boundary, never mid-word.
 */
export function firstParagraph(description: string, max = 320): string {
  const first = (description.split(/\n\s*\n/)[0] ?? "")
    .split("\n")
    // Drop the chapter index and the bare link lines: they are navigation, not a description.
    .filter(line => !/^\s*(?:\d{1,2}:\d{2}|#|https?:\/\/)/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!first) return "";
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${kept.replace(/[\s,;:.–-]+$/, "")}…`;
}

/**
 * Read one channel's feed.
 *
 * Throws on a dead channel (YouTube answers 404 with an HTML error page) so the caller can record
 * that channel as down instead of silently publishing a shorter list.
 */
export async function fetchChannelFeed(channelId: string): Promise<ChannelFeed> {
  const xml = await getText(feedUrl(channelId));
  if (!xml.includes("<feed")) {
    // A 200 that is not a feed means YouTube served its error page. Treat it as a dead channel
    // rather than parsing zero entries out of HTML and reporting "ok, 0 videos".
    throw new Error("respuesta sin <feed> (canal inexistente o sin feed público)");
  }

  const firstEntry = xml.indexOf("<entry");
  const name = tag(firstEntry === -1 ? xml : xml.slice(0, firstEntry), "title");

  const videos = entries(xml)
    .map((block): RawVideo | null => {
      const videoId = tag(block, "yt:videoId");
      if (!videoId) return null;
      const href = attr(block, "link", "href");
      return {
        videoId,
        title: tag(block, "title"),
        description: tagMultiline(block, "media:description"),
        // Always the canonical /watch URL, even for a Short: the feed's own href for a Short is
        // /shorts/<id>, which does not embed.
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail:
          attr(block, "media:thumbnail", "url") ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: tag(block, "published"),
        channelId: tag(block, "yt:channelId") || channelId,
        views: readViews(block),
        isShort: href.includes("/shorts/"),
      };
    })
    .filter((v): v is RawVideo => v !== null && !!v.title && !!v.publishedAt);

  return { name, videos };
}

function readViews(block: string): number | null {
  const raw = attr(block, "media:statistics", "views");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
