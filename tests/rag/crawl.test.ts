import { describe, expect, it } from "vitest";
import { crawlAll, crawlPage, pageUrl } from "../../classes/rag/crawl";

const html = (main: string, head = ""): string => `<!doctype html><html><head>
<title>Importar para revender en Uruguay | Cambio Uruguay</title>
<meta name="description" content="El 60% al courier y el tope real de 2 DUA por año.">
${head}</head><body>
<header><nav><a href="/">Inicio</a><a href="/guias">Guías</a></nav></header>
<div class="v-navigation-drawer">Menú lateral con cuarenta enlaces</div>
<main>${main}
  <div class="related-pages"><h2>Seguí leyendo</h2><a href="/otra">Otra página</a></div>
  <form class="nl-capture-form">Suscribite al newsletter</form>
</main>
<footer class="cu-footer">Cambio Uruguay 2026. Todos los derechos.</footer>
<script>window.__NUXT__={}</script></body></html>`;

const opts = (over: Record<string, unknown> = {}) => ({
  baseUrl: "https://cambio-uruguay.com",
  tier: "full" as const,
  lastmod: "2026-08-17",
  ...over,
});

describe("rag/crawl — extraction", () => {
  it("takes the title without the site suffix, and the meta description", async () => {
    const page = await crawlPage("/importar", opts({ fetchImpl: async () => html("<h1>Importar</h1><p>Texto.</p>") }));
    expect(page!.title).toBe("Importar para revender en Uruguay");
    expect(page!.description).toContain("60%");
  });

  it("drops the layout — otherwise the index holds 430 copies of the footer", async () => {
    const page = await crawlPage("/importar", opts({ fetchImpl: async () => html("<h1>Importar</h1><p>El cuerpo real.</p>") }));
    expect(page!.text).toContain("El cuerpo real");
    expect(page!.text).not.toContain("Todos los derechos");
    expect(page!.text).not.toContain("Menú lateral");
    expect(page!.text).not.toContain("Seguí leyendo"); // .related-pages lives INSIDE <main>
    expect(page!.text).not.toContain("Suscribite al newsletter");
  });

  it("separates adjacent blocks — a concatenated 'courierEl Decreto' corrupts the embedding", async () => {
    const page = await crawlPage(
      "/importar",
      opts({ fetchImpl: async () => html("<p>Se paga al courier</p><p>El Decreto lo regula</p>") })
    );
    expect(page!.text).not.toContain("courierEl");
    expect(page!.text).toContain("Se paga al courier\nEl Decreto lo regula");
  });

  it("keeps headings as depth-tagged markers the chunker can read back", async () => {
    const page = await crawlPage(
      "/importar",
      opts({ fetchImpl: async () => html("<h2>El 60%</h2><p>Se paga al courier.</p><h3>Quién</h3><p>El courier.</p>") })
    );
    expect(page!.text).toContain("## El 60%");
    expect(page!.text).toContain("### Quién");
  });

  it("keeps table cells, which is where the numbers live", async () => {
    const page = await crawlPage(
      "/importar",
      opts({ fetchImpl: async () => html("<table><tr><td>Tope</td><td>US$ 800</td></tr></table>") })
    );
    expect(page!.text).toContain("US$ 800");
  });

  it("indexes a stub by title and description only, not by its shared template", async () => {
    const page = await crawlPage(
      "/sucursal/brou-centro",
      opts({ tier: "stub", fetchImpl: async () => html("<p>Plantilla repetida en 529 páginas.</p>") })
    );
    expect(page!.text).toBe("");
    expect(page!.description).toContain("60%");
  });

  it("returns null when the fetch failed", async () => {
    expect(await crawlPage("/x", opts({ fetchImpl: async () => null }))).toBeNull();
  });

  it("returns null for a page with nothing in it", async () => {
    expect(await crawlPage("/x", opts({ fetchImpl: async () => "<html><body></body></html>" }))).toBeNull();
  });
});

