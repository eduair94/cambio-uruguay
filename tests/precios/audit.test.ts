import { describe, expect, it } from "vitest";
import { auditShelves } from "../../classes/precios/audit";

const medians = new Map<number, number>(Array.from({ length: 20 }, (_, i) => [i + 1, 100]));

const shelf = (storeId: number, factor: number, count = 20) =>
  Array.from({ length: count }, (_, i) => ({
    articleId: i + 1,
    storeId,
    declarationId: storeId * 1000 + i,
    price: 100 * factor,
    sourceDay: "2026-09-07",
    promo: false,
    storeName: `Local ${storeId}`,
    address: "x",
    lat: -34.8,
    lon: -56.1,
    verdict: "ok" as const,
    freshness: "fresh" as const,
  }));

describe("auditShelves", () => {
  it("un local en linea con el pais no dispara nada", () => {
    const verdicts = auditShelves(shelf(1, 1.05), medians);
    expect(verdicts.find((v) => v.storeId === 1)?.severity).toBe("ok");
  });

  it("detecta la gondola ENTERA desplazada, que es lo que la guarda por fila no puede ver", () => {
    // Cada fila sola pasa la banda del articulo (3x cae dentro de p10/3-p90x3);
    // el error solo se ve mirando todas las filas del mismo local juntas.
    const verdicts = auditShelves(shelf(2, 3), medians);
    expect(verdicts.find((v) => v.storeId === 2)?.severity).toBe("grave");
  });

  it("detecta tambien el desplazamiento hacia abajo", () => {
    const verdicts = auditShelves(shelf(5, 1 / 3), medians);
    expect(verdicts.find((v) => v.storeId === 5)?.severity).toBe("grave");
  });

  it("no juzga un local con pocas observaciones", () => {
    const verdicts = auditShelves(shelf(3, 3, 4), medians);
    expect(verdicts.find((v) => v.storeId === 3)?.severity).toBe("ok");
    expect(verdicts.find((v) => v.storeId === 3)?.note).toMatch(/insuficiente/i);
  });

  it("avisa sin dictaminar cuando el desvio es intermedio", () => {
    const verdicts = auditShelves(shelf(4, 1.6), medians);
    expect(verdicts.find((v) => v.storeId === 4)?.severity).toBe("warn");
  });

  it("ignora filas huerfanas y rechazadas", () => {
    const orphans = shelf(6, 3).map((row) => ({ ...row, storeId: null as any }));
    const rejects = shelf(7, 3).map((row) => ({ ...row, verdict: "reject" as const }));
    expect(auditShelves([...orphans, ...rejects], medians)).toEqual([]);
  });
});
