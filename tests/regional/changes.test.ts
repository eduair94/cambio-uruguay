// El ledger de movimientos.
//
// Lo que se guarda acá no se puede reconstruir después: la fila diaria se
// sobrescribe en cada corrida, así que al cerrar el día lo único que queda de lo
// que pasó adentro es lo que se anotó cuando pasó.
import { describe, expect, it } from "vitest";
import { detectRegionalChanges, statesFromQuotes, summariseChanges } from "../../classes/regional/changes";
import { daysBetween, missingDays } from "../../classes/regional/deep_history";
import { makeQuote } from "../../classes/regional/quote";
import type { RegionalQuote } from "../../classes/regional/types";

function q(legs: { buy?: number | null; sell?: number | null; avg?: number | null }, id = "blue"): RegionalQuote {
  return makeQuote({
    country: "AR",
    market: id,
    label: "Dólar blue",
    kind: "parallel",
    base: "USD",
    quote: "ARS",
    buy: legs.buy ?? null,
    sell: legs.sell ?? null,
    avg: legs.avg ?? null,
    updatedAt: "2026-08-22T18:00:00.000Z",
    source: "ar_dolarapi",
    sourceUrl: "https://example.test",
  })!;
}

const earlier = new Date("2026-08-22T18:00:00.000Z");
const later = new Date("2026-08-22T18:10:00.000Z");

describe("detectRegionalChanges", () => {
  it("anota un movimiento por chico que sea", () => {
    // Un guaraní, un centavo de real, una diezmilésima de peso: no hay umbral.
    // Un umbral parece higiene y es una decisión editorial disfrazada — quien
    // consuma el ledger puede filtrar, pero no puede recuperar lo que no se
    // guardó.
    const previous = statesFromQuotes([q({ buy: 1530, sell: 1550 })], earlier);
    const changes = detectRegionalChanges([q({ buy: 1530, sell: 1550.01 })], previous, later);
    expect(changes).toHaveLength(1);
    expect(changes[0].sellChanged).toBe(true);
    expect(changes[0].buyChanged).toBe(false);
    expect(changes[0].changePct).toBeCloseTo(0.00032, 5);
  });

  it("no anota nada cuando nada se movió", () => {
    const previous = statesFromQuotes([q({ buy: 1530, sell: 1550 })], earlier);
    expect(detectRegionalChanges([q({ buy: 1530, sell: 1550 })], previous, later)).toEqual([]);
  });

  it("no inventa un movimiento la primera vez que ve un mercado", () => {
    // Sin estado anterior no hay desde dónde moverse, y una fila con 0 % la
    // contaría alguien como un cambio real.
    expect(detectRegionalChanges([q({ buy: 1530, sell: 1550 })], [], later)).toEqual([]);
  });

  it("guarda de dónde venía y adónde fue, con la variación firmada", () => {
    const previous = statesFromQuotes([q({ buy: 1530, sell: 1550 })], earlier);
    const [change] = detectRegionalChanges([q({ buy: 1500, sell: 1520 })], previous, later);
    expect(change.previousAvg).toBe(1540);
    expect(change.avg).toBe(1510);
    expect(change.changePct).toBeCloseTo(-1.948, 3);
    expect(change.key).toBe("AR:blue:USDARS");
  });

  it("registra cuánto tiempo pasó desde la lectura anterior", () => {
    // Es lo que hace legible al ledger: dos movimientos dentro de la misma
    // ventana se ven como uno solo, y `sinceMinutes` dice de qué ventana habla.
    const previous = statesFromQuotes([q({ buy: 1530, sell: 1550 })], earlier);
    const [change] = detectRegionalChanges([q({ buy: 1531, sell: 1550 })], previous, later);
    expect(change.sinceMinutes).toBe(10);
    expect(change.observedAt).toBe(later);
    expect(change.sourceUpdatedAt).toBe("2026-08-22T18:00:00.000Z");
  });

  it("detecta un cambio que sólo mueve el punto medio", () => {
    // Una fuente de un solo precio (un fixing) no tiene puntas que comparar.
    const previous = statesFromQuotes([q({ avg: 923.23 })], earlier);
    expect(detectRegionalChanges([q({ avg: 918.17 })], previous, later)).toHaveLength(1);
  });

  it("sigue cada mercado por separado", () => {
    const previous = statesFromQuotes([q({ buy: 1530, sell: 1550 }, "blue"), q({ buy: 1465, sell: 1515 }, "oficial")], earlier);
    const changes = detectRegionalChanges(
      [q({ buy: 1530, sell: 1550 }, "blue"), q({ buy: 1470, sell: 1520 }, "oficial")],
      previous,
      later
    );
    expect(changes.map((change) => change.market)).toEqual(["oficial"]);
  });
});

describe("summariseChanges", () => {
  it("resume la corrida por el movimiento más grande", () => {
    const previous = statesFromQuotes([q({ buy: 1530, sell: 1550 }, "blue"), q({ buy: 1465, sell: 1515 }, "oficial")], earlier);
    const changes = detectRegionalChanges(
      [q({ buy: 1600, sell: 1650 }, "blue"), q({ buy: 1466, sell: 1515 }, "oficial")],
      previous,
      later
    );
    expect(summariseChanges(changes)).toMatch(/2 movimientos, el mayor AR:blue:USDARS \+/);
  });

  it("lo dice cuando no hubo ninguno", () => {
    expect(summariseChanges([])).toBe("sin movimientos");
  });
});

describe("recorrido de archivos día por día", () => {
  it("enumera los días del más nuevo al más viejo", () => {
    // El orden importa: si la corrida se corta, lo guardado es lo reciente, que
    // es lo que alguien va a mirar.
    expect(daysBetween("2026-08-20", "2026-08-22")).toEqual(["2026-08-22", "2026-08-21", "2026-08-20"]);
  });

  it("saltea lo que ya está guardado y respeta el presupuesto", () => {
    const existing = new Set(["2026-08-21"]);
    expect(missingDays(existing, "2026-08-18", "2026-08-22", 2)).toEqual(["2026-08-22", "2026-08-20"]);
  });

  it("no pide nada cuando está al día", () => {
    const existing = new Set(["2026-08-21", "2026-08-22"]);
    expect(missingDays(existing, "2026-08-21", "2026-08-22", 100)).toEqual([]);
    expect(missingDays(new Set(), "2026-08-21", "2026-08-22", 0)).toEqual([]);
  });
});
