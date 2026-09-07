import { describe, expect, it } from "vitest";
import { haversineKm, withinPlausibleRange } from "../../classes/precios/geo";
import { cheapestRankable, coverageNote, ratioNote, whyNotRankable } from "../../classes/precios/present";

const row = (over: Partial<any> = {}) => ({
  storeId: 1,
  storeName: "Local",
  price: 100,
  sourceDay: "2026-09-07",
  freshness: "fresh" as const,
  verdict: "ok" as const,
  ...over,
});

describe("haversineKm", () => {
  it("mide la distancia entre dos puntos de Montevideo", () => {
    const km = haversineKm({ lat: -34.9011, lon: -56.1645 }, { lat: -34.8721, lon: -56.1668 });
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(4);
  });

  it("un punto contra si mismo mide cero", () => {
    expect(haversineKm({ lat: -34.9, lon: -56.1 }, { lat: -34.9, lon: -56.1 })).toBeCloseTo(0, 6);
  });
});

describe("withinPlausibleRange", () => {
  it("acepta coordenadas del pais", () => {
    expect(withinPlausibleRange(-34.9011, -56.1645)).toBe(true);
    expect(withinPlausibleRange(-31.38, -57.96)).toBe(true); // Salto
  });

  it("atrapa el parametro mal armado, que es para lo que existe", () => {
    // No es un geocerco y no puede serlo: Buenos Aires esta a la misma latitud
    // que Montevideo cruzando el rio, y dentro del rango de longitudes de
    // Uruguay. Lo que atrapa es lat/lon invertidas, un cero, o basura.
    expect(withinPlausibleRange(-56.1645, -34.9011)).toBe(false); // invertidas
    expect(withinPlausibleRange(0, 0)).toBe(false);
    expect(withinPlausibleRange(Number.NaN, -56)).toBe(false);
    expect(withinPlausibleRange(40.7128, -74.006)).toBe(false); // Nueva York
  });
});

describe("cheapestRankable", () => {
  it("la fila mas barata NO puede ser una gondola vieja", () => {
    const rows = [row({ price: 50, freshness: "stale", storeId: 9 }), row({ price: 90, storeId: 1 })];
    expect(cheapestRankable(rows as any)?.storeId).toBe(1);
  });

  it("tampoco una fila marcada suspect", () => {
    // El caso medido: cinta leuco a $18,5 contra mediana $64. Con la guarda, el
    // titular pasa de $18,5 a $25.
    const rows = [row({ price: 18.5, verdict: "suspect", storeId: 9 }), row({ price: 64, storeId: 1 })];
    expect(cheapestRankable(rows as any)?.storeId).toBe(1);
  });

  it("una oferta si puede encabezar, porque es lo que se paga hoy", () => {
    const rows = [row({ price: 43, promo: true, storeId: 9 }), row({ price: 64, storeId: 1 })];
    expect(cheapestRankable(rows as any)?.storeId).toBe(9);
  });

  it("devuelve null cuando no queda ninguna fila rankeable", () => {
    expect(cheapestRankable([row({ freshness: "stale" })] as any)).toBeNull();
    expect(cheapestRankable([] as any)).toBeNull();
  });
});

describe("whyNotRankable", () => {
  it("dice el motivo para que la pagina lo pueda mostrar", () => {
    expect(whyNotRankable(row({ freshness: "stale" }) as any)).toMatch(/2026-09-07/);
    expect(whyNotRankable(row({ verdict: "suspect" }) as any)).toMatch(/por debajo/i);
    expect(whyNotRankable(row() as any)).toBeNull();
  });
});

describe("coverageNote", () => {
  it("dice muestra insuficiente en vez de publicar un total que parece comparable", () => {
    expect(coverageNote(0.4)).toMatch(/insuficiente/i);
    expect(coverageNote(0.95)).toMatch(/95/);
  });
});

describe("ratioNote", () => {
  it("traduce el nivel de precios y aclara sobre que se midio", () => {
    expect(ratioNote(0.85)).toMatch(/m.s barato/i);
    expect(ratioNote(0.85)).toMatch(/declara/i);
    expect(ratioNote(1.15)).toMatch(/m.s caro/i);
    expect(ratioNote(1.001)).toMatch(/en l.nea/i);
    expect(ratioNote(null)).toMatch(/sin nivel/i);
  });
});
