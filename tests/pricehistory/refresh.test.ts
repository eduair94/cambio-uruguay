import { describe, expect, it } from "vitest";
import { composeSnapshot, refusesThinRun, snapshotPruneFilter } from "../../classes/pricehistory/refresh";
import type { PriceChange } from "../../classes/pricehistory/types";

const change = (over: Partial<PriceChange> = {}): PriceChange => ({
  vertical: "equipar",
  id: "ml:MLU1",
  title: "Heladera",
  url: "https://x/y",
  external: true,
  sellerName: "Tienda",
  sellerKey: "tienda",
  from: 30000,
  to: 27000,
  currency: "UYU",
  at: "2026-09-19",
  pct: -10,
  direction: "baja",
  ...over,
});

describe("composeSnapshot", () => {
  it("arma el documento con sus contadores", () => {
    const snapshot = composeSnapshot({
      key: "current",
      day: "2026-09-22",
      generatedAt: "2026-09-22T16:09:00.000Z",
      windowDays: 7,
      verticals: [
        { vertical: "equipar", tracked: 16114, withHistory: 13704, drops: 40, rises: 12, trackingSince: "2026-09-17" },
      ],
      changes: [change(), change({ id: "ml:MLU2", direction: "suba", from: 100, to: 120, pct: 20 })],
    });
    expect(snapshot.key).toBe("current");
    expect(snapshot.changes).toHaveLength(2);
    expect(snapshot.verticals[0]?.drops).toBe(40);
  });
});

describe("refusesThinRun", () => {
  it("la primera corrida escribe aunque traiga cero", () => {
    expect(refusesThinRun(null, 0)).toBe(false);
  });

  it("una corrida con menos del 40 % de lo publicado no pisa la foto buena", () => {
    expect(refusesThinRun(100, 39)).toBe(true);
    expect(refusesThinRun(100, 40)).toBe(false);
  });

  it("con poca cosa publicada no hay nada que proteger", () => {
    expect(refusesThinRun(19, 0)).toBe(false);
  });
});

describe("snapshotPruneFilter", () => {
  it("borra los documentos de día con más de 400 días", () => {
    expect(snapshotPruneFilter("2026-09-22", 400)).toEqual({
      key: { $regex: "^day:", $lt: "day:2025-08-18" },
    });
  });
});
