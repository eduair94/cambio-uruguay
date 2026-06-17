import { describe, expect, it } from "vitest";
import { mergeNews, parseFeed } from "../src/news";

const XML = `<rss><channel>
<item>
  <title>El dólar sube en Uruguay - El País</title>
  <link>https://example.com/a</link>
  <source url="x">El País</source>
  <pubDate>Tue, 17 Jun 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[<a href="x">Texto</a> de la noticia &amp; más detalle aquí]]></description>
</item>
<item>
  <title>Análisis del peso - Búsqueda</title>
  <link>https://example.com/b</link>
  <source url="y">Búsqueda</source>
  <pubDate>Wed, 18 Jun 2026 09:00:00 GMT</pubDate>
  <description>Resumen corto</description>
</item>
</channel></rss>`;

describe("parseFeed", () => {
  it("extracts items and strips the trailing ' - source' from the title", () => {
    const items = parseFeed(XML);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "El dólar sube en Uruguay",
      link: "https://example.com/a",
      source: "El País",
    });
    expect(items[0].snippet).toBe("Texto de la noticia & más detalle aquí");
  });
});

describe("mergeNews", () => {
  it("dedups by title, sorts newest first, and applies the limit", () => {
    const dup = parseFeed(XML)[0];
    const merged = mergeNews([...parseFeed(XML), dup], 10);
    expect(merged).toHaveLength(2);
    expect(merged[0].title).toBe("Análisis del peso"); // newer pubDate first
  });

  it("respects the limit", () => {
    expect(mergeNews(parseFeed(XML), 1)).toHaveLength(1);
  });
});
