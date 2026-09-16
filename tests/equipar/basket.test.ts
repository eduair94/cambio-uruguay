import { describe, expect, it } from "vitest";
import { buildBaskets } from "../../classes/equipar/basket";
import { EQUIPAR_CATEGORIES } from "../../classes/equipar/registry";
import type { EquiparBand, EquiparItem } from "../../classes/equipar/types";

const band = (median: number, n = 12): EquiparBand => ({
  p25: Math.round(median * 0.8),
  median,
  p75: Math.round(median * 1.25),
  min: Math.round(median * 0.6),
  n,
});

/** One priced item for a real category, using its own default variant. */
function itemFor(categoryKey: string, newMedian: number | null, usedMedian: number | null = null): EquiparItem {
  const index = EQUIPAR_CATEGORIES.findIndex((entry) => entry.key === categoryKey);
  const category = EQUIPAR_CATEGORIES[index]!;
  const variant = category.variants.find((entry) => entry.fallback) ?? category.variants[0]!;
  return {
    key: `${category.key}:${variant.key}`,
    category: category.key,
    categoryLabel: category.label,
    variant: variant.key,
    variantLabel: variant.label,
    room: category.room,
    tier: category.tier,
    rank: index,
    variantRank: variant.rank,
    image: null,
    regime: category.regime,
    reason: category.reason,
    usedOk: category.usedOk,
    usedNote: category.usedNote,
    quantity: category.quantity ?? 1,
    newBand: newMedian === null ? null : band(newMedian),
    usedBand: usedMedian === null ? null : band(usedMedian),
    usedSavingPct: null,
    products: [],
    offers: [],
    suspectDropped: 0,
    observedAt: "2026-09-10T00:00:00.000Z",
  };
}

/** Same as {@link itemFor}, for one named variant instead of the default one. */
function itemForVariant(categoryKey: string, variantKey: string, newMedian: number): EquiparItem {
  const category = EQUIPAR_CATEGORIES.find((entry) => entry.key === categoryKey)!;
  const variant = category.variants.find((entry) => entry.key === variantKey);
  if (!variant) throw new Error(`${categoryKey} no tiene la variante ${variantKey}`);
  return {
    ...itemFor(categoryKey, newMedian),
    key: `${category.key}:${variant.key}`,
    variant: variant.key,
    variantLabel: variant.label,
    variantRank: variant.rank,
  };
}

/** Every S category priced, so the "mínima" basket is complete. */
const everyEssential = (): EquiparItem[] =>
  EQUIPAR_CATEGORIES.filter((category) => category.tier === "S").map((category) =>
    itemFor(category.key, 10_000, category.usedOk ? 6_000 : null)
  );

describe("canasta emparejada", () => {
  it("una canasta a la que le falta una categoría S publica el faltante y se declara incompleta", () => {
    // Es la lección del índice de supermercados: un total BAJA por faltarle artículos, y ordenar
    // por "más barato" premia justo al que tiene menos cosas. Un total que se come la heladera en
    // silencio miente hacia abajo.
    const items = everyEssential().filter((item) => item.category !== "heladera");
    const minima = buildBaskets(items, 40)[0]!;

    expect(minima.key).toBe("minima");
    expect(minima.complete).toBe(false);
    expect(minima.missing.map((row) => row.itemKey)).toContain("heladera");
    expect(minima.lines.some((line) => line.itemKey.startsWith("heladera"))).toBe(false);
  });

  it("se declara completa sólo cuando pudo poner precio a todo lo que incluye", () => {
    const minima = buildBaskets(everyEssential(), 40)[0]!;
    expect(minima.missing).toEqual([]);
    expect(minima.complete).toBe(true);
  });

  it("el total es la suma de las líneas, cantidades incluidas", () => {
    const minima = buildBaskets(everyEssential(), 40)[0]!;
    const expected = minima.lines.reduce((sum, line) => sum + line.unitPriceUyu * line.quantity, 0);
    expect(minima.totalUyu).toBe(expected);
    // Dos juegos de sábanas, no uno: se lava uno y se usa el otro.
    const sabanas = minima.lines.find((line) => line.itemKey.startsWith("sabanas"))!;
    expect(sabanas.quantity).toBe(2);
    expect(sabanas.totalUyu).toBe(sabanas.unitPriceUyu * 2);
  });
});

