// Parsing YouTube's Atom feed by regex is a deliberate choice (no XML dependency for four fields),
// which means these tests are the only thing standing between a feed-format tweak and a page that
// silently lists nothing. The fixture below is a trimmed copy of a real response.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchChannelFeed, feedUrl, firstParagraph } from "../../classes/videos/sources";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCtest"/>
 <yt:channelId>test</yt:channelId>
 <title>Canal de Prueba</title>
 <entry>
  <id>yt:video:AAAAAAAAAAA</id>
  <yt:videoId>AAAAAAAAAAA</yt:videoId>
  <yt:channelId>UCtest</yt:channelId>
  <title>&#191;Por qu&#233; sube el d&#243;lar? &amp; qu&#233; esperar</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=AAAAAAAAAAA"/>
  <published>2026-08-14T12:00:00+00:00</published>
  <media:group>
   <media:thumbnail url="https://i3.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg" width="480" height="360"/>
   <media:description>El dólar cerró la semana en alza.

Suscribite → https://example.com</media:description>
   <media:community>
    <media:starRating count="59" average="5.00" min="1" max="5"/>
    <media:statistics views="12345"/>
   </media:community>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:BBBBBBBBBBB</id>
  <yt:videoId>BBBBBBBBBBB</yt:videoId>
  <title>Un short cualquiera</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/BBBBBBBBBBB"/>
  <published>2026-08-15T09:00:00+00:00</published>
  <media:group>
   <media:thumbnail url="https://i3.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg" width="480" height="360"/>
   <media:description></media:description>
  </media:group>
 </entry>
</feed>`;

function mockFetch(body: string, ok = true, status = 200) {
  const spy = vi.fn(async () => ({ ok, status, text: async () => body }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

describe("feedUrl", () => {
  it("addresses the channel by id and escapes it", () => {
    expect(feedUrl("UCabc")).toBe("https://www.youtube.com/feeds/videos.xml?channel_id=UCabc");
    expect(feedUrl("a b")).toContain("a%20b");
  });
});

describe("fetchChannelFeed", () => {
  it("reads the channel name and every entry", async () => {
    mockFetch(FEED);
    const feed = await fetchChannelFeed("UCtest");
    expect(feed.name).toBe("Canal de Prueba");
    expect(feed.videos).toHaveLength(2);
  });

  it("decodes the entities in a title instead of showing them raw", async () => {
    mockFetch(FEED);
    const [first] = (await fetchChannelFeed("UCtest")).videos;
    expect(first!.title).toBe("¿Por qué sube el dólar? & qué esperar");
  });

  it("keeps the canonical watch URL even for a Short", async () => {
    mockFetch(FEED);
    const [, second] = (await fetchChannelFeed("UCtest")).videos;
    // The feed's own href for a Short is /shorts/<id>, which does not embed.
    expect(second!.url).toBe("https://www.youtube.com/watch?v=BBBBBBBBBBB");
    expect(second!.isShort).toBe(true);
  });

  it("reads the thumbnail, the date and the view count", async () => {
    mockFetch(FEED);
    const [first] = (await fetchChannelFeed("UCtest")).videos;
    expect(first!.thumbnail).toBe("https://i3.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg");
    expect(first!.publishedAt).toBe("2026-08-14T12:00:00+00:00");
    expect(first!.views).toBe(12345);
  });

  it("reports no views rather than zero when the feed omits the counter", async () => {
    mockFetch(FEED);
    const [, second] = (await fetchChannelFeed("UCtest")).videos;
    // Zero would render as "0 vistas", which is a claim the feed never made.
    expect(second!.views).toBeNull();
  });

  it("throws on a 404 so the caller can record the channel as down", async () => {
    mockFetch("<html>nope</html>", false, 404);
    await expect(fetchChannelFeed("UCgone")).rejects.toThrow(/404/);
  });

  it("throws when a 200 carries YouTube's error page instead of a feed", async () => {
    // The failure that would otherwise be reported as "ok, 0 videos" — indistinguishable from a
    // channel that simply did not upload anything.
    mockFetch("<!DOCTYPE html><html><title>Error 404 (Not Found)!!1</title></html>");
    await expect(fetchChannelFeed("UCgone")).rejects.toThrow(/feed/i);
  });
});

describe("firstParagraph", () => {
  it("keeps only the paragraph a human wrote", () => {
    expect(firstParagraph("El dólar cerró en alza.\n\nSuscribite → https://x.com")).toBe(
      "El dólar cerró en alza."
    );
  });

  it("drops the timestamp index and the bare links", () => {
    const desc = "Análisis de la semana\n0:00 Intro\n2:14 El dólar\nhttps://example.com\n\nMás abajo";
    expect(firstParagraph(desc)).toBe("Análisis de la semana");
  });

  it("truncates on a word boundary and marks the cut", () => {
    const long = `${"palabra ".repeat(60)}fin`;
    const out = firstParagraph(long, 60);
    expect(out.length).toBeLessThanOrEqual(61);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/pala…$/); // never mid-word
  });

  it("returns an empty string for an empty description", () => {
    expect(firstParagraph("")).toBe("");
    expect(firstParagraph("\n\n")).toBe("");
  });
});
