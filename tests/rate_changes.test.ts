import { describe, expect, it } from "vitest";
import {
  detectRateChanges,
  formatRateChangeMessage,
} from "../classes/rate_changes";
import { CambioObj } from "../interfaces/Cambio";

const at = new Date("2026-07-24T15:00:00.000Z");
const previous: CambioObj[] = [
  {
    code: "USD",
    type: "",
    name: "Dólar",
    buy: 39.1,
    sell: 41.2,
  },
];

describe("change-only rate ledger", () => {
  it("stores nothing when a constant verification finds identical values", () => {
    expect(
      detectRateChanges("brou", "BROU", [...previous], previous, at)
    ).toEqual([]);
  });

  it("detects the smallest representable change in either side", () => {
    const current = [{ ...previous[0], buy: 39.100001 }];
    const changes = detectRateChanges("brou", "BROU", current, previous, at);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      previousBuy: 39.1,
      buy: 39.100001,
      buyChanged: true,
      sellChanged: false,
    });
  });

  it("does not create a change event for a newly discovered quote", () => {
    expect(
      detectRateChanges("bbva", "BBVA", previous, [], at)
    ).toEqual([]);
  });

  it("reports only the side that changed in Telegram", () => {
    const change = detectRateChanges(
      "brou",
      "BROU",
      [{ ...previous[0], sell: 41.25 }],
      previous,
      at
    );
    const message = formatRateChangeMessage(change);

    expect(message).toContain("Venta:");
    expect(message).not.toContain("Compra:");
    expect(message).toContain("41,2");
    expect(message).toContain("41,25");
    expect(message).toContain("cambio-uruguay.com/ultimos-cambios");
  });
});