describe("qué precio toma cada canasta", () => {
  it("la mínima compra usado donde el usado es sano", () => {
    const minima = buildBaskets(everyEssential(), 40)[0]!;
    const heladera = minima.lines.find((line) => line.itemKey.startsWith("heladera"))!;
    expect(heladera.condition).toBe("used");
    expect(heladera.unitPriceUyu).toBe(6_000);
  });

  it("la mínima NO compra un colchón usado, aunque sea más barato", () => {
    // La única categoría del catálogo donde la opción barata es el mal consejo.
    const items = everyEssential();
    const minima = buildBaskets(items, 40)[0]!;
    const colchon = minima.lines.find((line) => line.itemKey.startsWith("colchon"))!;
    expect(colchon.condition).toBe("new");
  });

  it("la decente suma el tier A y compra nuevo de entrada de gama; la completa suma el B y va a la mediana", () => {
    const items = [
      ...everyEssential(),
      itemFor("lavarropas", 30_000, 12_000),
      itemFor("tv", 20_000, 9_000),
    ];
    const [, decente, completa] = buildBaskets(items, 40);

    const lavarropasDecente = decente!.lines.find((line) => line.itemKey.startsWith("lavarropas"))!;
    expect(lavarropasDecente.condition).toBe("new");
    expect(lavarropasDecente.unitPriceUyu).toBe(band(30_000).p25);

    const lavarropasCompleta = completa!.lines.find((line) => line.itemKey.startsWith("lavarropas"))!;
    expect(lavarropasCompleta.unitPriceUyu).toBe(30_000);

    // El tier B sólo entra en la completa.
    expect(decente!.lines.some((line) => line.itemKey.startsWith("tv"))).toBe(false);
    expect(completa!.lines.some((line) => line.itemKey.startsWith("tv"))).toBe(true);
  });

  it("usa el precio de usado antes que dejar la línea afuera cuando no hay mercado nuevo", () => {
    const items = everyEssential().map((item) =>
      item.category === "heladera" ? { ...item, newBand: null } : item
    );
    const completa = buildBaskets(items, 40)[2]!;
    const heladera = completa.lines.find((line) => line.itemKey.startsWith("heladera"))!;
    expect(heladera.condition).toBe("used");
    expect(completa.missing.some((row) => row.itemKey === "heladera")).toBe(false);
  });

  it("la completa sigue comprando el split de 12.000 BTU aunque el portátil y el de 9.000 sean más baratos", () => {
    // Sumar "portatil" (rank 1) y "9000" (rank 2) corrió el rank del 12.000 al 3. La canasta no
    // elige la típica por posición sino por la variante marcada `fallback`, así que el 12.000 tiene
    // que seguir siendo esa: si alguien mueve el `fallback`, este test lo dice. Y la mínima no lleva
    // aire acondicionado de ningún tamaño, porque es tier B.
    const aire = [
      itemForVariant("aire-acondicionado", "portatil", 15_000),
      itemForVariant("aire-acondicionado", "9000", 18_000),
      itemForVariant("aire-acondicionado", "12000", 25_000),
      itemForVariant("aire-acondicionado", "18000", 40_000),
    ];
    const [minima, decente, completa] = buildBaskets([...everyEssential(), ...aire], 40);

    const line = completa!.lines.find((entry) => entry.itemKey.startsWith("aire-acondicionado"))!;
    expect(line.itemKey).toBe("aire-acondicionado:12000");
    expect(line.unitPriceUyu).toBe(25_000);
    expect(minima!.lines.some((entry) => entry.itemKey.startsWith("aire-acondicionado"))).toBe(false);
    expect(decente!.lines.some((entry) => entry.itemKey.startsWith("aire-acondicionado"))).toBe(false);
  });

  it("convierte a dólares con la referencia que le pasan", () => {
    const minima = buildBaskets(everyEssential(), 40)[0]!;
    expect(minima.totalUsd).toBe(Math.round(minima.totalUyu / 40));
  });
});
