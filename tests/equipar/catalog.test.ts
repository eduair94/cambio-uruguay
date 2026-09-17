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

  it("guarda los usados más baratos aunque la variante tenga ocho nuevos o más", () => {
    // La lista era nuevo-primero con un único slice(0, 8). Una banda nueva exige 8 nuevos, así que
    // toda variante con precio nuevo llegaba a la página sin un solo usado.
    const [item] = buildEquiparCatalog({
      listings: [...newFridges(), ...usedFridges().slice(0, 3)],
      usdUyu: 40,
    });
    const conditions = item!.offers.map((offer) => offer.condition);
    expect(conditions.filter((condition) => condition === "new")).toHaveLength(8);
    expect(conditions.filter((condition) => condition === "used")).toHaveLength(3);
    // Nuevos primero, y cada mercado ordenado del más barato al más caro.
    expect(conditions.slice(0, 8).every((condition) => condition === "new")).toBe(true);
    for (const condition of ["new", "used"] as const) {
      const prices = item!.offers.filter((offer) => offer.condition === condition).map((offer) => offer.priceUyu);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    }
    // Los ocho nuevos son los ocho más baratos de los diez.
    expect(Math.max(...item!.offers.filter((offer) => offer.condition === "new").map((offer) => offer.priceUyu))).toBe(
      29_000 + 7 * 400
    );
  });

  it("corta los usados en los seis más baratos", () => {
    const manyUsed = Array.from({ length: 9 }, (_, index) =>
      listing({
        title: "Heladera funcionando impecable",
        source: "facebook",
        sellerKey: "facebook",
        sellerName: "Facebook Marketplace",
        channel: "classifieds",
        condition: "used",
        price: 12_000 + index * 300,
        attributes: { CATEGORY_SPEC: "heladera" },
      })
    );
    const [item] = buildEquiparCatalog({ listings: [...newFridges(), ...manyUsed], usdUyu: 40 });
    const used = item!.offers.filter((offer) => offer.condition === "used").map((offer) => offer.priceUyu);
    expect(used).toEqual([12_000, 12_300, 12_600, 12_900, 13_200, 13_500]);
    expect(item!.offers).toHaveLength(14);
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

  it("no deja que una variante sin precio encabece su categoría", () => {
    // Medido en la primera corrida de producción: ordenar variantes alfabéticamente puso una
    // "Heladera / Frigobar" vacía en el primer renglón de "sin esto la casa no funciona", y listó
    // el calefón como 100 L, 50 L, 80 L. Una fila que no puede decir nada no encabeza.
    const items = buildEquiparCatalog({
      listings: [
        ...newFridges(),
        // Un frigobar con un solo aviso: no llega al piso de muestra, así que no tendrá banda.
        listing({
          title: "Frigobar Consul 90 Lts",
          brand: "Consul",
          price: 11_000,
          attributes: { CATEGORY_SPEC: "heladera" },
        }),
      ],
      usdUyu: 40,
    });
    expect(items[0]!.variant).toBe("media");
    expect(items[0]!.newBand).not.toBeNull();
    expect(items[items.length - 1]!.variant).toBe("frigobar");
    expect(items[items.length - 1]!.newBand).toBeNull();
  });

  it("ordena las variantes por tamaño, no por alfabeto", () => {
    const sizes = ["50", "80", "100"];
    const listings = sizes.flatMap(size =>
      Array.from({ length: 10 }, (_, index) =>
        listing({
          title: `Calefón Rheem ${size} litros`,
          brand: "Rheem",
          price: Number(size) * 100 + index * 50,
          attributes: { CATEGORY_SPEC: "calefon" },
        })
      )
    );
    const items = buildEquiparCatalog({ listings, usdUyu: 40 });
    expect(items.map(item => item.variant)).toEqual(["50l", "80l", "100l"]);
  });

  it("le pone una foto a la fila, y nunca una de Marketplace", () => {
    const items = buildEquiparCatalog({
      listings: [
        ...newFridges().map((row, index) =>
          index === 5 ? { ...row, image: "https://tienda.uy/heladera.jpg" } : row
        ),
        ...usedFridges().map(row => ({ ...row, image: "https://scontent.fb/expira-en-dias.jpg" })),
      ],
      usdUyu: 40,
    });
    const withPhoto = items.find(item => item.image);
    expect(withPhoto?.image).toBe("https://tienda.uy/heladera.jpg");
    // Una foto de Marketplace es la cocina del vendedor y su URL caduca: la tarjeta se rompería.
    expect(items.every(item => !item.image?.includes("scontent"))).toBe(true);
  });

  it("declara las categorías que no produjeron nada, en vez de esconderlas", () => {
    const items = buildEquiparCatalog({ listings: newFridges(), usdUyu: 40 });
    const uncovered = uncoveredCategories(items);
    expect(uncovered).not.toContain("heladera");
    expect(uncovered).toContain("colchon");
    expect(uncovered.length).toBeGreaterThan(30);
  });
});
