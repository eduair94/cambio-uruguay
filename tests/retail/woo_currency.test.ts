import { afterEach, describe, expect, it, vi } from "vitest";

// net.ts reads its per-host gap at import time; 40 stubbed searches at 350 ms would time the test out.
vi.hoisted(() => {
  process.env.RETAIL_HOST_GAP_MS = "0";
});

import { harvestWooStore, wooDisplayedPrice, wooPricing } from "../../classes/retail/sources/woocommerce";
import { harvestRetail } from "../../classes/retail/harvest";
import type { CategorySpec, RetailStore } from "../../classes/retail/types";

// Fixtures copied from the live Store APIs on 2026-09-16.
//
// TYT declares `currency_code: "UYU"` on EVERY product, but its own storefront renders 149 of 515
// products in dollars. `currency_minor_unit: 2` is true for both: "20500" is USD 205,00 and
// "960000" is UYU 9.600,00. The rendered `price_html` travels in the same response, and its amount
// matched `price / 100` on 515 of 515 products (sale prices included).
const amount = (symbol: string, text: string): string =>
  `<span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">${symbol}</span>&nbsp;${text}</span>`;

const TYT = {
  qled85: { price: "229900", html: amount("USD", "2.299,00") },
  enxuta60: { price: "960000", html: amount("UYU", "9.600,00") },
  telefunken: { price: "487900", html: amount("UYU", "4.879,00") },
  tenx2160: { price: "20500", html: amount("USD", "205,00") },
};

const tytPrices = (price: string) => ({
  price,
  regular_price: price,
  currency_code: "UYU",
  currency_minor_unit: 2,
});

describe("precio mostrado por la tienda (price_html)", () => {
  it("lee moneda e importe del precio que la tienda dibuja", () => {
    expect(wooDisplayedPrice(TYT.tenx2160.html)).toEqual({ currency: "USD", amount: 205 });
    expect(wooDisplayedPrice(TYT.telefunken.html)).toEqual({ currency: "UYU", amount: 4879 });
  });

  it("en una oferta toma el precio actual (<ins>), no el tachado", () => {
    // americanmesh.com.uy, "SILLA CAJERO 1320".
    const sale =
      '<del aria-hidden="true"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">U$S </span>&nbsp;320,00</span></del> <span class="screen-reader-text">El precio original era: U$S &nbsp;320,00.</span><ins aria-hidden="true"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">U$S </span>&nbsp;279,00</span></ins>';
    expect(wooDisplayedPrice(sale)).toEqual({ currency: "USD", amount: 279 });
    // ufficio.com.uy escribe el importe en formato inglés.
    const ufficio =
      '<del aria-hidden="true"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">USD </span>1,086.00</span></del> <ins aria-hidden="true"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">USD </span>702.72</span></ins>';
    expect(wooDisplayedPrice(ufficio)).toEqual({ currency: "USD", amount: 702.72 });
  });

  it("no inventa una moneda cuando el símbolo es ambiguo o no hay precio", () => {
    // puntounion.com.uy dibuja "$", que en Uruguay es el peso pero no lo dice.
    expect(wooDisplayedPrice(amount("&#036;", "2.200"))).toBeNull();
    expect(wooDisplayedPrice("")).toBeNull();
  });
});

