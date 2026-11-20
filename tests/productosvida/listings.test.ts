import { describe, expect, it } from "vitest";
import { buildEquiparCatalog } from "../../classes/equipar/catalog";
import { buildEquiparListings } from "../../classes/equipar/listings";
import { PRODUCTOS_VIDA_CATEGORIES } from "../../classes/productosvida/registry";
import { SAMPLE_USD_UYU, sampleListings } from "./sample";

// The listing rows (v2 material) and the catalogue come out of the SAME injected registry, so a row
// stored here is a row the band counted there. Fed with the real sample, no network.
describe("buildEquiparListings con el registro de productos que te cambian la vida", () => {
  const listings = sampleListings();
  const built = buildEquiparListings({ listings, usdUyu: SAMPLE_USD_UYU, registry: PRODUCTOS_VIDA_CATEGORIES });

  it("pone cada título real en su categoría y su variante, en la sala de esta página", () => {
    const byTitle = new Map(built.rows.map((row) => [row.title, row]));
    expect(byTitle.get("Lavavajillas Negro 8c Midea Wqp8-3802gb")).toMatchObject({
      category: "lavavajillas",
      variant: "compacto",
      room: "productos-vida",
      tier: "B",
      source: "mercadolibre",
      condition: "new",
    });
    expect(byTitle.get("Calienta Cama 1 Plaza Futura Fut-cc105 Lavable")).toMatchObject({
      category: "calientacama",
      variant: "una-plaza",
      variantLabel: "Bajo la sábana, 1 plaza",
      rank: 0,
    });
    expect(byTitle.get("Amazon Kindle Paperwhite 7 2024 12 Gen 16 Gb Color Negro")).toMatchObject({
      category: "kindle",
      variant: "paperwhite",
      // 0-based registry position: the Kindle is 19th of 26 once the pan sits with the single mentions.
      rank: 18,
    });
    for (const row of built.rows) {
      expect(row.room).toBe("productos-vida");
      expect(PRODUCTOS_VIDA_CATEGORIES.some((category) => category.key === row.category)).toBe(true);
    }
  });

  it("todas las categorías tienen filas y precio nuevo con la muestra real", () => {
    const categories = new Set(built.rows.map((row) => row.category));
    expect(categories.size).toBe(26);
    const items = buildEquiparCatalog({ listings, usdUyu: SAMPLE_USD_UYU, registry: PRODUCTOS_VIDA_CATEGORIES });
    const banded = new Set(items.filter((item) => item.newBand).map((item) => item.category));
    expect(banded.size).toBe(26);
  });

  it("cada fila contada por la banda tiene su ítem en el catálogo", () => {
    const items = buildEquiparCatalog({ listings, usdUyu: SAMPLE_USD_UYU, registry: PRODUCTOS_VIDA_CATEGORIES });
    const keys = new Set(items.map((item) => item.key));
    for (const row of built.rows) expect(keys.has(`${row.category}:${row.variant}`), row.title).toBe(true);
  });
});
