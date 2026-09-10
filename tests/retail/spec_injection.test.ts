import { afterEach, describe, expect, it, vi } from "vitest";
import { harvestWooStore } from "../../classes/retail/sources/woocommerce";
import { harvestFacebookMarketplace } from "../../classes/retail/sources/facebook";
import type { CategorySpec, RetailStore } from "../../classes/retail/types";

/**
 * The point of `classes/retail` is that the category is injected, so one sweep of a storefront can
 * serve several consumers. These tests hold that property: an adapter must classify with the specs
 * it was handed and must never fall back to a category of its own.
 */
const store: RetailStore = {
  key: "tienda",
  name: "Tienda",
  baseUrl: "https://tienda.uy",
  adapter: "woocommerce",
  channel: "local-store",
  expectCurrency: "UYU",
  enabled: true,
};

const spec = (key: string, needle: RegExp, queries: string[]): CategorySpec => ({
  key,
  accept: (title) => needle.test(title.toLowerCase()),
  storeQueries: queries,
  fbQueries: queries,
});

const wooProduct = (id: number, name: string): unknown => ({
  id,
  name,
  permalink: `https://tienda.uy/p/${id}`,
  is_in_stock: true,
  prices: { price: "199000", currency_code: "UYU", currency_minor_unit: 2 },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("una barrida, varios clasificadores", () => {
  it("reparte los productos de una sola respuesta entre las specs que los reclaman", async () => {
    const bodies: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        bodies.push(url);
        // La tienda contesta lo mismo para cualquier término: lo que importa es quién reclama qué.
        return new Response(JSON.stringify([wooProduct(1, "Heladera Samsung 300L"), wooProduct(2, "Olla de acero 20 cm")]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      })
    );

    const result = await harvestWooStore(store, [
      spec("heladera", /heladera/, ["heladera"]),
      spec("olla", /olla/, ["olla"]),
    ]);

    const claimed = result.listings.map((row) => row.attributes.CATEGORY_SPEC).sort();
    expect(claimed).toEqual(["heladera", "olla"]);
    // Cada término es una búsqueda; los productos se clasifican todos contra todas las specs.
    expect(bodies.length).toBeGreaterThanOrEqual(2);
  });

  it("no acepta nada cuando ninguna spec lo reclama", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify([wooProduct(3, "Cortadora de cesped")]), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
      )
    );

    const result = await harvestWooStore(store, [spec("heladera", /heladera/, ["heladera"])]);
    expect(result.listings).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it("no busca nada en una tienda para la que no le dieron términos", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await harvestWooStore(store, [{ key: "sin-terminos", accept: () => true }]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});

describe("presupuesto de Marketplace", () => {
  const respondEmpty = (): void => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true, results: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
      )
    );
  };

  it("intercala las categorías, así un corte le cuesta a cada una su cola", async () => {
    respondEmpty();
    const specs = [
      spec("heladera", /heladera/, ["heladera", "heladera con freezer"]),
      spec("olla", /olla/, ["ollas", "juego de ollas"]),
    ];
    const result = await harvestFacebookMarketplace(specs, 2);
    const searched = (globalThis.fetch as unknown as { mock: { calls: string[][] } }).mock.calls.map(
      (call) => decodeURIComponent(String(call[0]))
    );
    expect(searched).toHaveLength(2);
    // Con presupuesto para 2, entra la primera consulta de CADA categoría, no las dos de la primera.
    expect(searched[0]).toContain("q=heladera");
    expect(searched[1]).toContain("q=ollas");
    expect(result.note).toContain("fuera de presupuesto");
  });
});