describe("precio y moneda de un producto WooCommerce", () => {
  it("TYT: la moneda sale del precio mostrado cuando contradice a currency_code, con el importe en centavos", () => {
    expect(wooPricing({ prices: tytPrices(TYT.qled85.price), price_html: TYT.qled85.html })).toEqual({
      price: 2299,
      currency: "USD",
      listPrice: null,
      currencyFromDisplay: true,
    });
    expect(wooPricing({ prices: tytPrices(TYT.tenx2160.price), price_html: TYT.tenx2160.html })).toMatchObject({
      price: 205,
      currency: "USD",
      currencyFromDisplay: true,
    });
  });

  it("TYT: los que ya estaban en pesos quedan en pesos, divididos por su unidad menor", () => {
    expect(wooPricing({ prices: tytPrices(TYT.enxuta60.price), price_html: TYT.enxuta60.html })).toMatchObject({
      price: 9600,
      currency: "UYU",
      currencyFromDisplay: false,
    });
    expect(wooPricing({ prices: tytPrices(TYT.telefunken.price), price_html: TYT.telefunken.html })).toMatchObject({
      price: 4879,
      currency: "UYU",
    });
  });

  it("si la moneda mostrada contradice a la API y el importe tampoco coincide, no se adivina: se descarta", () => {
    expect(wooPricing({ prices: tytPrices("20500"), price_html: amount("USD", "999,00") })).toEqual({
      dropped: "precio mostrado distinto",
    });
  });

  it("sin símbolo claro, o con la misma moneda, manda la API tal como antes", () => {
    // prontometal.com.uy muestra "U$S 89 + IVA" contra un price de 113: misma moneda, no se toca.
    expect(
      wooPricing({
        prices: { price: "113", regular_price: "113", currency_code: "USD", currency_minor_unit: 0 },
        price_html:
          '<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">U$S</span>89</bdi></span> + IVA',
      })
    ).toMatchObject({ price: 113, currency: "USD", currencyFromDisplay: false });
    expect(
      wooPricing({
        prices: { price: "2200", regular_price: "2200", currency_code: "UYU", currency_minor_unit: 0 },
        price_html: amount("&#036;", "2.200"),
      })
    ).toMatchObject({ price: 2200, currency: "UYU", currencyFromDisplay: false });
  });

  // Si el tema de TYT mueve el símbolo detrás del importe, o el importe deja de leerse, la moneda
  // mostrada sigue diciendo dólares pero no hay número que la confirme. Caer a la moneda de la API
  // publicaría 149 productos en dólares como pesos, 40 veces más baratos: se descartan.
  it("símbolo después del importe con U$S contra una API en UYU: se descarta, no cae a pesos", () => {
    const symbolAfter =
      '<span class="woocommerce-Price-amount amount"><bdi>2.299,00&nbsp;<span class="woocommerce-Price-currencySymbol">U$S</span></bdi></span>';
    expect(wooDisplayedPrice(symbolAfter)).toEqual({ currency: "USD", amount: null });
    expect(wooPricing({ prices: tytPrices(TYT.qled85.price), price_html: symbolAfter })).toEqual({
      dropped: "moneda mostrada sin importe legible",
    });
  });

  it("importe ilegible con U$S contra una API en UYU: se descarta", () => {
    const unreadable = amount("U$S", "consultar");
    expect(wooDisplayedPrice(unreadable)).toEqual({ currency: "USD", amount: null });
    expect(wooPricing({ prices: tytPrices("20500"), price_html: unreadable })).toEqual({
      dropped: "moneda mostrada sin importe legible",
    });
  });

  it("importe ilegible pero la misma moneda que la API: se queda con el precio de la API", () => {
    const sameCurrency =
      '<span class="woocommerce-Price-amount amount"><bdi>9.600,00&nbsp;<span class="woocommerce-Price-currencySymbol">UYU</span></bdi></span>';
    expect(wooPricing({ prices: tytPrices(TYT.enxuta60.price), price_html: sameCurrency })).toEqual({
      price: 9600,
      currency: "UYU",
      listPrice: null,
      currencyFromDisplay: false,
    });
  });

  it("el precio tachado usa la misma unidad y la misma moneda que el precio", () => {
    expect(
      wooPricing({
        prices: { price: "20500", regular_price: "25000", currency_code: "UYU", currency_minor_unit: 2 },
        price_html: TYT.tenx2160.html,
      })
    ).toEqual({ price: 205, currency: "USD", listPrice: 250, currencyFromDisplay: true });
  });
});

