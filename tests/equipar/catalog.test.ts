import { describe, expect, it } from "vitest";
import { buildEquiparCatalog, uncoveredCategories } from "../../classes/equipar/catalog";
import type { RetailListing } from "../../classes/retail/types";

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

/** Ten storefront fridges around $30.000, enough to clear the band floor. */
const newFridges = (): RetailListing[] =>
  Array.from({ length: 10 }, (_, index) =>
    listing({
      title: `Heladera Samsung RT38K ${290 + index} Lts`,
      brand: "Samsung",
      price: 29_000 + index * 400,
      attributes: { CATEGORY_SPEC: "heladera" },
    })
  );

/** Six Marketplace fridges, which is what a used market actually looks like. */
const usedFridges = (): RetailListing[] =>
  Array.from({ length: 6 }, (_, index) =>
    listing({
      title: "Heladera funcionando impecable",
      source: "facebook",
      sellerKey: "facebook",
      sellerName: "Facebook Marketplace",
      channel: "classifieds",
      condition: "used",
      price: 11_000 + index * 500,
      attributes: { CATEGORY_SPEC: "heladera" },
    })
  );

describe("catálogo", () => {
  it("mantiene nuevo y usado en dos bandas, nunca promediados", () => {
    const [item] = buildEquiparCatalog({ listings: [...newFridges(), ...usedFridges()], usdUyu: 40 });
    expect(item!.newBand!.n).toBe(10);
    expect(item!.usedBand!.n).toBe(6);
    // Si se hubieran mezclado, la mediana "nueva" caería muy por debajo de los $30.000 reales.
    expect(item!.newBand!.median).toBeGreaterThan(28_000);
    expect(item!.usedBand!.median).toBeLessThan(15_000);
    expect(item!.usedSavingPct).toBeGreaterThan(50);
  });

  it("no arma un producto con un aviso de Marketplace", () => {
    // "Heladera funcionando impecable" no identifica nada. Fusionar por ese texto pondría dos
    // heladeras distintas en la misma fila.
    const [item] = buildEquiparCatalog({ listings: [...newFridges(), ...usedFridges()], usdUyu: 40 });
    const sources = item!.products.flatMap((product) => product.offers.map((offer) => offer.source));
    expect(sources).not.toContain("facebook");
    expect(item!.products.length).toBeGreaterThan(0);
  });

  it("no arma un producto cuando la marca no identifica a nadie", () => {
    const generics = Array.from({ length: 10 }, (_, index) =>
      listing({
        title: "Heladera con freezer 300 litros",
        brand: "Sin marca",
        price: 29_000 + index * 400,
        attributes: { CATEGORY_SPEC: "heladera" },
      })
    );
    const [item] = buildEquiparCatalog({ listings: generics, usdUyu: 40 });
    expect(item!.products).toHaveLength(0);
    // Pero el precio sigue contando: se pierde la fila de producto, no la estadística.
    expect(item!.newBand!.n).toBe(10);
  });

  it("convierte los precios en dólares a pesos para que las filas se puedan comparar", () => {
    const usd = Array.from({ length: 10 }, (_, index) =>
      listing({
        title: `Heladera Whirlpool WRM${index} 280 Lts`,
        brand: "Whirlpool",
        currency: "USD",
        price: 700 + index * 10,
        attributes: { CATEGORY_SPEC: "heladera" },
      })
    );
    const [item] = buildEquiparCatalog({ listings: usd, usdUyu: 40 });
    expect(item!.newBand!.median).toBeGreaterThan(28_000);
  });

  it("separa las variantes en filas distintas: un frigobar no es una side by side", () => {
    const items = buildEquiparCatalog({
      listings: [
        ...newFridges(),
        ...Array.from({ length: 10 }, (_, index) =>
          listing({
            title: `Frigobar Consul CRC08 ${80 + index} Lts`,
            brand: "Consul",
            price: 11_000 + index * 200,
            attributes: { CATEGORY_SPEC: "heladera" },
          })
        ),
      ],
      usdUyu: 40,
    });
    const keys = items.map((item) => item.key);
    expect(keys).toContain("heladera:frigobar");
    expect(keys).toContain("heladera:media");
  });

  it("declara las categorías que no produjeron nada, en vez de esconderlas", () => {
    const items = buildEquiparCatalog({ listings: newFridges(), usdUyu: 40 });
    const uncovered = uncoveredCategories(items);
    expect(uncovered).not.toContain("heladera");
    expect(uncovered).toContain("colchon");
    expect(uncovered.length).toBeGreaterThan(30);
  });
});
