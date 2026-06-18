import { describe, it, expect } from "vitest";
import { formatAlerts, formatFavorites, parseAlertCommand } from "../src/commands/account.js";

describe("account command helpers", () => {
  it("formats an alert list", () => {
    const txt = formatAlerts([
      { currency: "USD", kind: "bestBuy", op: ">=", target: 41, active: true },
    ]);
    expect(txt).toContain("USD");
    expect(txt).toContain("41");
  });

  it("formats favorites", () => {
    expect(formatFavorites([{ key: "brou", label: "BROU" }])).toContain("BROU");
  });

  it('parses "/alerta USD compra 41"', () => {
    expect(parseAlertCommand(["USD", "compra", "41"])).toEqual({
      currency: "USD",
      kind: "bestBuy",
      op: ">=",
      target: 41,
    });
  });

  it('parses venta into bestSell <=', () => {
    expect(parseAlertCommand(["EUR", "venta", "44"])).toEqual({
      currency: "EUR",
      kind: "bestSell",
      op: "<=",
      target: 44,
    });
  });

  it("returns null for a malformed command", () => {
    expect(parseAlertCommand(["nope"])).toBeNull();
    expect(parseAlertCommand(["XXX", "compra", "1"])).toBeNull();
  });
});
