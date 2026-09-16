// Task 5: presence in the site's own price catalogues (equipar-casa + desk chairs). `catalogPresence`
// is pure and tested directly against narrow "Like" fixtures shaped like the real Mongoose documents
// (see classes/models/EquiparItem.ts / classes/models/ChairCatalogProduct.ts and classes/equipar/types.ts
// / classes/chairs/types.ts for the field names this was built against) — never a real database, the
// same convention tests/stores/reddit.test.ts and tests/stores/google.test.ts use for their pure
// halves. `loadCatalogPresence` (the `.find().select().lean()` loader) is exercised only by the sync
// job in production; a unit test would need a live Mongo connection, which this suite must not touch.
import { describe, expect, it } from "vitest";
import { catalogPresence, type EquiparLikeItem, type ChairLikeProduct } from "../../classes/stores/signals/catalog";

const CHECKED_AT = "2026-09-16T00:00:00.000Z";

function equiparItem(overrides: Partial<EquiparLikeItem> = {}): EquiparLikeItem {
  return {
    category: "aire-acondicionado",
    categoryLabel: "Aire acondicionado",
    offers: [],
    products: [],
    lastSeen: "2026-09-15",
    ...overrides,
  };
}

function chairProduct(overrides: Partial<ChairLikeProduct> = {}): ChairLikeProduct {
  return {
    offers: [],
    lastSeen: "2026-09-15",
    ...overrides,
  };
}

