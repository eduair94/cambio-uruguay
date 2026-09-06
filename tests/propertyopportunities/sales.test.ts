import { describe, expect, it } from "vitest";
import { harvestSalesInfoCasas, readInfoCasasSalePage, salePageUrl, toInfoCasasSale, uniformSalePages } from "../../classes/propertyopportunities/sales";
import type { InfoCasasSaleRow } from "../../classes/propertyopportunities/sales";

const NOW = "2026-09-06T12:00:00.000Z";
const base = (overrides: Partial<InfoCasasSaleRow> = {}): InfoCasasSaleRow => ({
  id: 123, operation_type_id: 1, title: "Venta apartamento de 2 dormitorios", description: "Segundo piso, luminoso.",
  link: "/venta-apartamento-de-2-dormitorios/123", property_type: { name: "Apartamento" },
  price: { amount: 120000, currency: { name: "U$S" } },
  commonExpenses: { amount: 3400, currency: { name: "$" } },
  locations: { country: [{ name: "Uruguay" }], state: [{ name: "Montevideo" }], neighbourhood: [{ name: "Cordón" }], city: [] },
  bedrooms: 2, bathrooms: 1, garage: 0, m2Built: 55, m2: 63,
  owner: { name: "Agencia Uno" }, created_at: "2026-09-05", showAddress: true, address: "Colonia 1234 apartamento 201",
  img: "https://cdn.infocasas.com.uy/casa.jpg", ...overrides,
});
const page = (rows: InfoCasasSaleRow[], currentPage = 1, lastPage = 1, total = rows.length) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { fetchResult: {
    searchFast: { data: rows, paginatorInfo: { currentPage, lastPage, total, hasMorePages: currentPage < lastPage } },
  } } } })}</script></html>`;

describe("InfoCasas sale-only normalization", () => {
  it("retains own galleries and dimensions without exposing coordinates when the source hides the address", () => {
    const fields = { latitude: -34.9, longitude: -56.2, images: [{ image: "https://cdn.infocasas.com.uy/inside.jpg" }], m2Terrace: 8 };
    expect(toInfoCasasSale(base({ ...fields, showAddress: false }), NOW)).toMatchObject({ geo: null, areas: { built: 55, total: 63, terrace: 8 } });
    const row = toInfoCasasSale(base({ ...fields, showAddress: true }), NOW)!;
    expect(row.images).toHaveLength(2);
    expect(row.geo).toEqual({ lat: -34.9, lng: -56.2, precision: "approximate" });
    expect(toInfoCasasSale(base({ ...fields, showAddress: true, latitude: -60 }), NOW)?.geo).toBeNull();
  });
  it("namespaces operation, preserves original price/currency, and keeps monthly expenses separate", () => {
    const row = toInfoCasasSale(base(), NOW)!;
    expect(row.id).toBe("sale:infocasas:123");
    expect(row.operation).toBe("sale");
    expect(row.price).toEqual({ amount: 120000, currency: "USD" });
    expect(row.expenses).toEqual({ amount: 3400, currency: "UYU" });
    expect(row.locality).toBe("Montevideo");
    expect(row.area).toEqual({ value: 55, basis: "built" });
    expect(row.parkingSpaces).toBeNull();
    expect(row.publishedAt).toBe("2026-09-05");
  });

  it.each([undefined, null, 0, 2, 3, true, "rent"])("rejects ambiguous/non-sale operation %s", operation_type_id => {
    expect(toInfoCasasSale(base({ operation_type_id }), NOW)).toBeNull();
  });

  it("rejects non-housing, unknown currencies, withdrawn adverts and foreign/incorrect links", () => {
    for (const override of [
      { property_type: { name: "Oficina" } }, { property_type: null }, { price: { amount: 150000, currency: { name: "UI" } } },
      { price: { amount: 0, currency: { name: "U$S" } } }, { active: false }, { sold: true }, { deleted: 1 },
      { hidePrice: true }, { price: { amount: 150000, hidePrice: true, currency: { name: "U$S" } } },
      { link: "https://evil.example/casa/123" }, { link: "/casa/124" },
      { locations: { country: [{ name: "Argentina" }], state: [{ name: "Montevideo" }] } },
    ]) expect(toInfoCasasSale(base(override), NOW)).toBeNull();
  });

  it("does not turn missing expenses, currency, bedrooms, garage or built area into zero", () => {
    const row = toInfoCasasSale(base({ commonExpenses: { amount: null, currency: { name: "$" } }, bedrooms: null,
      bathrooms: 0, m2Built: 0, m2: 60 }), NOW)!;
    expect(row.expenses).toBeNull();
    expect(row.bedrooms).toBeNull();
    expect(row.bathrooms).toBeNull();
    expect(row.area).toEqual({ value: 60, basis: "total" });
    expect(toInfoCasasSale(base({ commonExpenses: { amount: 2500 } }), NOW)!.expenses).toBeNull();
    expect(toInfoCasasSale(base({ commonExpenses: { amount: 0, currency: { name: "$" } } }), NOW)!.expenses).toEqual({ amount: 0, currency: "UYU" });
  });

  it("never uses a house's plot as a built area and preserves distinct land evidence", () => {
    const row = toInfoCasasSale(base({ property_type: { name: "Casa" }, m2Built: null, m2: 1000, m2Terrain: 1000 }), NOW)!;
    expect(row.area).toEqual({ value: 1000, basis: "reported" });
    expect(row.landArea).toBe(1000);
    expect(toInfoCasasSale(base({ description: "Casa sobre 5 hectáreas", m2Terrain: 5 }), NOW)!.landArea).toBeNull();
  });

  it("flags a materially larger built area than apartment total, without applying that rule to house plots", () => {
    expect(toInfoCasasSale(base({ m2Built: 80, m2: 60 }), NOW)!.riskFlags).toContain("attribute_conflict");
    expect(toInfoCasasSale(base({ m2Built: 61, m2: 60 }), NOW)!.riskFlags).not.toContain("attribute_conflict");
    expect(toInfoCasasSale(base({ m2Built: 120, m2: 90, property_type: { name: "Casa" } }), NOW)!.riskFlags).not.toContain("attribute_conflict");
  });

  it("copies only sanitized public facility labels", () => {
    const row = toInfoCasasSale(base({ facilities: [{ name: "Ascensor" }, { name: "Ascensor" }, { name: "Portería 099 123 456" }] }), NOW)!;
    expect(row.amenities).toEqual(["Ascensor", "Portería"]);
  });

  it("keeps source text and structured exclusion flags without inventing a total price", () => {
    const row = toInfoCasasSale(base({ title: "Unidad en proyecto desde U$S 30.000", description: "Entrega de 30.000 y 60 cuotas. Nuda propiedad.",
      isProjectUnit: true }), NOW)!;
    expect(row.riskFlags).toEqual(["project"]);
    expect(row.description).toContain("60 cuotas");
    expect(row.price.amount).toBe(120000);
  });

  it("sanitizes every copied string and never carries hidden addresses or contacts", () => {
    const row = toInfoCasasSale(base({ title: "Venta <script>alert(1)</script> 099 123 456", description: "Contactar mail@agency.uy o 099 123 456. Tiene 2 dormitorios.",
      owner: { name: "Agencia 099 123 456 mail@agency.uy" }, showAddress: false, address: "Calle Privada 555",
      img: "http://127.0.0.1/x.jpg", images: [{ image: "https://cdn.infocasas.com.uy/publica.jpg" }] }), NOW)!;
    expect(JSON.stringify(row)).not.toMatch(/099|mail@|Calle Privada|alert\(1\)|127\.0\.0\.1/);
    expect(row.description).toContain("2 dormitorios");
    expect(row.address).toBeUndefined();
    expect(row.image).toBe("https://cdn.infocasas.com.uy/publica.jpg");
  });

  it("does not infer interior locality from a neighborhood, nor trust an invalid publication date", () => {
    const row = toInfoCasasSale(base({ locations: { state: [{ name: "Maldonado" }], neighbourhood: [{ name: "Centro" }] },
      created_at: "2026-02-31" }), NOW)!;
    expect(row.locality).toBe("");
    expect(row.neighborhood).toBe("Centro");
    expect(row.publishedAt).toBeNull();
  });

  it("reads only the hierarchy corroborated in the same portal's property breadcrumb", () => {
    const child = { id: "cd94e021-359e-4c4e-8bb5-53c6ccb213ee", name: "Roosevelt", slug: ["neighbourhood-maldonado-roosevelt"] };
    const parent = { id: "89049a8e-eb92-465c-bd44-830fa12c3ccb", name: "Punta del Este", slug: ["neighbourhood-maldonado-punta-del-este"] };
    const convert = (neighbourhood: typeof child[]) => toInfoCasasSale(base({ locations: { state: [{ name: "Maldonado" }], neighbourhood } }), NOW)!;
    expect(convert([child, parent]).locality).toBe("Punta del Este");
    expect(convert([child, parent]).neighborhood).toBe("Roosevelt");
    expect(convert([parent, child]).locality).toBe("");
    expect(convert([child]).locality).toBe("");
    expect(convert([child, parent, parent]).locality).toBe("");
    expect(convert([child, { ...parent, id: "unknown" }]).locality).toBe("");
    expect(convert([{ ...child, slug: ["neighbourhood-canelones-roosevelt"] }, parent]).locality).toBe("");
    expect(convert([{ ...child, name: "Solanas" }, { ...parent, name: "Punta Ballena" }]).locality).toBe("");
  });
});

describe("bounded and honest sale harvesting", () => {
  it("records only explicit withdrawal IDs, never unseen IDs or non-sale status rows", async () => {
    const result = await harvestSalesInfoCasas({ maxPages: 2, geographicSeeds: false, now: () => new Date(NOW),
      fetchPage: async () => page([base(), base({ id: 124, sold: true }), base({ id: 125, active: false }), base({ id: 126, operation_type_id: 2, sold: true }), base({ id: 127, hidePrice: true }), base({ id: 128, price: { amount: 120000, hidePrice: true, currency: { name: "USD" } } })]),
    });
    expect(result.listings).toHaveLength(1);
    expect(result.unavailableIds).toEqual(["sale:infocasas:124", "sale:infocasas:125", "sale:infocasas:127", "sale:infocasas:128"]);
  });
  it("uses permitted public paths and uniform date positions, never cheap-only ordering", () => {
    expect(salePageUrl("casas", 2, "Río Negro")).toBe("https://www.infocasas.com.uy/venta/casas/rio-negro/pagina2?order=3");
    expect(salePageUrl("apartamentos", 3, "Montevideo", "Parque Rodó")).toBe("https://www.infocasas.com.uy/venta/apartamentos/montevideo/parque-rodo/pagina3?order=3");
    expect(() => salePageUrl("apartamentos", 1, "Canelones", "Pocitos")).toThrow();
    expect(() => salePageUrl("casas", 1, "Montevideo", "Pocitos")).toThrow();
    expect(() => salePageUrl("apartamentos", 1, "Montevideo", "Pocitos Nuevo")).toThrow();
    expect(() => salePageUrl("casas", 1, "Treinta y Tres")).toThrow();
    expect(() => salePageUrl("casas", 0)).toThrow();
    expect(uniformSalePages(100, 5)).toEqual([1, 26, 51, 75, 100]);
  });

  it("rejects absent/malformed pagination instead of claiming a complete catalogue", () => {
    expect(readInfoCasasSalePage("<html>blocked</html>")).toBeNull();
    expect(readInfoCasasSalePage(page([], 1, 0, 0))).toMatchObject({ rows: [], total: 0 });
  });

  it("samples the national tail within its page budget and deduplicates only source IDs", async () => {
    const urls: string[] = [];
    const result = await harvestSalesInfoCasas({ maxPages: 6, geographicSeeds: false, now: () => new Date(NOW), fetchPage: async url => {
      urls.push(url);
      const index = Number(url.match(/pagina(\d+)/)?.[1] || 1);
      return page([base()], index, 100, 2100);
    } });
    expect(urls).toHaveLength(6);
    expect(urls.filter(url => url.includes("pagina100"))).toHaveLength(2);
    expect(result.complete).toBe(false);
    expect(result.coverage).toMatchObject({ pagesRead: 6, pagesAvailable: 200, rawRows: 6, uniqueAccepted: 1, capped: true });
    expect(result.listings).toHaveLength(1);
    expect(result.coverage.byDepartment.Montevideo).toBe(1);
  });

  it("can prove completeness only after every national page succeeded", async () => {
    const result = await harvestSalesInfoCasas({ maxPages: 6, geographicSeeds: false, now: () => new Date(NOW), fetchPage: async url => {
      const index = Number(url.match(/pagina(\d+)/)?.[1] || 1);
      return page([base()], index, 2, 42);
    } });
    expect(result.complete).toBe(true);
    expect(result.coverage.pagesRead).toBe(4);
    expect(result.coverage.capped).toBe(false);
  });

  it("treats failures and page redirects as incomplete while retaining earlier useful rows", async () => {
    let count = 0;
    const result = await harvestSalesInfoCasas({ maxPages: 4, geographicSeeds: false, now: () => new Date(NOW), fetchPage: async () => {
      count++;
      if (count === 2) throw new Error("unavailable");
      return page([base()], 1, 2, 42);
    } });
    expect(result.ok).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.coverage.failedPages).toBe(2);
    expect(result.listings).toHaveLength(1);
  });

  it("ends at its time budget and retains the actual read time of earlier rows", async () => {
    let clock = Date.parse(NOW);
    let requests = 0;
    const result = await harvestSalesInfoCasas({ maxPages: 200, maxDurationMs: 1000, now: () => new Date(clock), fetchPage: async () => {
      requests++;
      clock += 1500;
      return page([base()], 1, 100, 2100);
    } });
    expect(requests).toBe(1);
    expect(result.complete).toBe(false);
    expect(result.coverage.capped).toBe(true);
    expect(result.listings[0]?.lastSeen).toBe("2026-09-06T12:00:01.500Z");
  });

  it("does not mistake a national redirect for a successful department seed", async () => {
    const result = await harvestSalesInfoCasas({ maxPages: 4, now: () => new Date(NOW), fetchPage: async () => page([base()], 1, 100, 2100) });
    expect(result.coverage.pagesRequested).toBe(4);
    expect(result.coverage.pagesRead).toBe(2);
    expect(result.coverage.failedPages).toBe(2);
    expect(result.coverage.byDepartment.Artigas).toBe(0);
    expect(result.coverage.byDepartment.Montevideo).toBe(1);
  });

  it("stops a repeated deep tail, records its IDs and never certifies it complete", async () => {
    const result = await harvestSalesInfoCasas({ maxPages: 30, geographicSeeds: false, now: () => new Date(NOW), fetchPage: async url => {
      const index = Number(url.match(/pagina(\d+)/)?.[1] || 1);
      return page([base()], index, 1000, 21000);
    } });
    expect(result.complete).toBe(false);
    expect(result.coverage.repeatedDepths).toHaveLength(2);
    expect(result.coverage.repeatedDepths!.every(stream => stream.depthLimit < stream.advertisedLastPage)).toBe(true);
    expect(result.pageReads?.every(item => item.ids[0] === "123")).toBe(true);
    expect(result.pageReads?.filter(item => item.newIds > 0)).toHaveLength(2);
    expect(result.coverage.uniqueAccepted).toBe(1);
  });

  it("samples department date ranges and refills earlier unread positions after a repeating tail", async () => {
    const result = await harvestSalesInfoCasas({ maxPages: 40, departments: ["Montevideo"], now: () => new Date(NOW), fetchPage: async url => {
      const index = Number(url.match(/pagina(\d+)/)?.[1] || 1);
      const id = Math.min(index, 10) + (url.includes('/casas') ? 100 : 200);
      return page([base({ id, link: `/vivienda/${id}` })], index, 100, 2100);
    } });
    expect(result.coverage.strategy).toBe("stratified-departments-with-national-sample");
    expect(result.pageReads?.some(item => /montevideo\/pagina[2-9]$/.test(item.path))).toBe(true);
    expect(result.coverage.repeatedDepths!.length).toBeGreaterThan(0);
    expect(result.complete).toBe(false);
    expect(result.listings.length).toBeGreaterThan(4);
  });

  it("keeps 150 neighborhood reads inside the default 500-page budget and retains national/department breadth", async () => {
    const names: Record<string, string> = { pocitos: "Pocitos", cordon: "Cordón", centro: "Centro", "tres-cruces": "Tres Cruces", "parque-rodo": "Parque Rodó" };
    const urls: string[] = [];
    const result = await harvestSalesInfoCasas({ now: () => new Date(NOW), fetchPage: async url => {
      urls.push(url);
      const parts = new URL(url).pathname.split("/").filter(Boolean);
      const index = Number(url.match(/pagina(\d+)/)?.[1] || 1);
      if (parts[2] && !parts[2].startsWith("pagina") && parts[2] !== "montevideo") return page([], index, 1, 0);
      const neighborhood = names[parts[3] || ""] || "Cordón";
      return page([base({ id: urls.length, link: `/aviso/${urls.length}`, locations: { state: [{ name: "Montevideo" }],
        neighbourhood: [{ name: neighborhood }] } })], index, 1000, 21000);
    } });
    const neighborhoodUrls = urls.filter(url => /montevideo\/(pocitos|cordon|centro|tres-cruces|parque-rodo)(?:\/|\?)/.test(url));
    expect(urls).toHaveLength(500);
    expect(neighborhoodUrls).toHaveLength(150);
    expect(Object.keys(names).every(slug => neighborhoodUrls.some(url => url.includes(`/montevideo/${slug}?`)))).toBe(true);
    expect(urls.some(url => url.includes("/casas/montevideo/pagina"))).toBe(true);
    expect(urls.some(url => url.includes("/apartamentos/artigas?"))).toBe(true);
    expect(urls.every(url => url.endsWith("?order=3"))).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.coverage.pagesRequested).toBe(500);
  });

  it.each(["department", "neighborhood"])("rejects a neighborhood redirect with mismatched %s", async mismatch => {
    const names: Record<string, string> = { pocitos: "Pocitos", cordon: "Cordón", centro: "Centro", "tres-cruces": "Tres Cruces", "parque-rodo": "Parque Rodó" };
    const result = await harvestSalesInfoCasas({ maxPages: 20, departments: ["Montevideo"], neighborhoodSamples: true,
      now: () => new Date(NOW), fetchPage: async url => {
        const requested = names[new URL(url).pathname.split("/").filter(Boolean)[3] || ""];
        return page([requested ? base({ id: 999, link: "/outside/999", locations: {
          state: [{ name: mismatch === "department" ? "Canelones" : "Montevideo" }],
          neighbourhood: [{ name: mismatch === "neighborhood" ? "Pocitos Nuevo" : requested }],
        } }) : base()]);
      } });
    expect(result.coverage.failedPages).toBe(5);
    expect(result.listings.map(item => item.listingId)).toEqual(["infocasas:123"]);
    expect(result.complete).toBe(false);
  });

  it("retains only the exact neighborhood's own rows on a valid mixed result page", async () => {
    const result = await harvestSalesInfoCasas({ maxPages: 9, departments: ["Montevideo"], neighborhoodSamples: true,
      now: () => new Date(NOW), fetchPage: async url => {
        if (!url.includes("/montevideo/pocitos?")) return page([]);
        return page([
          base({ id: 1, link: "/pocitos/1", locations: { state: [{ name: "Montevideo" }], neighbourhood: [{ name: "Pocitos" }] } }),
          base({ id: 2, link: "/pocitos-nuevo/2", locations: { state: [{ name: "Montevideo" }], neighbourhood: [{ name: "Pocitos Nuevo" }] } }),
          base({ id: 3, link: "/other/3", locations: { state: [{ name: "Canelones" }], neighbourhood: [{ name: "Pocitos" }] } }),
        ]);
      } });
    expect(result.listings.map(item => [item.listingId, item.neighborhood])).toEqual([["infocasas:1", "Pocitos"]]);
    expect(result.coverage.byDepartment.Canelones).toBe(0);
  });
});
