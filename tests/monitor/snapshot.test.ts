import { describe, expect, it } from "vitest";
import { groupQuotes } from "../../classes/monitor/snapshot";

const rows = [
  { origin: "gales", code: "USD", type: "", buy: 40.1, sell: 42.6 },
  { origin: "gales", code: "USD", type: "EBROU", buy: 40.5, sell: 42.1 },
  { origin: "brou", code: "USD", type: "EBROU", buy: 40.6, sell: 42.0 },
  { origin: "brou", code: "USD", type: "BILLETE", buy: 40.0, sell: 42.8 },
  { origin: "la_favorita", code: "USD", type: "INTERBANCARIO", buy: 41, sell: 41.1 },
  { origin: "la_favorita", code: "USD", type: "", buy: 40.2, sell: 42.5 },
  { origin: "bcu", code: "USD", type: "", buy: 41.0, sell: 41.0 },
  { origin: "varlix", code: "EUR", type: "", buy: 45, sell: 49 },
  { origin: "afuera", code: "USD", type: "", buy: 39, sell: 44 },
];

describe("foto del grupo", () => {
  it("una fila por casa y moneda: mostrador primero, BILLETE si no hay, nunca precios condicionados ni mayoristas", () => {
    const q = groupQuotes(rows, new Set(["gales", "brou", "la_favorita", "bcu"]), new Set(["USD"]));
    expect(q.get("USD")!.map((x) => [x.origin, x.type, x.buy, x.sell]).sort()).toEqual([
      ["brou", "BILLETE", 40.0, 42.8],
      ["gales", "", 40.1, 42.6],
      ["la_favorita", "", 40.2, 42.5],
    ]);
  });

  it("sólo las casas del grupo y las monedas elegidas", () => {
    const q = groupQuotes(rows, new Set(["gales", "varlix"]), new Set(["USD"]));
    expect([...q.keys()]).toEqual(["USD"]);
    expect(q.get("USD")!.map((x) => x.origin)).toEqual(["gales"]);
  });

  it("una casa que publica sólo la venta queda con la compra en 0", () => {
    const q = groupQuotes([{ origin: "gales", code: "USD", type: "", buy: 0, sell: 42.6 }], new Set(["gales"]), new Set(["USD"]));
    expect(q.get("USD")![0]).toMatchObject({ buy: 0, sell: 42.6 });
  });
});
