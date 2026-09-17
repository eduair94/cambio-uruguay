import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchJson = vi.fn();
vi.mock("../../classes/rentals/net", () => ({ fetchJson: (...args: unknown[]) => fetchJson(...args) }));

import {
  carSearchUrl, drainTasks, harvestMercadoLibreCars, pageMatches, toRawCar, type MLCarCard, type MLCarPage,
} from "../../classes/autos/sources/mercadolibre";

function card(id: string, overrides: Record<string, string> = {}): { polycard: MLCarCard } {
  const params = new URLSearchParams({
    title: "Chevrolet Onix 1.4 Ltz Mt 98cv", primary_attribute: "2015 | 140000 km", price: "7990.0", currency_id: "USD",
    condition: "Usado", seller_id: "188917387", picture: "http://http2.mlstatic.com/D_NQ_NP_2X_1-MLU1-V.webp",
    permalink: `https://auto.mercadolibre.com.uy/MLU-${id.slice(3)}-chevrolet-onix-_JM`, ...overrides,
  });
  return {
    polycard: {
      metadata: { id, category_id: "MLU1744", url_params: `?${params}` },
      pictures: { quantity: 15 },
      components: [
        { type: "price", price: { current_price: { value: Number(params.get("price")), currency: params.get("currency_id") || "USD" } } },
        { type: "labels", labels: { labels: [{ text: "{icon_kilometers} 140.000 Km" }, { text: "{icon_transmission} Manual" }, { text: "{icon_fuel_type} Nafta" }] } },
        { type: "location", location: { text: "{icon_location} Prado, MO • Concesionaria" } },
      ],
    },
  };
}

function page(options: { offset: number; total: number; applied: Record<string, string>; cards?: unknown[]; facets?: Record<string, Array<{ id: string; name: string; results: number }>> }): MLCarPage {
  const applied = { ITEM_CONDITION: "2230581", ...options.applied };
  return {
    paging: { total: options.total, offset: options.offset },
    filters: Object.entries(applied).map(([id, value]) => ({ id, values: [{ id: value }] })),
    available_filters: Object.entries(options.facets || {}).map(([id, values]) => ({ id, values })),
    components: options.cards || [],
  };
}

const context = { brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix", observedAt: "2026-09-16T10:00:00.000Z", maxYear: 2027 };

describe("toRawCar", () => {
  it("reads a used-car polycard", () => {
    expect(toRawCar(card("MLU700434767").polycard, context)).toEqual({
      id: "MLU700434767", source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix",
      title: "Chevrolet Onix 1.4 Ltz Mt 98cv", year: 2015, km: 140000, price: 7990, currency: "USD",
      transmission: "manual", fuel: "nafta", neighborhood: "Prado", department: "Montevideo", sellerType: "dealer",
      sellerId: "188917387", picture: "https://http2.mlstatic.com/D_NQ_NP_2X_1-MLU1-V.webp", pictureCount: 15,
      permalink: "https://auto.mercadolibre.com.uy/MLU-700434767-chevrolet-onix-_JM", observedAt: "2026-09-16T10:00:00.000Z",
    });
  });
  it("rejects ads, new cars, other categories, odd currencies and foreign links", () => {
    const pad = card("MLU1000001").polycard;
    expect(toRawCar({ ...pad, metadata: { ...pad.metadata, is_pad: "true" } }, context)).toBeNull();
    expect(toRawCar(card("MLU1000002", { condition: "Nuevo" }).polycard, context)).toBeNull();
    const rental = card("MLU1000003").polycard;
    expect(toRawCar({ ...rental, metadata: { ...rental.metadata, category_id: "MLU1473" } }, context)).toBeNull();
    const eur = card("MLU1000004", { currency_id: "EUR" }).polycard;
    eur.components = eur.components!.filter(part => part.type !== "price");
    expect(toRawCar(eur, context)).toBeNull();
    expect(toRawCar(card("MLU1000005", { permalink: "https://evil.example/MLU-1" }).polycard, context)).toBeNull();
    expect(toRawCar({ metadata: { id: "MLU1000006", category_id: "MLU1744" } }, context)).toBeNull();
  });
  it("never keeps a picture from another host", () => {
    expect(toRawCar(card("MLU1000007", { picture: "https://tracker.example/p.jpg" }).polycard, context)?.picture).toBeNull();
  });
});

describe("pageMatches", () => {
  it("rejects a page whose offset was reset or whose partition filter was dropped", () => {
    expect(pageMatches(page({ offset: 20, total: 50, applied: { BRAND: "1" } }), { BRAND: "1" }, 20)).toBe(true);
    expect(pageMatches(page({ offset: 0, total: 50, applied: { BRAND: "1" } }), { BRAND: "1" }, 20)).toBe(false);
    expect(pageMatches(page({ offset: 0, total: 50, applied: {} }), { BRAND: "1" }, 0)).toBe(false);
  });
  it("builds the bridge URL with the used-car category", () => {
    const url = new URL(carSearchUrl({ BRAND: "1", since: "today" }, 40, "http://bridge/mercadolibre"));
    expect(url.pathname).toBe("/mercadolibre/search");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      country: "UY", q: "autos", category: "MLU1744", "q.category": "MLU1744", ITEM_CONDITION: "2230581",
      raw: "true", limit: "20", BRAND: "1", since: "today", offset: "40",
    });
  });
});

