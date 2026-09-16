import { describe, expect, it } from "vitest";
import { buildEquiparCatalog } from "../../classes/equipar/catalog";
import type { RetailListing } from "../../classes/retail/types";

// Copied from tests/equipar/catalog.test.ts: the helper is not exported there, and Task 4's brief
// says to reuse or copy it rather than change that file's public surface.
let counter = 0;

function listing(overrides: Partial<RetailListing> & { title: string }): RetailListing {
  counter += 1;
  return {
    listingId: `x:${counter}`,
    source: "store",
    sellerKey: "divino",
    sellerName: "Divino",
    channel: "local-store",
    url: `https://divino.com.uy/p/${counter}`,
    price: 30_000,
    currency: "UYU",
    condition: "new",
    available: true,
    image: null,
    brand: "",
    model: "",
    catalogId: null,
    attributes: {},
    rating: null,
    ratingCount: 0,
    location: null,
    freeShipping: null,
    officialStore: true,
    observedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

const CATALOG_ID = "MLU900001";

describe("catálogo: productos agrupados por catalogId de MercadoLibre", () => {
  it("junta tres avisos de ML con el mismo catalogId aunque el título varíe, y suma la tienda por marca+modelo", () => {
    const listings: RetailListing[] = [
      // Tres vendedores de ML del MISMO producto de catálogo. Dos cargaron el atributo de modelo
      // estructurado ("BC-450"); el tercero no, así que identify() lo saca del título y da un texto
      // distinto ("bc-450 frio seco") — la disidencia que la votación por mayoría tiene que superar
      // sin dejar de sumar esa oferta al grupo.
      listing({
        title: "Heladera Panavox BC-450 Frío Seco 338L Blanca",
        source: "mercadolibre",
        sellerKey: "ml:seller-a",
        sellerName: "Vendedor A",
        channel: "marketplace",
        brand: "Panavox",
        model: "BC-450",
        catalogId: CATALOG_ID,
        price: 32_000,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
      listing({
        title: "Heladera Panavox Bc450 338 Litros",
        source: "mercadolibre",
        sellerKey: "ml:seller-b",
        sellerName: "Vendedor B",
        channel: "marketplace",
        brand: "Panavox",
        model: "BC-450",
        catalogId: CATALOG_ID,
        price: 31_500,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
      listing({
        title: "Panavox BC-450 heladera frio seco 338L",
        source: "mercadolibre",
        sellerKey: "ml:seller-c",
        sellerName: "Vendedor C",
        channel: "marketplace",
        brand: "Panavox",
        model: "",
        catalogId: CATALOG_ID,
        price: 33_200,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
      // Una tienda sin catalogId (nunca lo tiene: no es de MercadoLibre). Se suma sólo porque su
      // marca+modelo coincide EXACTO con la identidad ganadora del grupo de catálogo.
      listing({
        title: "Heladera Panavox BC-450 338L",
        brand: "Panavox",
        model: "BC-450",
        price: 30_800,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
    ];

    const [item] = buildEquiparCatalog({ listings, usdUyu: 40 });
    expect(item!.key).toBe("heladera:grande");
    expect(item!.products).toHaveLength(1);
    const [product] = item!.products;
    expect(product!.sellers).toBe(4);
    expect(product!.offers).toHaveLength(4);
    const prices = product!.offers.map((offer) => offer.priceUyu);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("nunca junta dos catalogId distintos aunque el título sea idéntico, y desambigua el slug", () => {
    const listings: RetailListing[] = [
      listing({
        title: "Heladera Zafiro ZF-500 400L",
        source: "mercadolibre",
        sellerKey: "ml:seller-x",
        sellerName: "Vendedor X",
        channel: "marketplace",
        brand: "Zafiro",
        model: "ZF-500",
        catalogId: "MLU111111",
        price: 40_000,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
      listing({
        title: "Heladera Zafiro ZF-500 400L",
        source: "mercadolibre",
        sellerKey: "ml:seller-y",
        sellerName: "Vendedor Y",
        channel: "marketplace",
        brand: "Zafiro",
        model: "ZF-500",
        catalogId: "MLU222222",
        price: 41_000,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
      // Sin catalogId, misma marca+modelo que AMBOS grupos de catálogo votaron. Sólo puede sumarse a
      // uno: el índice es "first-wins", así que tiene que terminar en MLU111111 (el primero en
      // reclamar esa identidad), nunca en MLU222222.
      listing({
        title: "Heladera Zafiro ZF-500 400 Litros",
        brand: "Zafiro",
        model: "ZF-500",
        price: 39_500,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
    ];

    const [item] = buildEquiparCatalog({ listings, usdUyu: 40 });
    const zafiro = item!.products.filter((product) => product.brand === "zafiro");
    expect(zafiro).toHaveLength(2);

    // Dos catalogId distintos votando la misma marca+modelo no pueden compartir slug: una página de
    // producto o un JSON-LD posterior lo usa como identificador único.
    const slugs = zafiro.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(2);
    expect(slugs).toContain("heladera-zafiro-zf-500");
    expect(slugs).toContain("heladera-zafiro-zf-500-222222");

    const joined = zafiro.find((product) => product.sellers === 2);
    const untouched = zafiro.find((product) => product.sellers === 1);
    expect(joined).toBeDefined();
    expect(untouched).toBeDefined();
    expect(joined!.offers).toHaveLength(2);
    expect(untouched!.offers).toHaveLength(1);
    expect(joined!.offers.some((offer) => offer.seller === "Divino")).toBe(true);
  });

  it("nombra el grupo por marca cuando ningún aviso del catalogId identifica marca+modelo, sin publicar el placeholder", () => {
    const listings: RetailListing[] = [
      listing({
        title: "Heladera con freezer 338 litros blanca",
        source: "mercadolibre",
        sellerKey: "ml:seller-d",
        sellerName: "Vendedor D",
        channel: "marketplace",
        brand: "Sin marca",
        catalogId: "MLU333333",
        price: 29_000,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
      listing({
        title: "Heladera con freezer 338 litros",
        source: "mercadolibre",
        sellerKey: "ml:seller-e",
        sellerName: "Vendedor E",
        channel: "marketplace",
        brand: "Sin marca",
        catalogId: "MLU333333",
        price: 28_500,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
    ];

    const [item] = buildEquiparCatalog({ listings, usdUyu: 40 });
    const product = item!.products.find((candidate) => candidate.sellers === 2);
    expect(product).toBeDefined();
    expect(product!.offers).toHaveLength(2);
    // "Sin marca" es un placeholder (NOT_A_BRAND), igual que en identify(): no puede aparecer en lo
    // que se publica. El nombre queda sólo con lo que salió del título.
    expect(product!.brand).toBe("");
    expect(product!.name.toLowerCase()).not.toContain("sin marca");
    expect(product!.slug).not.toContain("sin-marca");
  });

  it("no publica un grupo de catalogo cuyo nombre queda vacio, pero sus avisos siguen contando para el precio", () => {
    const listings: RetailListing[] = [
      listing({
        title: "Heladera",
        source: "mercadolibre",
        sellerKey: "ml:seller-f",
        sellerName: "Vendedor F",
        channel: "marketplace",
        brand: "",
        catalogId: "MLU444444",
        price: 27_000,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
      listing({
        title: "Heladera",
        source: "mercadolibre",
        sellerKey: "ml:seller-g",
        sellerName: "Vendedor G",
        channel: "marketplace",
        brand: "",
        catalogId: "MLU444444",
        price: 26_500,
        attributes: { CATEGORY_SPEC: "heladera" },
      }),
    ];

    const [item] = buildEquiparCatalog({ listings, usdUyu: 40 });
    // Sin marca y sin nada útil en el título (sólo queda la palabra de la categoría, que se recorta):
    // no hay nombre que publicar como producto.
    expect(item!.products).toHaveLength(0);
    // Pero los avisos no se pierden: siguen contando para el precio de la fila.
    expect(item!.offers.length).toBeGreaterThan(0);
  });
});
