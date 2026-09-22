import { describe, expect, it } from "vitest";
import { UserInputError } from "../src/output";
import { SiteError } from "../src/site";
import { readPage, searchSite, siteSections } from "../src/sitio/site";
import { fakeSite } from "./fakeSite";

const search = {
  query: "franquicia courier",
  pages: [
    {
      title: "Franquicia courier",
      description: "Cuánto podés traer sin pagar impuestos.",
      type: "guide",
      section: "Comprar en el exterior",
      path: "/franquicia-courier-uruguay",
      url: "https://cambio-uruguay.com/franquicia-courier-uruguay",
    },
  ],
  content: [
    {
      path: "/franquicia-courier-uruguay",
      url: "https://cambio-uruguay.com/franquicia-courier-uruguay",
      title: "Franquicia courier en Uruguay",
      tier: "full",
      crawledAt: "2026-09-21T04:20:00.000Z",
      passages: [{ heading: "Cuánto", text: "Hasta US$ 800 al año\nen tres envíos." }],
    },
  ],
  contentAvailable: true,
};

describe("search_site", () => {
  it("lists where to go and what the site says, with the date the text was read", async () => {
    const { site, calls } = fakeSite({ "/api/site/search": search });
    const out = await searchSite(site, { query: "franquicia courier" });
    expect(calls[0]!.query).toEqual({ q: "franquicia courier", limit: 6 });
    expect(out.text).toContain("1. Franquicia courier (Comprar en el exterior): https://cambio-uruguay.com/franquicia-courier-uruguay");
    expect(out.text).toContain("(texto leído el 2026-09-21)");
    expect(out.text).toContain("[Cuánto] Hasta US$ 800 al año en tres envíos.");
    expect(out.text).toContain("para cotizaciones de hoy usá las tools de cambio");
    expect(out.data).toMatchObject({ query: "franquicia courier", content: [{ crawledAt: "2026-09-21" }] });
  });

  it("says how to retry when nothing matches", async () => {
    const { site } = fakeSite({ "/api/site/search": { pages: [], content: [] } });
    const out = await searchSite(site, { query: "zzz" });
    expect(out.text).toMatch(/No encontré nada .*site_sections/);
  });

  it("warns when only navigation answered", async () => {
    const { site } = fakeSite({ "/api/site/search": { ...search, content: [], contentAvailable: false } });
    expect((await searchSite(site, { query: "franquicia" })).text).toContain("índice de textos del sitio no respondió");
  });

  it("rejects a one-letter query before calling the site", async () => {
    const { site, calls } = fakeSite({});
    await expect(searchSite(site, { query: " a " })).rejects.toBeInstanceOf(UserInputError);
    expect(calls).toHaveLength(0);
  });
});

describe("read_page", () => {
  const page = {
    path: "/alquilar-en-uruguay",
    url: "https://cambio-uruguay.com/alquilar-en-uruguay",
    title: "Cómo alquilar en Uruguay",
    crawledAt: "2026-09-21T04:20:00.000Z",
    text: "Intro\n## Garantías\nANDA, Contaduría y seguro.",
    offset: 0,
    totalChars: 20000,
    nextOffset: 8000,
  };

  it("returns the text and how to continue", async () => {
    const { site, calls } = fakeSite({ "/api/site/page": page });
    const out = await readPage(site, { page: "https://cambio-uruguay.com/alquilar-en-uruguay" });
    expect(calls[0]!.query).toEqual({ path: "https://cambio-uruguay.com/alquilar-en-uruguay", offset: 0 });
    expect(out.text).toMatch(/^# Cómo alquilar en Uruguay\nhttps:\/\/cambio-uruguay.com\/alquilar-en-uruguay — texto leído el 2026-09-21/);
    expect(out.text).toContain("## Garantías");
    expect(out.text).toContain("read_page con offset=8000");
  });

  it("only reads the site's own pages", async () => {
    const { site, calls } = fakeSite({});
    await expect(readPage(site, { page: "https://example.com/x" })).rejects.toBeInstanceOf(UserInputError);
    expect(calls).toHaveLength(0);
  });

  it("passes a missing page through as a site error", async () => {
    const { site } = fakeSite({ "/api/site/page": new SiteError(404, "No existe o ya no está publicado en cambio-uruguay.com.") });
    await expect(readPage(site, { page: "/no-existe" })).rejects.toBeInstanceOf(SiteError);
  });
});

describe("site_sections", () => {
  it("prints the menu", async () => {
    const { site } = fakeSite({
      "/api/site/sections": {
        sections: [{ id: "market", title: "Mercado", pages: [{ title: "Dólar hoy", path: "/dolar-hoy", url: "https://cambio-uruguay.com/dolar-hoy" }] }],
      },
    });
    const out = await siteSections(site);
    expect(out.text).toContain("## Mercado\n- Dólar hoy: https://cambio-uruguay.com/dolar-hoy");
  });
});
