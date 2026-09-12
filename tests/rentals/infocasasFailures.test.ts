// Why an InfoCasas page failed, and a second chance for the ranges the portal did not answer.
//
// 2026-09-12 04:52 UTC: all five price ranges failed on page 1 and the run published InfoCasas as
// "respuesta incompleta o distinta" — the same words a layout change would have produced. The same
// URLs parsed perfectly that afternoon: the portal had simply not answered, and nothing retried it,
// so 14,480 adverts went a day without being read.
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchText = vi.hoisted(() => vi.fn());
vi.mock("../../classes/rentals/net", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../classes/rentals/net");
  return { ...actual, fetchText };
});

import { harvestInfoCasas, infoCasasPageUrl, type InfoCasasPriceRange } from "../../classes/rentals/sources/infocasas";

const row = (id: number, price = 12_000) => ({
  id, title: "Alquiler apartamento en Paso de la Arena", link: `/apartamento/${id}`,
  description: `Precio ${price}. Se alquila apartamento de un dormitorio.`,
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

afterEach(() => fetchText.mockReset());

describe("InfoCasas says why a page failed", () => {
  it("names a portal that did not answer, with the transport reason", async () => {
    fetchText.mockImplementation(async (_url: string, options: { onFailure?: (reason: string) => void }) => {
      options.onFailure?.("HTTP 403");
      return null;
    });
    const result = await harvestInfoCasas("full", 41.5, { ranges: [{}], retryDelaysMs: [] });
    expect(result.ok).toBe(false);
    expect(result.note).toContain("búsqueda 1, página 1: sin respuesta del portal (HTTP 403)");
  });

  it.each([
    ["a challenge page without the search payload", "<html><title>Just a moment...</title></html>", "página sin datos de búsqueda"],
    ["a payload whose search block changed shape", html({ props: { pageProps: { fetchResult: { search: {} } } } }), "formato de búsqueda distinto"],
    ["a different search than the one requested", html(page([row(1)])), "respuesta de otra búsqueda"],
    ["an empty page that still promises more", html(page([], 1, 2, 21, { max: 13_000 })), "página vacía a mitad de la búsqueda"],
  ])("tells apart %s", async (_label, body, expected) => {
    const result = await harvestInfoCasas("full", 41.5, {
      ranges: [{ max: 13_000 }], retryDelaysMs: [], fetchPage: async () => body,
    });
    expect(result.note).toContain(`búsqueda 1, página 1: ${expected}`);
    expect(result.note).not.toContain("sin respuesta");
  });
});

describe("InfoCasas retries the ranges the portal did not answer", () => {
  it("reads the other ranges first, then retries the silent one", async () => {
    const calls: string[] = [];
    let silent = true;
    const result = await harvestInfoCasas("full", 41.5, {
      ranges: [{ max: 13_000 }, { min: 13_000, max: 25_000 }], retryDelaysMs: [0],
      fetchPage: async url => {
        calls.push(url);
        const cheap = url.includes("/alquiler/hasta-13000");
        if (cheap && silent) { silent = false; return null; }
        return html(cheap ? page([row(1)], 1, 1, 1, { max: 13_000 })
          : page([row(2, 20_000)], 1, 1, 1, { min: 13_000, max: 25_000 }));
      },
    });
    expect(calls).toEqual([
      infoCasasPageUrl(1, { max: 13_000 }),
      infoCasasPageUrl(1, { min: 13_000, max: 25_000 }),
      infoCasasPageUrl(1, { max: 13_000 }),
    ]);
    expect(result.listings.map(item => item.listingId).sort()).toEqual(["infocasas:1", "infocasas:2"]);
    expect(result.note).toContain("2 búsquedas terminadas");
    expect(result.note).toContain("1 páginas recuperadas en reintento");
    expect(result.note).not.toContain("páginas fallidas");
  });

  it("resumes a half-read range at the page that failed, keeping what it had read", async () => {
    const calls: string[] = [];
    let silent = true;
    const result = await harvestInfoCasas("full", 41.5, {
      ranges: [{}], retryDelaysMs: [0],
      fetchPage: async url => {
        calls.push(url);
        const second = url.includes("pagina2");
        if (second && silent) { silent = false; return null; }
        return html(second ? page([row(2)], 2, 2, 2) : page([row(1)], 1, 2, 2));
      },
    });
    expect(calls).toEqual([infoCasasPageUrl(1), infoCasasPageUrl(2), infoCasasPageUrl(2)]);
    expect(result.listings).toHaveLength(2);
    expect(result.note).toContain("1 búsquedas terminadas");
    // Both IDs count toward the range: losing page 1's reading on resume would flag omitted IDs.
    expect(result.note).not.toContain("omitió IDs");
  });

  it("gives up after its rounds and still reports the failure", async () => {
    let calls = 0;
    const result = await harvestInfoCasas("full", 41.5, {
      ranges: [{}], retryDelaysMs: [0, 0], fetchPage: async () => { calls++; return null; },
    });
    expect(calls).toBe(3);
    expect(result.ok).toBe(false);
    expect(result.note).toContain("1 páginas fallidas");
    expect(result.note).toContain("sin respuesta del portal");
  });

  it("does not retry a page that answered with another search: waiting cannot fix it", async () => {
    let calls = 0;
    const result = await harvestInfoCasas("full", 41.5, {
      ranges: [{ max: 13_000 }], retryDelaysMs: [0, 0], fetchPage: async () => { calls++; return html(page([row(1)])); },
    });
    expect(calls).toBe(1);
    expect(result.note).toContain("1 páginas fallidas");
  });

  it("does not wait past its time budget for a retry", async () => {
    let calls = 0;
    const started = Date.now();
    const result = await harvestInfoCasas("full", 41.5, {
      ranges: [{}], retryDelaysMs: [60_000], maxDurationMs: 30_000,
      fetchPage: async () => { calls++; return null; },
    });
    expect(calls).toBe(1);
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(result.note).toContain("1 páginas fallidas");
  });

  it("the hourly feed does not wait to retry", async () => {
    let calls = 0;
    await harvestInfoCasas("fast", 41.5, { fetchPage: async () => { calls++; return null; } });
    expect(calls).toBe(1);
  });
});