describe("rag/crawl — crawlAll", () => {
  it("visits every target and reports the ones that failed", async () => {
    const seen: string[] = [];
    const result = await crawlAll(
      [
        { path: "/a", tier: "full", lastmod: "" },
        { path: "/b", tier: "full", lastmod: "" },
        { path: "/dead", tier: "full", lastmod: "" },
      ],
      {
        baseUrl: "https://cambio-uruguay.com",
        concurrency: 2,
        fetchImpl: async (url: string) => (url.endsWith("/dead") ? null : html("<p>Contenido de la página.</p>")),
        onPage: async (page) => {
          seen.push(page.path);
        },
      }
    );
    expect(result.crawled).toBe(2);
    expect(result.failed).toEqual(["/dead"]);
    expect(seen.sort()).toEqual(["/a", "/b"]);
  });

  it("builds the absolute URL from the base and the path", async () => {
    const urls: string[] = [];
    await crawlAll([{ path: "/guias/aduana", tier: "full", lastmod: "" }], {
      baseUrl: "https://cambio-uruguay.com/",
      fetchImpl: async (url: string) => {
        urls.push(url);
        return html("<p>x</p>");
      },
    });
    expect(urls).toEqual(["https://cambio-uruguay.com/guias/aduana"]);
  });
});

describe("rag/crawl — pageUrl", () => {
  it("percent-encodes what the sitemap left raw", () => {
    // The sitemap endpoint returns bare paths, so a department keeps its accent AND its space.
    // Requesting that unencoded is why 25 pages failed on the first build.
    expect(pageUrl("https://cambio-uruguay.com", "/sucursales/cambilex/RÍO NEGRO")).toBe(
      "https://cambio-uruguay.com/sucursales/cambilex/R%C3%8DO%20NEGRO"
    );
    expect(pageUrl("https://cambio-uruguay.com", "/sucursales/cambilex/PAYSANDÚ")).toBe(
      "https://cambio-uruguay.com/sucursales/cambilex/PAYSAND%C3%9A"
    );
  });

  it("does not double-encode a path that already arrived encoded", () => {
    const encoded = "/sucursales/cambilex/R%C3%8DO%20NEGRO";
    expect(pageUrl("https://cambio-uruguay.com", encoded)).toBe(`https://cambio-uruguay.com${encoded}`);
  });

  it("escapes # and ?, which encodeURI leaves alone and a URL would read as fragment or query", () => {
    expect(pageUrl("https://cambio-uruguay.com", "/a/b#c")).toBe("https://cambio-uruguay.com/a/b%23c");
    expect(pageUrl("https://cambio-uruguay.com", "/a/b?c")).toBe("https://cambio-uruguay.com/a/b%3Fc");
    // …and survives the decode/encode round trip when they arrived escaped already.
    expect(pageUrl("https://cambio-uruguay.com", "/a/b%23c")).toBe("https://cambio-uruguay.com/a/b%23c");
  });

  it("fixes a partly-encoded path — the case a plain 'already encoded?' guard gets wrong", () => {
    expect(pageUrl("https://cambio-uruguay.com", "/sucursales/cambilex/R%C3%8DO NEGRO")).toBe(
      "https://cambio-uruguay.com/sucursales/cambilex/R%C3%8DO%20NEGRO"
    );
  });

  it("does not throw on a bare % that is not an escape", () => {
    expect(pageUrl("https://cambio-uruguay.com", "/descuento-100%-off")).toBe(
      "https://cambio-uruguay.com/descuento-100%25-off"
    );
  });

  it("still strips a trailing slash off the base", () => {
    expect(pageUrl("https://cambio-uruguay.com/", "/guias")).toBe("https://cambio-uruguay.com/guias");
  });

  it("crawls an accented path and keeps the path the sitemap gave, so the index does not churn", async () => {
    // Storing the encoded form instead would orphan every existing row and make pruneMissing
    // delete and re-add the page on the next run.
    const page = await crawlPage(
      "/sucursales/cambilex/RÍO NEGRO",
      opts({ tier: "stub", fetchImpl: async () => html("<p>x</p>") })
    );
    expect(page!.path).toBe("/sucursales/cambilex/RÍO NEGRO");
  });
});
