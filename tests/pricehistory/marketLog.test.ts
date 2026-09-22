import { describe, expect, it } from "vitest";
import {
  applyMarketPoints,
  marketAdvertId,
  marketLogOperation,
  marketObservationsFromRentals,
} from "../../classes/pricehistory/marketLog";

describe("applyMarketPoints", () => {
  // El gemelo en JS de lo que hace el pipeline de Mongo, para poder fijar las reglas sin base.
  it("agrega un punto cuando el precio cambia", () => {
    expect(applyMarketPoints([{ d: "2026-09-20", p: 30000, c: "UYU" }], { d: "2026-09-22", p: 28000, c: "UYU" })).toEqual([
      { d: "2026-09-20", p: 30000, c: "UYU" },
      { d: "2026-09-22", p: 28000, c: "UYU" },
    ]);
  });

  it("no agrega nada cuando el precio es el mismo", () => {
    const points = [{ d: "2026-09-20", p: 30000, c: "UYU" as const }];
    expect(applyMarketPoints(points, { d: "2026-09-22", p: 30000, c: "UYU" })).toEqual(points);
  });

  it("un cambio dentro del mismo día reemplaza el punto de ese día", () => {
    // Es la diferencia con la corrida diaria: a las 14 el aviso pide 28.000 y a las 19, 27.000. El
    // día tiene UN punto, el último, no dos.
    const points = [
      { d: "2026-09-20", p: 30000, c: "UYU" as const },
      { d: "2026-09-22", p: 28000, c: "UYU" as const },
    ];
    expect(applyMarketPoints(points, { d: "2026-09-22", p: 27000, c: "UYU" })).toEqual([
      { d: "2026-09-20", p: 30000, c: "UYU" },
      { d: "2026-09-22", p: 27000, c: "UYU" },
    ]);
  });

  it("un cambio de moneda es un punto nuevo, no un cambio de precio", () => {
    expect(applyMarketPoints([{ d: "2026-09-20", p: 800, c: "USD" }], { d: "2026-09-22", p: 800, c: "UYU" })).toEqual([
      { d: "2026-09-20", p: 800, c: "USD" },
      { d: "2026-09-22", p: 800, c: "UYU" },
    ]);
  });

  it("recorta al tope de puntos", () => {
    const points = Array.from({ length: 40 }, (_, index) => ({ d: `2026-08-${String(index + 1).padStart(2, "0")}`, p: 1000 + index, c: "UYU" as const }));
    const next = applyMarketPoints(points, { d: "2026-09-22", p: 9999, c: "UYU" }, 40);
    expect(next).toHaveLength(40);
    expect(next[0]!.p).toBe(1001);
    expect(next[39]!.p).toBe(9999);
  });

  it("sin historia, el primer punto es el de hoy", () => {
    expect(applyMarketPoints(undefined, { d: "2026-09-22", p: 25000, c: "UYU" })).toEqual([
      { d: "2026-09-22", p: 25000, c: "UYU" },
    ]);
  });
});

describe("marketLogOperation", () => {
  it("escribe por `key` y envuelve cada literal", () => {
    const op = marketLogOperation("alquiler", "infocasas:1", { d: "2026-09-22", p: 25000, c: "UYU" });
    expect(op.updateOne.filter).toEqual({ key: "alquiler:infocasas:1" });
    expect(op.updateOne.upsert).toBe(true);
    // Un pipeline de update lee cualquier string que empiece con "$" como ruta de campo: sin
    // `$literal` un id o un título con "$" adelante escribiría `undefined` en silencio (la trampa de
    // docs/app/PRICEWATCH.md).
    const set = (op.updateOne.update[0] as any).$set;
    expect(set.key).toEqual({ $literal: "alquiler:infocasas:1" });
    expect(set.vertical).toEqual({ $literal: "alquiler" });
    expect(set.advertId).toEqual({ $literal: "infocasas:1" });
    expect(set.firstSeen).toEqual({ $ifNull: ["$firstSeen", { $literal: "2026-09-22" }] });
  });
});

describe("marketAdvertId", () => {
  it("no duplica el prefijo de la fuente", () => {
    expect(marketAdvertId("mercadolibre", "mercadolibre:MLU1")).toBe("mercadolibre:MLU1");
    expect(marketAdvertId("infocasas", "192727742")).toBe("infocasas:192727742");
  });

  it("rechaza una fuente que el seguimiento no conoce", () => {
    expect(marketAdvertId("otroportal", "1")).toBeNull();
  });

  it("rechaza un id que no es un id", () => {
    expect(marketAdvertId("infocasas", "")).toBeNull();
    expect(marketAdvertId("infocasas", "__proto__")).toBeNull();
    expect(marketAdvertId("infocasas", "con espacio")).toBeNull();
  });
});

describe("marketObservationsFromRentals", () => {
  const property = (over: Record<string, unknown> = {}) => ({
    key: "montevideo-centro-x",
    offers: [
      { source: "infocasas", listingId: "infocasas:1", price: 25000, currency: "UYU" },
      { source: "mercadolibre", listingId: "mercadolibre:MLU2", price: 800, currency: "USD" },
    ],
    ...over,
  });

  it("saca un punto por oferta publicable", () => {
    expect(marketObservationsFromRentals([property()] as any)).toEqual([
      { advertId: "infocasas:1", p: 25000, c: "UYU" },
      { advertId: "mercadolibre:MLU2", p: 800, c: "USD" },
    ]);
  });

  it("descarta lo que no es un precio", () => {
    const rows = marketObservationsFromRentals([
      property({
        offers: [
          { source: "infocasas", listingId: "infocasas:3", price: 0, currency: "UYU" },
          { source: "infocasas", listingId: "infocasas:4", price: 25000, currency: "EUR" },
          { source: "infocasas", listingId: "infocasas:5", price: 25000 },
        ],
      }),
    ] as any);
    expect(rows).toEqual([]);
  });

  it("un mismo aviso repetido en dos filas se registra una sola vez, con el precio más barato", () => {
    // Una separación a medio hacer puede dejar el mismo aviso en dos propiedades: el punto del día es
    // el precio de ese aviso, no un registro de cada vez que se lo vio.
    const rows = marketObservationsFromRentals([
      property({ offers: [{ source: "infocasas", listingId: "infocasas:9", price: 26000, currency: "UYU" }] }),
      property({ key: "otra", offers: [{ source: "infocasas", listingId: "infocasas:9", price: 25000, currency: "UYU" }] }),
    ] as any);
    expect(rows).toEqual([{ advertId: "infocasas:9", p: 25000, c: "UYU" }]);
  });
});
