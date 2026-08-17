import { describe, expect, it } from "vitest";
import { crawlAll, crawlPage } from "../../classes/rag/crawl";

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
