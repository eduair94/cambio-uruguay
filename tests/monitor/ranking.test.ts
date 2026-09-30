import { describe, expect, it } from "vitest";
import { bestOf, placementOf } from "../../classes/monitor/ranking";
import type { Quote } from "../../classes/monitor/types";

const q = (origin: string, buy: number, sell: number): Quote => ({ origin, code: "USD", type: "", buy, sell });
const group = [q("propia", 40.1, 42.6), q("gales", 40.2, 42.5), q("varlix", 40.1, 42.7), q("aeromar", 40.0, 0)];

describe("posición en el grupo", () => {
  it("en la compra gana la más alta y los empates comparten puesto", () => {
    expect(placementOf(group, "propia", "buy")).toEqual({
      position: 2,
      of: 4,
      better: [{ origin: "gales", value: 40.2 }],
    });
    expect(placementOf(group, "varlix", "buy")!.position).toBe(2);
  });

  it("en la venta gana la más baja y una casa sin venta no cuenta", () => {
    expect(placementOf(group, "propia", "sell")).toEqual({
      position: 2,
      of: 3,
      better: [{ origin: "gales", value: 42.5 }],
    });
    expect(placementOf(group, "aeromar", "sell")).toBeNull();
  });

  it("sin la casa en la foto no hay posición", () => {
    expect(placementOf(group, "ausente", "buy")).toBeNull();
  });

  it("el mejor de cada lado", () => {
    expect(bestOf(group, "buy")).toEqual({ origin: "gales", value: 40.2 });
    expect(bestOf(group, "sell")).toEqual({ origin: "gales", value: 42.5 });
    expect(bestOf([], "sell")).toBeNull();
  });
});
