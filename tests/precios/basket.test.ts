import { describe, expect, it } from "vitest";
import {
  BASKET_ITEMS,
  BASKET_PINNED_AT,
  BASKET_VERSION,
  groupBaskets,
  indexDecision,
  MIN_COVERAGE,
  storeBasket,
} from "../../classes/precios/basket";

const row = (articleId: number, price: number, over: Partial<any> = {}) => ({
  articleId,
  storeId: 1,
  declarationId: articleId,
  price,
  sourceDay: "2026-09-07",
  storeName: "Local 1",
  address: "x",
  lat: -34.8,
  lon: -56.1,
  verdict: "ok" as const,
  freshness: "fresh" as const,
  ...over,
});

describe("la canasta esta pinneada", () => {
  it("tiene version, fecha de pinneo y una lista fija de articulos", () => {
    expect(BASKET_VERSION).toBe(1);
    expect(BASKET_PINNED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(BASKET_ITEMS.length).toBeGreaterThanOrEqual(15);
    // Pinneada = ids concretos, no una regla que se recalcula sola cada dia.
    BASKET_ITEMS.forEach((item) => {
      expect(Number.isInteger(item.articleId)).toBe(true);
      expect(item.qty).toBeGreaterThan(0);
    });
  });

  it("no repite un articulo ni una necesidad", () => {
    expect(new Set(BASKET_ITEMS.map((item) => item.articleId)).size).toBe(BASKET_ITEMS.length);
    expect(new Set(BASKET_ITEMS.map((item) => item.need)).size).toBe(BASKET_ITEMS.length);
  });
});

const MEDIANS = new Map(BASKET_ITEMS.map((item) => [item.articleId, 100]));

describe("storeBasket", () => {
  const full = BASKET_ITEMS.map((item) => row(item.articleId, 100));

  it("cuesta la suma de precio x cantidad, con cobertura 1", () => {
    const result = storeBasket(full, MEDIANS);
    const expected = BASKET_ITEMS.reduce((sum, item) => sum + 100 * item.qty, 0);
    expect(result.cost).toBeCloseTo(expected, 5);
    expect(result.coverage).toBe(1);
    expect(result.qualified).toBe(true);
    expect(result.ratio).toBeCloseTo(1, 5);
  });

  it("el total baja por FALTAR articulos, y por eso no se ordena por total", () => {
    // Medido el 2026-09-07 sobre 211 locales calificados: correlacion entre
    // cobertura y total crudo 0,842, y de los diez mas baratos por total solo
    // UNO sigue estando entre los diez mas baratos por canasta emparejada.
    const scarce = full.slice(0, Math.ceil(BASKET_ITEMS.length * 0.75));
    const scarceResult = storeBasket(scarce, MEDIANS);
    const fullResult = storeBasket(full, MEDIANS);

    // Mismo precio en cada articulo: el local escaso NO es mas barato.
    expect(scarceResult.cost).toBeLessThan(fullResult.cost);
    // Y el ratio, que es con lo que se ordena, los deja empatados.
    expect(scarceResult.ratio).toBeCloseTo(fullResult.ratio as number, 5);
  });

  it("un local caro tiene ratio mayor que uno barato con la misma cobertura", () => {
    const cheap = storeBasket(BASKET_ITEMS.map((item) => row(item.articleId, 80)), MEDIANS);
    const dear = storeBasket(BASKET_ITEMS.map((item) => row(item.articleId, 120)), MEDIANS);
    expect(cheap.ratio).toBeCloseTo(0.8, 5);
    expect(dear.ratio).toBeCloseTo(1.2, 5);
  });

  it("sin medianas no hay ratio, y sin ratio no se ordena", () => {
    expect(storeBasket(full).ratio).toBeNull();
  });

  it("un local que declara la mitad de la canasta NO se rankea", () => {
    // Es exactamente el error del comparador oficial: imputa lo que falta y
    // publica un total que parece comparable.
    const half = full.slice(0, Math.floor(BASKET_ITEMS.length / 2));
    const result = storeBasket(half, MEDIANS);
    expect(result.coverage).toBeLessThan(MIN_COVERAGE);
    expect(result.qualified).toBe(false);
  });

  it("no cuenta filas stale ni suspect como cobertura", () => {
    const tainted = full.map((r, i) => (i % 2 ? { ...r, freshness: "stale" as const } : r));
    expect(storeBasket(tainted, MEDIANS).coverage).toBeLessThan(1);
    const suspicious = full.map((r, i) => (i % 2 ? { ...r, verdict: "suspect" as const } : r));
    expect(storeBasket(suspicious, MEDIANS).coverage).toBeLessThan(1);
  });

  it("ignora articulos que no son de la canasta", () => {
    const result = storeBasket([...full, row(999_999, 10_000)], MEDIANS);
    const expected = BASKET_ITEMS.reduce((sum, item) => sum + 100 * item.qty, 0);
    expect(result.cost).toBeCloseTo(expected, 5);
  });
});

describe("groupBaskets", () => {
  const qualified = (n: number) => Array.from({ length: n }, () => ({ scope: "Artigas", ratio: 1.05, qualified: true }));

  it("un departamento con menos de 5 locales calificados no tiene ranking", () => {
    // Medido: Artigas tiene 2 locales en todo el catalogo, Treinta y Tres 5.
    const [group] = groupBaskets(qualified(2));
    expect(group.qualified).toBe(false);
    expect(group.note).toMatch(/insuficiente/i);
  });

  it("con 5 o mas, publica la mediana", () => {
    const [group] = groupBaskets(qualified(5));
    expect(group.qualified).toBe(true);
    expect(group.median).toBeCloseTo(1.05, 5);
    expect(group.stores).toBe(5);
  });

  it("los locales sin cobertura no entran al calculo", () => {
    const mixed = [...qualified(5), { scope: "Artigas", ratio: 0.1, qualified: false }];
    const [group] = groupBaskets(mixed);
    expect(group.stores).toBe(5);
    expect(group.median).toBeCloseTo(1.05, 5);
  });
});

describe("indexDecision", () => {
  it("no publica variacion cuando cambio la composicion de la canasta", () => {
    const decision = indexDecision({ version: 2, qualifiedStores: 400 }, { version: 1, qualifiedStores: 400 });
    expect(decision.publish).toBe(false);
    expect(decision.reason).toMatch(/versi/i);
  });

  it("no publica variacion cuando se cayo la cobertura", () => {
    const decision = indexDecision({ version: 1, qualifiedStores: 250 }, { version: 1, qualifiedStores: 400 });
    expect(decision.publish).toBe(false);
    expect(decision.reason).toMatch(/cobertura|locales/i);
  });

  it("publica cuando la canasta y la cobertura se sostienen", () => {
    expect(indexDecision({ version: 1, qualifiedStores: 395 }, { version: 1, qualifiedStores: 400 }).publish).toBe(true);
  });

  it("el primer dia publica nivel, sin variacion previa", () => {
    expect(indexDecision({ version: 1, qualifiedStores: 400 }, null).publish).toBe(true);
  });
});
