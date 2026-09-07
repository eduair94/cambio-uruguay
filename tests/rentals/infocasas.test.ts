import { describe, expect, it } from "vitest";
import {
  INFOCASAS_PRICE_RANGES, harvestInfoCasas, infoCasasPageUrl, readPage,
  type InfoCasasPriceRange,
} from "../../classes/rentals/sources/infocasas";

const row = (id: number, price = 12_000) => ({
  id, title: "Alquiler apartamento en Paso de la Arena", link: `/apartamento/${id}`,
  description: `Precio ${price}. Se alquila apartamento de un dormitorio. Garantía ANDA.`,
  price: { amount: price, currency: { name: "$" } },
  property_type: { name: "Apartamento" }, operation_type_id: 2,
});

function page(rows: unknown[], currentPage = 1, lastPage = 1, total = rows.length, range: InfoCasasPriceRange = {}) {
  return { props: { pageProps: {
    params: { filters: { operation_type_id: { value: 2 }, currencyID: { value: 2 }, order: { value: 3 },
      ...(range.min ? { minPrice: { value: range.min } } : {}),
      ...(range.max ? { maxPrice: { value: range.max } } : {}),
    } },
    fetchResult: { searchFast: { data: rows, paginatorInfo: {
      currentPage, lastPage, total, hasMorePages: currentPage < lastPage,
    } } },
  } } };
}
const html = (value: unknown) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(value)}</script>`;

describe("InfoCasas rental coverage", () => {
  it("uses robot-compatible, overlapping price ranges instead of the capped national tail", async () => {
    const urls: string[] = [];
    const result = await harvestInfoCasas("full", 41.5, { fetchPage: async url => {
      urls.push(url);
      const index = urls.length - 1;
      return html(page([row(index + 1)], 1, 1, 1, INFOCASAS_PRICE_RANGES[index]));
    } });
    expect(urls).toEqual(INFOCASAS_PRICE_RANGES.map(range => infoCasasPageUrl(1, range)));
    expect(urls.every(url => !new URL(url).pathname.includes("-y-"))).toBe(true);
    expect(result.listings).toHaveLength(5);
    expect(result.complete).toBe(false); // Public live searches cannot prove absence.
  });

  it("keeps first-seen cheap adverts that old deep pagination could not reach", async () => {
    const result = await harvestInfoCasas("full", 41.5, {
      ranges: [{ max: 13_000 }], fetchPage: async url => html(page(
        [row(url.includes("pagina2") ? 193666397 : 193663544, url.includes("pagina2") ? 6500 : 12000)],
        url.includes("pagina2") ? 2 : 1, 2, 2, { max: 13_000 }
      )),
    });
    expect(result.listings.map(item => item.price)).toEqual([12000, 6500]);
  });

  it("rejects missing/malformed pagination instead of declaring a complete import", () => {
    expect(readPage({ props: { pageProps: { fetchResult: { searchFast: { data: [row(1)] } } } } })).toBeNull();
    const invalid = page([row(1)]);
    (invalid.props.pageProps.fetchResult.searchFast.paginatorInfo as any).hasMorePages = "false";
    expect(readPage(invalid)).toBeNull();
  });

  it("detects an upstream redirect and still reads the next range", async () => {
    const result = await harvestInfoCasas("full", 41.5, {
      ranges: [{ max: 13_000 }, { min: 13_000, max: 25_000 }],
      fetchPage: async url => html(url.includes("desde")
        ? page([row(2)], 1, 1, 1, { min: 13_000, max: 25_000 }) : page([row(1)])),
    });
    expect(result.listings.map(item => item.listingId)).toEqual(["infocasas:2"]);
    expect(result.note).toContain("1 páginas fallidas");
  });

  it("stops a repeated deep tail despite advancing paginator numbers", async () => {
    let requests = 0;
    const result = await harvestInfoCasas("full", 41.5, { ranges: [{}], fetchPage: async () => {
      requests++;
      return html(page([row(1)], requests, 100, 2100));
    } });
    expect(requests).toBe(4);
    expect(result.listings).toHaveLength(1);
    expect(result.note).toContain("1 colas repetidas");
    expect(result.complete).toBe(false);
  });

  it("splits a growing price range before reaching the source depth ceiling", async () => {
    const urls: string[] = [];
    const result = await harvestInfoCasas("full", 41.5, { ranges: [{ max: 20_000 }], fetchPage: async url => {
      urls.push(url);
      if (urls.length === 1) return html(page([row(1)], 1, 500, 10_500, { max: 20_000 }));
      const range = urls.length === 2 ? { max: 10_000 } : { min: 10_000, max: 20_000 };
      return html(page([row(urls.length)], 1, 1, 1, range));
    } });
    expect(urls).toEqual([
      infoCasasPageUrl(1, { max: 20_000 }), infoCasasPageUrl(1, { max: 10_000 }),
      infoCasasPageUrl(1, { min: 10_000, max: 20_000 }),
    ]);
    expect(result.listings).toHaveLength(2);
  });

  it("separates rejected rows from repeated readings and detects omitted IDs", async () => {
    const result = await harvestInfoCasas("full", 41.5, { ranges: [{}], fetchPage: async () =>
      html(page([row(1), row(1), { ...row(2), title: "Alquiler x día" }], 1, 1, 3)) });
    expect(result.note).toContain("2 IDs únicos leídos, 1 avisos aceptados; 1 descartados, 1 lecturas repetidas");
    expect(result.note).toContain("omitió IDs");
  });

  it("bounds the hourly feed and never expires unseen adverts", async () => {
    const urls: string[] = [];
    const result = await harvestInfoCasas("fast", 41.5, { maxPages: 2, fetchPage: async url => {
      urls.push(url);
      return html(page([row(urls.length)], urls.length, 100, 2100));
    } });
    expect(urls).toEqual(["https://www.infocasas.com.uy/alquiler?order=3", "https://www.infocasas.com.uy/alquiler/pagina2?order=3"]);
    expect(result.complete).toBe(false);
    expect(result.note).toContain("CORTADO");
  });

  it("preserves successful readings if a later page fails or lies about its number", async () => {
    for (const response of [null, html(page([row(2)], 1, 2, 2))]) {
      let count = 0;
      const result = await harvestInfoCasas("full", 41.5, { ranges: [{}], fetchPage: async () =>
        ++count === 1 ? html(page([row(1)], 1, 2, 2)) : response });
      expect(result.listings).toHaveLength(1);
      expect(result.note).toContain("1 páginas fallidas");
      expect(result.complete).toBe(false);
    }
  });
});
