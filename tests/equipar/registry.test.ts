import { describe, expect, it } from "vitest";
import { EQUIPAR_CATEGORIES, NOT_A_PRODUCT, TIER_LABEL } from "../../classes/equipar/registry";
import { equiparSpecs } from "../../classes/equipar/classify";

/**
 * The registry is data, and data with no test rots quietly: a category added without a fallback
 * variant silently drops every listing that does not state a size, and a tier with no reason
 * publishes a letter with nothing behind it.
 */
describe("registro de categorías", () => {
  it("no repite claves", () => {
    const keys = EQUIPAR_CATEGORIES.map((category) => category.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("toda categoría declara exactamente una variante por defecto", () => {
    for (const category of EQUIPAR_CATEGORIES) {
      const fallbacks = category.variants.filter((variant) => variant.fallback);
      expect(fallbacks.length, `${category.key} tiene ${fallbacks.length} variantes por defecto`).toBe(1);
    }
  });

  it("toda categoría explica por qué está en su tier", () => {
    for (const category of EQUIPAR_CATEGORIES) {
      expect(TIER_LABEL[category.tier], `${category.key} tiene un tier desconocido`).toBeTruthy();
      // Un tier sin motivo escrito es una opinión con una letra adelante.
      expect(category.reason.length, `${category.key} no explica su tier`).toBeGreaterThan(40);
    }
  });

  it("toda categoría trae consultas para las tres fuentes que las necesitan", () => {
    for (const category of EQUIPAR_CATEGORIES) {
      expect(category.storeQueries.length, `${category.key} sin storeQueries`).toBeGreaterThan(0);
      expect(category.mlQueries.length, `${category.key} sin mlQueries`).toBeGreaterThan(0);
      expect(category.fbQueries.length, `${category.key} sin fbQueries`).toBeGreaterThan(0);
    }
  });

  it("las variantes no repiten clave dentro de una categoría", () => {
    for (const category of EQUIPAR_CATEGORIES) {
      const keys = category.variants.map((variant) => variant.key);
      expect(new Set(keys).size, `${category.key} repite una variante`).toBe(keys.length);
    }
  });

  it("el colchón es la única categoría donde el usado se desaconseja con motivo", () => {
    const colchon = EQUIPAR_CATEGORIES.find((category) => category.key === "colchon")!;
    expect(colchon.usedOk).toBe(false);
    expect(colchon.usedNote).toMatch(/chinche|acaro|ácaro/i);
  });

  it("las specs salen en el orden del registro, que es el orden del presupuesto", () => {
    const specs = equiparSpecs();
    expect(specs.map((spec) => spec.key)).toEqual(EQUIPAR_CATEGORIES.map((category) => category.key));
    // Lo caro primero: un corte de presupuesto tiene que costarle la cola barata, no la heladera.
    expect(specs[0]!.key).toBe("heladera");
  });

  it("el filtro de accesorios saca repuestos, fundas y publicaciones rotas", () => {
    for (const title of [
      "funda para sofa 3 cuerpos",
      "filtro de repuesto aspiradora",
      "heladera no funciona para repuesto",
      "goma de puerta heladera",
      "control remoto aire acondicionado",
    ]) {
      expect(NOT_A_PRODUCT.test(title), title).toBe(true);
    }
  });
});
