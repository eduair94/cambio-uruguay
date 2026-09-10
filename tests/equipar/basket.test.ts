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

  it("convierte a dólares con la referencia que le pasan", () => {
    const minima = buildBaskets(everyEssential(), 40)[0]!;
    expect(minima.totalUsd).toBe(Math.round(minima.totalUyu / 40));
  });
});