const tyt: RetailStore = {
  key: "tyt",
  name: "TYT",
  baseUrl: "https://tyt.com.uy",
  adapter: "woocommerce",
  channel: "local-store",
  expectCurrency: "UYU",
  enabled: true,
};

const product = (id: number, name: string, price: string, html: string): unknown => ({
  id,
  name,
  permalink: `https://tyt.com.uy/producto/${id}/`,
  is_in_stock: true,
  prices: tytPrices(price),
  price_html: html,
});

const everything = (key: string, queries: string[]): CategorySpec => ({
  key,
  accept: () => true,
  storeQueries: queries,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("la barrida de TYT publica la moneda que la tienda muestra", () => {
  it("dólares como dólares, pesos como pesos, y cuenta lo corregido y lo descartado en la nota", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              product(1, "Smart Tv Samsung Qled 85 4k", TYT.qled85.price, TYT.qled85.html),
              product(2, "Termotanque Calefon Enxuta 60 Lts", TYT.enxuta60.price, TYT.enxuta60.html),
              product(3, "Calefon Enxuta Tenx2160 roto", "20500", amount("USD", "999,00")),
            ]),
            { status: 200 }
          )
      )
    );
    const result = await harvestWooStore(tyt, [everything("todo", ["tv"])]);
    const byTitle = new Map(result.listings.map((row) => [row.title, row]));
    expect(byTitle.get("Smart Tv Samsung Qled 85 4k")).toMatchObject({ price: 2299, currency: "USD" });
    expect(byTitle.get("Termotanque Calefon Enxuta 60 Lts")).toMatchObject({ price: 9600, currency: "UYU" });
    expect(byTitle.has("Calefon Enxuta Tenx2160 roto")).toBe(false);
    expect(result.note).toContain("1 con la moneda del precio mostrado");
    expect(result.note).toContain("1 descartados (precio mostrado distinto: Calefon Enxuta Tenx2160 roto)");
  });
});

describe("tope de búsquedas por tienda", () => {
  const manyQueries = Array.from({ length: 40 }, (_, i) => `termino${i}`);
  const searchedTerms = (fetchMock: ReturnType<typeof vi.fn>): string[] =>
    fetchMock.mock.calls
      .map(([url]) => new URL(String(url)).searchParams.get("search"))
      .filter((term): term is string => Boolean(term));

  const emptyStore = (): ReturnType<typeof vi.fn> => {
    const fetchMock = vi.fn(async () => new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("sin opción usa el tope por defecto (24), que es lo que ven las sillas", async () => {
    const fetchMock = emptyStore();
    await harvestWooStore(tyt, [everything("todo", manyQueries)]);
    expect(searchedTerms(fetchMock)).toHaveLength(24);
  });

  it("VTEX respeta el mismo tope cuando se lo pasan", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("/api/catalog_system/")
        ? new Response("[]", { status: 200 })
        : new Response('<html>"culture":{"currency":"UYU"}</html>', { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { harvestVtexStore } = await import("../../classes/retail/sources/vtex");
    const eldorado: RetailStore = { ...tyt, key: "eldorado", baseUrl: "https://www.eldorado.com.uy", adapter: "vtex" };
    await harvestVtexStore(eldorado, [everything("todo", manyQueries)], { maxQueries: 33 });
    const terms = fetchMock.mock.calls
      .map(([url]) => new URL(String(url)).searchParams.get("ft"))
      .filter((term): term is string => Boolean(term));
    expect(terms).toHaveLength(33);
  });

  it("harvestRetail pasa maxStoreQueries al adaptador de la tienda", async () => {
    const fetchMock = emptyStore();
    await harvestRetail({
      stores: [tyt],
      specs: [everything("todo", manyQueries)],
      maxMlScans: 0,
      maxFbQueries: 0,
      maxStoreQueries: 40,
    });
    expect(searchedTerms(fetchMock)).toHaveLength(40);
  });
});
