// Proves the catalog/classifier machinery can be pointed at a registry other than equipar's own,
// with ZERO behaviour change for equipar itself. This is what lets a second domain (monopatines y
// bicicletas eléctricas, `classes/movilidad/`) reuse the two regimes, the variants, the bands, the
// used/new split and the store snapshot instead of forking them.
import { describe, expect, it } from "vitest";
import { buildBaskets } from "../../classes/equipar/basket";
import { buildEquiparCatalog, uncoveredCategories } from "../../classes/equipar/catalog";
import { categoryFor, equiparSpecs, specsFor } from "../../classes/equipar/classify";
import { EQUIPAR_CATEGORIES } from "../../classes/equipar/registry";
import type { EquiparCategory, EquiparItem } from "../../classes/equipar/types";
import type { RetailListing } from "../../classes/retail/types";

let counter = 0;

function listing(overrides: Partial<RetailListing> & { title: string }): RetailListing {
  counter += 1;
  return {
    listingId: `x:${counter}`,
    source: "store",
    sellerKey: "tienda-test",
    sellerName: "Tienda Test",
    channel: "local-store",
    url: `https://tienda-test.uy/p/${counter}`,
    price: 10_000,
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
    observedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

/** Stands in for a category another domain (e.g. movilidad) would inject. */
const testCategory: EquiparCategory = {
  key: "monopatin-test",
  label: "Monopatín de prueba",
  room: "movilidad",
  tier: "C",
  regime: "commodity",
  reason: "Categoría de prueba para el registro inyectable.",
  usedOk: true,
  variants: [{ key: "unico", label: "Único", fallback: true, rank: 1 }],
  include: /\bmonopatin de prueba\b/,
  storeQueries: ["monopatin de prueba"],
  mlQueries: ["monopatin de prueba"],
  fbQueries: ["monopatin de prueba"],
};

const secondTestCategory: EquiparCategory = {
  ...testCategory,
  key: "bicicleta-test",
  label: "Bicicleta de prueba",
  include: /\bbicicleta de prueba\b/,
  storeQueries: ["bicicleta de prueba"],
  mlQueries: ["bicicleta de prueba"],
  fbQueries: ["bicicleta de prueba"],
};

/** Ten storefront fridges around $30.000 — the same fixture shape as tests/equipar/catalog.test.ts. */
const heladeraListings = (): RetailListing[] =>
  Array.from({ length: 10 }, (_, index) =>
    listing({
      title: `Heladera Samsung RT38K ${290 + index} Lts`,
      brand: "Samsung",
      price: 29_000 + index * 400,
      attributes: { CATEGORY_SPEC: "heladera" },
    })
  );

const testWidgetListings = (): RetailListing[] =>
  Array.from({ length: 9 }, (_, index) =>
    listing({ title: "Monopatin De Prueba modelo X", price: 12_000 + index * 300 })
  );

const testBikeListings = (): RetailListing[] =>
  Array.from({ length: 9 }, (_, index) =>
    listing({ title: "Bicicleta De Prueba modelo Y", price: 20_000 + index * 100 })
  );

describe("registro inyectable del catálogo", () => {
  it("sin registro, buildEquiparCatalog produce exactamente lo mismo que con EQUIPAR_CATEGORIES explícito", () => {
    const listings = heladeraListings();
    const implicito = buildEquiparCatalog({ listings, usdUyu: 40 });
    const explicito = buildEquiparCatalog({ listings, usdUyu: 40, registry: EQUIPAR_CATEGORIES });
    expect(implicito).toEqual(explicito);
    expect(implicito).toHaveLength(1);
    expect(implicito[0]!.category).toBe("heladera");
  });

  it("con un registro propio, clasifica sólo contra ese registro", () => {
    const items = buildEquiparCatalog({ listings: testWidgetListings(), usdUyu: 40, registry: [testCategory] });
    expect(items).toHaveLength(1);
    expect(items[0]!.category).toBe("monopatin-test");
  });

  it("un título de equipar no clasifica contra un registro que no lo incluye", () => {
    const items = buildEquiparCatalog({
      listings: heladeraListings(),
      usdUyu: 40,
      registry: [testCategory],
    });
    expect(items).toHaveLength(0);
  });

  it("un aviso etiquetado CATEGORY_SPEC de una categoría fuera del registro inyectado no entra", () => {
    // La heladera trae la etiqueta que pondría el harvester real contra el registro de equipar, pero
    // acá se clasifica contra el registro de prueba: la etiqueta no debe rescatarla.
    const items = buildEquiparCatalog({
      listings: [...heladeraListings(), ...testWidgetListings()],
      usdUyu: 40,
      registry: [testCategory],
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.category).toBe("monopatin-test");
  });

  it("el rank publicado sale del orden del registro inyectado, no del de equipar", () => {
    const items = buildEquiparCatalog({
      listings: [...testBikeListings(), ...testWidgetListings()],
      usdUyu: 40,
      registry: [secondTestCategory, testCategory], // bicicleta-test antes que monopatin-test
    });
    const bici = items.find((item) => item.category === "bicicleta-test")!;
    const mono = items.find((item) => item.category === "monopatin-test")!;
    expect(bici.rank).toBe(0);
    expect(mono.rank).toBe(1);
  });

  it("specsFor(registry) produce los mismos specs que equiparSpecs() para el registro de equipar", () => {
    const generic = specsFor(EQUIPAR_CATEGORIES);
    const own = equiparSpecs();
    expect(generic.map((spec) => spec.key)).toEqual(own.map((spec) => spec.key));
    expect(generic.map((spec) => ({ ...spec, accept: undefined }))).toEqual(
      own.map((spec) => ({ ...spec, accept: undefined }))
    );
    // No sólo la forma: el comportamiento de `accept` para cada categoría real, contra su propia
    // consulta de MercadoLibre (que matchea) y contra un texto sin relación (que no debería).
    for (const category of EQUIPAR_CATEGORIES) {
      const genericSpec = generic.find((spec) => spec.key === category.key)!;
      const ownSpec = own.find((spec) => spec.key === category.key)!;
      const sampleTitle = category.mlQueries[0]!;
      expect(genericSpec.accept(sampleTitle)).toBe(ownSpec.accept(sampleTitle));
      expect(genericSpec.accept("xyzxyz sin relacion alguna")).toBe(ownSpec.accept("xyzxyz sin relacion alguna"));
    }
  });

  it("categoryFor acepta un registro propio y deja de mirar el de equipar", () => {
    expect(categoryFor("Heladera Samsung No Frost 382 Lts")?.key).toBe("heladera");
    expect(categoryFor("Heladera Samsung No Frost 382 Lts", "", [testCategory])).toBeNull();
    expect(categoryFor("Monopatin De Prueba modelo X", "", [testCategory])?.key).toBe("monopatin-test");
  });

  it("la canasta y el presupuesto de equipar nunca pueden incluir una categoría fuera de EQUIPAR_CATEGORIES", () => {
    // Ítem de un dominio ajeno, con tier S a propósito para intentar colarse en la canasta mínima.
    const foreignItem: EquiparItem = {
      key: "monopatin-test:unico",
      category: "monopatin-test",
      categoryLabel: "Monopatín de prueba",
      variant: "unico",
      variantLabel: "Único",
      room: "movilidad",
      tier: "S",
      rank: 0,
      variantRank: 1,
      image: null,
      regime: "commodity",
      reason: "fixture",
      usedOk: true,
      quantity: 1,
      newBand: { p25: 8_000, median: 10_000, p75: 12_000, min: 7_000, n: 20 },
      usedBand: null,
      usedSavingPct: null,
      products: [],
      offers: [],
      suspectDropped: 0,
      observedAt: "2026-09-17T00:00:00.000Z",
    };
    const baskets = buildBaskets([foreignItem], 40);
    expect(baskets.length).toBeGreaterThan(0);
    for (const basket of baskets) {
      expect(basket.lines.some((line) => line.itemKey.startsWith("monopatin-test"))).toBe(false);
      expect(basket.missing.some((row) => row.itemKey === "monopatin-test")).toBe(false);
    }
  });

  it("uncoveredCategories también acepta un registro inyectado", () => {
    const items = buildEquiparCatalog({
      listings: testWidgetListings(),
      usdUyu: 40,
      registry: [testCategory, secondTestCategory],
    });
    const uncovered = uncoveredCategories(items, [testCategory, secondTestCategory]);
    expect(uncovered).toEqual(["bicicleta-test"]);
  });
});
