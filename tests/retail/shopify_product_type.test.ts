// classes/retail/sources/shopify.ts: RetailStore.productTypeInTitle (fix round 1, movilidad).
//
// Some Shopify storefronts (voltbike, loopbikes) only ever say what a product IS in Shopify's own
// `product_type` field, never in the product's own title ("SuperVolt", not "Bicicleta Eléctrica
// SuperVolt"). Since `matchesCategory()` tests a category's `include` against the title alone, those
// listings are invisible to any category no matter the regex — unless the adapter composes the title
// itself, opt-in per store via this flag. These tests hold the adapter contract directly, independent
// of classes/movilidad/registry.ts (see tests/movilidad/registry.test.ts for the composed-title
// fixtures against the real monopatín/bicicleta categories).
import { afterEach, describe, expect, it, vi } from "vitest";
import { harvestShopifyStore, titleWithType } from "../../classes/retail/sources/shopify";
import type { CategorySpec, RetailStore } from "../../classes/retail/types";

const baseStore: RetailStore = {
  key: "tienda",
  name: "Tienda",
  baseUrl: "https://tienda.uy",
  adapter: "shopify",
  channel: "local-store",
  expectCurrency: "USD",
  enabled: true,
};

const shopifyProduct = (overrides: Record<string, unknown>): unknown => ({
  id: 1,
  handle: "producto",
  title: "SuperVolt",
  vendor: "",
  product_type: "",
  tags: [],
  variants: [{ price: "1590.00", available: true }],
  images: [],
  ...overrides,
});

/** Only accepts a title that says "bicicleta" immediately followed by "eléctrica"/"electrica" —
 * mirrors the adjacency `BICICLETA_INCLUDE` in classes/movilidad/registry.ts requires, without
 * importing that module (this test is about the adapter, not that registry). */
const bicicletaElectricaSpec: CategorySpec = {
  key: "bicicleta-electrica",
  accept: (title: string) =>
    /\bbicicletas? electric[ao]s?\b/.test(
      title
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
    ),
};

/** Accepts everything, so a test can inspect exactly what title/attributes a listing carries without
 * the classification gate being the thing under test. */
const anySpec: CategorySpec = { key: "cualquiera", accept: () => true };

function mockShopifyFetch(products: unknown[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/products.json")) {
        const page = Number(new URL(url).searchParams.get("page") || "1");
        return new Response(JSON.stringify({ products: page === 1 ? products : [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      // detectShopifyCurrency reads the storefront's own homepage HTML.
      return new Response('<script>Shopify.currency = {"active":"USD"};</script>', {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("productTypeInTitle: apagado por defecto", () => {
  it("no cambia el título ni la clasificación de una tienda sin el flag (covercompany, armo, grassi...)", async () => {
    mockShopifyFetch([shopifyProduct({ title: "SuperVolt", product_type: "Bicicleta Eléctrica" })]);
    const result = await harvestShopifyStore(baseStore, [bicicletaElectricaSpec]);
    // Sin el flag, "SuperVolt" solo nunca dice "bicicleta electrica": la spec la rechaza, igual que en
    // producción hoy para covercompany/armo/grassi.
    expect(result.listings).toHaveLength(0);
  });

  it("con una spec permisiva, el título publicado es exactamente el original, sin tocar", async () => {
    mockShopifyFetch([shopifyProduct({ title: "SuperVolt", product_type: "Bicicleta Eléctrica" })]);
    const result = await harvestShopifyStore(baseStore, [anySpec]);
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]!.title).toBe("SuperVolt");
  });
});

describe("productTypeInTitle: encendido", () => {
  const flagged: RetailStore = { ...baseStore, productTypeInTitle: true };

  it("compone product_type + título para clasificar y publicar", async () => {
    mockShopifyFetch([shopifyProduct({ title: "SuperVolt", product_type: "Bicicleta Eléctrica" })]);
    const result = await harvestShopifyStore(flagged, [bicicletaElectricaSpec]);
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]!.title).toBe("Bicicleta Eléctrica SuperVolt");
    expect(result.listings[0]!.attributes.CATEGORY_SPEC).toBe("bicicleta-electrica");
  });

  it("no duplica el tipo cuando el título ya lo dice", async () => {
    mockShopifyFetch([shopifyProduct({ title: "Bicicleta Eléctrica Muche", product_type: "Bicicleta Eléctrica" })]);
    const result = await harvestShopifyStore(flagged, [anySpec]);
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]!.title).toBe("Bicicleta Eléctrica Muche");
  });

  it("un product_type vacío deja el título como está", async () => {
    mockShopifyFetch([shopifyProduct({ title: "SuperVolt", product_type: "" })]);
    const result = await harvestShopifyStore(flagged, [anySpec]);
    expect(result.listings[0]!.title).toBe("SuperVolt");
  });

  it("otra tienda con el flag apagado en la misma corrida no se ve afectada (el flag es por tienda)", async () => {
    mockShopifyFetch([shopifyProduct({ title: "SuperVolt", product_type: "Bicicleta Eléctrica" })]);
    const unflagged = await harvestShopifyStore(baseStore, [anySpec]);
    expect(unflagged.listings[0]!.title).toBe("SuperVolt");
  });
});

describe("titleWithType (unidad, sin red)", () => {
  it("antepone el tipo cuando el flag está activo y el título no lo dice", () => {
    expect(titleWithType({ productTypeInTitle: true }, { product_type: "Motopatín Eléctrico" }, "Monopatin Air")).toBe(
      "Motopatín Eléctrico Monopatin Air"
    );
  });

  it("deja el título igual si el flag está apagado", () => {
    expect(titleWithType({ productTypeInTitle: false }, { product_type: "Motopatín Eléctrico" }, "Monopatin Air")).toBe(
      "Monopatin Air"
    );
  });

  it("deja el título igual si no hay product_type", () => {
    expect(titleWithType({ productTypeInTitle: true }, { product_type: undefined }, "Monopatin Air")).toBe("Monopatin Air");
  });

  it("no duplica el tipo ignorando mayúsculas y acentos", () => {
    expect(titleWithType({ productTypeInTitle: true }, { product_type: "bicicleta electrica" }, "Bicicleta Eléctrica Muche")).toBe(
      "Bicicleta Eléctrica Muche"
    );
  });
});