describe("drainTasks", () => {
  it("keeps processing the queue after a task throws and reports it via onError", async () => {
    const errors: unknown[] = [];
    let secondRan = false;
    await drainTasks(
      [
        async () => { throw new Error("boom"); },
        async () => { secondRan = true; return []; },
      ],
      1,
      error => { errors.push(error); },
    );
    expect(secondRan).toBe(true);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("boom");
  });
});

describe("harvestMercadoLibreCars", () => {
  // Block body on purpose: `mockReset()` returns the mock itself (chainable), and an arrow with an
  // implicit return hands that function BACK to Vitest's beforeEach — which treats a returned
  // function as an auto-teardown and invokes it with zero args after the test, i.e. `fetchJson(undefined)`.
  // That crashes any test whose `route()` doesn't guard `new URL(undefined)`. Braces avoid the implicit return.
  beforeEach(() => { fetchJson.mockReset(); });

  function route(url: string): MLCarPage | null {
    const params = new URL(url).searchParams;
    const offset = Number(params.get("offset"));
    const brand = params.get("BRAND");
    const model = params.get("MODEL");
    if (!brand) return page({ offset, total: 25, applied: {}, facets: { BRAND: [{ id: "58955", name: "Chevrolet", results: 25 }] } });
    if (!model) {
      return page({ offset, total: 25, applied: { BRAND: brand }, facets: {
        MODEL: [{ id: "123123", name: "Onix", results: 22 }, { id: "999", name: "Spark", results: 3 }],
      } });
    }
    if (model === "123123") {
      const ids = offset === 0 ? Array.from({ length: 20 }, (_, i) => `MLU70000${100 + i}`) : ["MLU70000200", "MLU70000201"];
      return page({ offset, total: 22, applied: { BRAND: brand, MODEL: model }, cards: ids.map(id => card(id)),
        facets: offset === 0 ? { SHORT_VERSION: [{ id: "1", name: "Ltz", results: 9 }, { id: "2", name: "Joy", results: 5 }] } : {} });
    }
    return page({ offset, total: 3, applied: { BRAND: brand, MODEL: model }, cards: ["MLU80000001", "MLU80000002", "MLU80000003"].map(id => card(id)) });
  }

  it("walks brand -> model, assigns brand/model from the applied filters and keeps the version vocabulary", async () => {
    fetchJson.mockImplementation(async (url: string) => route(url));
    const result = await harvestMercadoLibreCars({ mode: "full", maxRequests: 100, maxDurationMs: 60_000, concurrency: 3, apiBase: "http://bridge/mercadolibre" });
    expect(result.listings).toHaveLength(25);
    expect(result.listings.find(l => l.id === "MLU80000001")).toMatchObject({ brand: "Chevrolet", model: "Spark", modelId: "999" });
    expect(result.vocabularies).toContainEqual({ brandId: "58955", modelId: "123123", trims: ["Joy", "Ltz"] });
    expect(result).toMatchObject({ failedPages: 0, completeBrands: ["58955"], reportedTotal: 25, gaps: [], note: null, requests: 5 });
  });

  it("marks the brand incomplete when a page comes back reset", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      if (params.get("MODEL") === "123123" && params.get("offset") === "20") return route(url.replace("offset=20", "offset=0"));
      return route(url);
    });
    const result = await harvestMercadoLibreCars({ mode: "full", maxRequests: 100, maxDurationMs: 60_000, concurrency: 1, apiBase: "http://bridge/mercadolibre" });
    expect(result.failedPages).toBe(1);
    expect(result.completeBrands).toEqual([]);
    expect(result.note).toMatch(/páginas sin respuesta/);
  });

  it("stops at the request budget and says so", async () => {
    fetchJson.mockImplementation(async (url: string) => route(url));
    const result = await harvestMercadoLibreCars({ mode: "full", maxRequests: 2, maxDurationMs: 60_000, concurrency: 1, apiBase: "http://bridge/mercadolibre" });
    expect(result.requests).toBe(2);
    expect(result.completeBrands).toEqual([]);
    expect(result.note).toMatch(/presupuesto/);
  });

  it("reports an unreachable bridge", async () => {
    fetchJson.mockResolvedValue(null);
    const result = await harvestMercadoLibreCars({ mode: "fast", maxRequests: 10, maxDurationMs: 60_000, concurrency: 2, apiBase: "http://bridge/mercadolibre" });
    expect(result.listings).toEqual([]);
    expect(result.note).toMatch(/no respondió/);
    expect(fetchJson.mock.calls[0]![0]).toContain("since=today");
  });

  it("empties completeBrands and reports the error when a model task throws after a successful read", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      if (params.get("MODEL") === "999") {
        // Spark's page reads fine (pageMatches only looks at paging/filters) but blows up the moment
        // `accept()` reaches into `components` — the same shape a bad upstream payload could produce.
        const brokenPage = route(url) as MLCarPage;
        Object.defineProperty(brokenPage, "components", { get() { throw new Error("boom"); } });
        return brokenPage;
      }
      return route(url);
    });
    const result = await harvestMercadoLibreCars({ mode: "full", maxRequests: 100, maxDurationMs: 60_000, concurrency: 1, apiBase: "http://bridge/mercadolibre" });
    expect(result.completeBrands).toEqual([]);
    expect(result.note).toMatch(/error inesperado/);
    expect(result.listings.some(l => l.model === "Onix")).toBe(true);
    expect(result.listings.some(l => l.model === "Spark")).toBe(false);
  });
});
