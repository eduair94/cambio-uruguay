import { describe, expect, it } from "vitest";
import { detectPriceChanges, publishDecision, stateKey } from "../../classes/precios/store";

const row = (articleId: number, storeId: number, price: number) => ({
  articleId,
  storeId,
  declarationId: 1,
  price,
  sourceDay: "2026-09-07",
  storeName: "Local",
  address: "x",
  lat: -34.8,
  lon: -56.1,
  verdict: "ok" as const,
  freshness: "fresh" as const,
});

describe("detectPriceChanges", () => {
  it("escribe UNA fila por cada cambio, sin umbral minimo", () => {
    // El ledger es lo unico irreconstruible: la fila diaria se sobrescribe.
    const previous = new Map([[stateKey(1, 1), { price: 100, sourceDay: "2026-09-06" }]]);
    const changes = detectPriceChanges([row(1, 1, 100.01)], previous, "2026-09-07");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ from: 100, to: 100.01, articleId: 1, storeId: 1 });
    expect(changes[0].changePct).toBeCloseTo(0.01, 4);
  });

  it("no escribe nada cuando el precio no se movio", () => {
    const previous = new Map([[stateKey(1, 1), { price: 100, sourceDay: "2026-09-06" }]]);
    expect(detectPriceChanges([row(1, 1, 100)], previous, "2026-09-07")).toHaveLength(0);
  });

  it("la primera aparicion de un par no es un cambio", () => {
    expect(detectPriceChanges([row(1, 1, 100)], new Map(), "2026-09-07")).toHaveLength(0);
  });

  it("ignora filas sin local o rechazadas", () => {
    const previous = new Map([[stateKey(1, 1), { price: 100, sourceDay: "2026-09-06" }]]);
    const orphan = { ...row(1, 1, 120), storeId: null as any };
    const rejected = { ...row(1, 1, 120), verdict: "reject" as const };
    expect(detectPriceChanges([orphan, rejected], previous, "2026-09-07")).toHaveLength(0);
  });

  it("registra tambien la baja de precio", () => {
    const previous = new Map([[stateKey(1, 1), { price: 100, sourceDay: "2026-09-06" }]]);
    const [change] = detectPriceChanges([row(1, 1, 80)], previous, "2026-09-07");
    expect(change.changePct).toBeCloseTo(-20, 5);
  });
});

describe("publishDecision", () => {
  it("no reemplaza un dia bueno con una corrida flaca", () => {
    expect(publishDecision(5_000, 70_000).saved).toBe(false);
    expect(publishDecision(0, 0).saved).toBe(false);
  });

  it("publica una corrida normal", () => {
    expect(publishDecision(74_000, 75_000).saved).toBe(true);
  });

  it("publica la primera corrida, que no tiene con que compararse", () => {
    expect(publishDecision(70_000, 0).saved).toBe(true);
  });

  it("dice el motivo cuando se niega", () => {
    expect(publishDecision(5_000, 70_000).reason).toMatch(/conserva/i);
  });
});