describe("catalogPresence", () => {
  it("matches the task-5 brief scenario: TuShopuy in equipar, Expansión UY in chairs, Mercado Libre excluded", () => {
    const equipar = [
      equiparItem({
        category: "aire-acondicionado",
        categoryLabel: "Aire acondicionado",
        offers: [
          { seller: "TuShopuy", url: "https://tushop.uy/aire-12000" },
          { seller: "Mercado Libre", url: "https://articulo.mercadolibre.com.uy/aire-ml-1" },
        ],
      }),
    ];
    const chairs = [
      chairProduct({
        offers: [{ seller: "Expansión UY", sellerKey: "expansionuy", url: "https://expansionuy.com/silla-1" }],
      }),
    ];

    const result = catalogPresence({ equipar, chairs }, CHECKED_AT);

    expect(result.get("tushop")).toEqual({
      offers: 1,
      verticals: [{ key: "equipar:aire-acondicionado", label: "Aire acondicionado", url: "/equipar-casa-uruguay", offers: 1 }],
      checkedAt: CHECKED_AT,
    });
    expect(result.get("expansion-uy")).toEqual({
      offers: 1,
      verticals: [{ key: "sillas", label: "Sillas de escritorio", url: "/sillas-escritorio-uruguay", offers: 1 }],
      checkedAt: CHECKED_AT,
    });
    // "Mercado Libre" is the platform's own fulfillment label, never a store — see classes/stores/match.ts.
    expect(result.has("mercado-libre")).toBe(false);
  });

  it("never attributes anything to the literal seller label 'Mercado Libre'", () => {
    const equipar = [
      equiparItem({
        offers: [{ seller: "Mercado Libre", url: "https://articulo.mercadolibre.com.uy/x" }],
      }),
    ];
    const result = catalogPresence({ equipar, chairs: [] }, CHECKED_AT);
    expect(result.size).toBe(0);
  });

  it("counts an offer once when the same url appears in both offers[] and products[].offers[]", () => {
    const equipar = [
      equiparItem({
        offers: [{ seller: "TuShopuy", url: "https://tushop.uy/aire-12000" }],
        products: [
          {
            offers: [
              { seller: "TuShopuy", url: "https://tushop.uy/aire-12000" }, // same url: same offer
              { seller: "TuShopuy", url: "https://tushop.uy/aire-12000-v2" }, // distinct url: a second offer
            ],
          },
        ],
      }),
    ];
    const result = catalogPresence({ equipar, chairs: [] }, CHECKED_AT);
    expect(result.get("tushop")!.offers).toBe(2);
    expect(result.get("tushop")!.verticals[0]!.offers).toBe(2);
  });

  it("excludes an equipar item whose lastSeen is more than 7 days before checkedAt", () => {
    const equipar = [
      equiparItem({
        lastSeen: "2026-09-08", // 8 days before 2026-09-16: stale
        offers: [{ seller: "TuShopuy", url: "https://tushop.uy/aire-viejo" }],
      }),
    ];
    const result = catalogPresence({ equipar, chairs: [] }, CHECKED_AT);
    expect(result.has("tushop")).toBe(false);
  });

  it("keeps an equipar item whose lastSeen is exactly 7 days before checkedAt", () => {
    const equipar = [
      equiparItem({
        lastSeen: "2026-09-09", // exactly 7 days before 2026-09-16: still fresh
        offers: [{ seller: "TuShopuy", url: "https://tushop.uy/aire-limite" }],
      }),
    ];
    const result = catalogPresence({ equipar, chairs: [] }, CHECKED_AT);
    expect(result.has("tushop")).toBe(true);
  });

  it("excludes a chair product whose lastSeen is more than 7 days before checkedAt", () => {
    const chairs = [
      chairProduct({
        lastSeen: "2026-09-01",
        offers: [{ seller: "Expansión UY", url: "https://expansionuy.com/silla-vieja" }],
      }),
    ];
    const result = catalogPresence({ equipar: [], chairs }, CHECKED_AT);
    expect(result.has("expansion-uy")).toBe(false);
  });

  it("returns an empty map for empty input", () => {
    const result = catalogPresence({ equipar: [], chairs: [] }, CHECKED_AT);
    expect(result.size).toBe(0);
  });

  it("ignores an offer from a seller that resolves to no curated store", () => {
    const equipar = [equiparItem({ offers: [{ seller: "Vendedor desconocido", url: "https://x.uy/1" }] })];
    const result = catalogPresence({ equipar, chairs: [] }, CHECKED_AT);
    expect(result.size).toBe(0);
  });

  it("aggregates two different equipar categories for the same store under two verticals", () => {
    const equipar = [
      equiparItem({
        category: "aire-acondicionado",
        categoryLabel: "Aire acondicionado",
        offers: [{ seller: "TuShopuy", url: "https://tushop.uy/aire" }],
      }),
      equiparItem({
        category: "heladera",
        categoryLabel: "Heladera",
        offers: [{ seller: "TuShopuy", url: "https://tushop.uy/heladera" }],
      }),
    ];
    const result = catalogPresence({ equipar, chairs: [] }, CHECKED_AT);
    const signal = result.get("tushop")!;
    expect(signal.offers).toBe(2);
    expect(signal.verticals).toEqual([
      { key: "equipar:aire-acondicionado", label: "Aire acondicionado", url: "/equipar-casa-uruguay", offers: 1 },
      { key: "equipar:heladera", label: "Heladera", url: "/equipar-casa-uruguay", offers: 1 },
    ]);
  });

  it("resolves a chair offer by sellerKey when the seller display name has no matching alias", () => {
    // storeKeyForSeller falls back to StoreEntry.retailStoreKey via sellerKey when the alias lookup misses.
    const chairs = [chairProduct({ offers: [{ seller: "Bertoni SA", sellerKey: "bertoni", url: "https://bertoni.com.uy/silla" }] })];
    const result = catalogPresence({ equipar: [], chairs }, CHECKED_AT);
    expect(result.get("bertoni")!.offers).toBe(1);
  });

  it("stamps every returned signal with the given checkedAt", () => {
    const equipar = [equiparItem({ offers: [{ seller: "TuShopuy", url: "https://tushop.uy/x" }] })];
    const result = catalogPresence({ equipar, chairs: [] }, CHECKED_AT);
    expect(result.get("tushop")!.checkedAt).toBe(CHECKED_AT);
  });
});
