import { describe, expect, it, vi, beforeEach } from "vitest";

const get_currency_evolution = vi.fn();
vi.mock("../../classes/cambioInfo", () => ({
  cambio_info: { get_currency_evolution: (...a: unknown[]) => get_currency_evolution(...a) },
}));

const find = vi.fn();
vi.mock("../../classes/models/DriverSnapshot", () => ({
  DriverSnapshotModel: { find: (...a: unknown[]) => find(...a) },
}));

import {
  attributeMove,
  detectMoves,
  driversFor,
  fetchCanonicalSeries,
  findNotableMove,
  loadDriverSeries,
  snapshotsToDriverSeries,
} from "../../classes/explain/moves";

const S = (pairs: [string, number][]) => pairs.map(([date, value]) => ({ date, value }));

describe("detectMoves", () => {
  it("flags a day whose |% change| exceeds the threshold", () => {
    const series = S([
      ["2026-06-01", 40],
      ["2026-06-02", 40.8], // +2%
      ["2026-06-03", 40.9], // +0.24%, below threshold
    ]);
    const moves = detectMoves(series, 1);
    expect(moves).toHaveLength(1);
    expect(moves[0]!.date).toBe("2026-06-02");
    expect(moves[0]!.pctChange).toBeCloseTo(2, 6);
    expect(moves[0]!.direction).toBe("up");
  });

  it("marks a drop as direction down", () => {
    const series = S([
      ["2026-06-01", 40],
      ["2026-06-02", 39],
    ]);
    expect(detectMoves(series, 1)[0]!.direction).toBe("down");
  });
});

describe("attributeMove", () => {
  it("computes each driver day-move vs its previous point, sorted by |move| desc", () => {
    const driverSeries = [
      { key: "brl", points: S([["2026-06-01", 5.0], ["2026-06-02", 5.15]]) }, // +3%
      { key: "dxy", points: S([["2026-06-01", 100], ["2026-06-02", 101]]) }, // +1%
    ];
    const out = attributeMove("2026-06-02", driverSeries);
    expect(out.map((d) => d.key)).toEqual(["brl", "dxy"]);
    expect(out[0]!.dayMovePct).toBeCloseTo(3, 6);
    expect(out[1]!.dayMovePct).toBeCloseTo(1, 6);
  });

  it("skips a driver with no point on the date or no prior point", () => {
    const driverSeries = [
      { key: "brl", points: S([["2026-06-02", 5.15]]) }, // no prior point
      { key: "dxy", points: S([["2026-06-01", 100], ["2026-06-03", 101]]) }, // no 06-02 point
    ];
    expect(attributeMove("2026-06-02", driverSeries)).toEqual([]);
  });
});

describe("driversFor / snapshotsToDriverSeries", () => {
  it("pivots per-date snapshots into one date-sorted series per driver for the currency", () => {
    const snapshots = [
      { date: "2026-06-02", values: { dxy: 101, us10y: 4.2 } },
      { date: "2026-06-01", values: { dxy: 100, us10y: 4.1 } },
    ];
    const series = snapshotsToDriverSeries(snapshots, driversFor("USD"));
    const dxy = series.find((s) => s.key === "dxy")!;
    expect(dxy.points).toEqual([
      { date: "2026-06-01", value: 100 },
      { date: "2026-06-02", value: 101 },
    ]);
  });
});

describe("fetchCanonicalSeries", () => {
  // NOTE: block body, not an implicit-return arrow — `beforeEach(() => mock.mockReset())` returns
  // mockReset()'s return value (the mock fn itself) from the hook, which confuses Vitest's
  // unhandled-rejection tracking for a mockRejectedValue used later in this block (verified
  // empirically: with the implicit-return form, the "degrades to an empty series" test below fails
  // with an unhandled rejection even though the try/catch in fetchCanonicalSeries is correct).
  beforeEach(() => {
    get_currency_evolution.mockReset();
  });

  it("normalizes the backend's own evolution rows for the CANONICAL anchor", async () => {
    get_currency_evolution.mockResolvedValue({
      evolution: [{ date: new Date("2026-07-01T00:00:00.000Z"), buy: 39, sell: 40 }],
    });
    const out = await fetchCanonicalSeries("USD");
    expect(out).toEqual([{ date: "2026-07-01", value: 40 }]);
    expect(get_currency_evolution).toHaveBeenCalledWith("bcu", "USD", 2, "BILLETE");
  });

  it("degrades to an empty series when there is no historical data yet", async () => {
    get_currency_evolution.mockRejectedValue(new Error("No historical data found"));
    expect(await fetchCanonicalSeries("USD")).toEqual([]);
  });
});

describe("loadDriverSeries", () => {
  beforeEach(() => {
    find.mockReset();
  });

  it("reads DriverSnapshot read-only and pivots it for the currency's drivers", async () => {
    find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          { date: "2026-06-01", values: { brl: 5.0 } },
          { date: "2026-06-02", values: { brl: 5.15 } },
        ]),
    });
    const out = await loadDriverSeries("USD");
    const brl = out.find((s) => s.key === "brl")!;
    expect(brl.points).toHaveLength(2);
  });
});

describe("findNotableMove", () => {
  beforeEach(() => {
    get_currency_evolution.mockReset();
  });

  it("returns the move when the date is notable", async () => {
    get_currency_evolution.mockResolvedValue({
      evolution: [
        { date: new Date("2026-06-01T00:00:00.000Z"), buy: 39, sell: 40 },
        { date: new Date("2026-06-02T00:00:00.000Z"), buy: 40.6, sell: 40.8 },
      ],
    });
    const move = await findNotableMove("USD", "2026-06-02");
    expect(move?.date).toBe("2026-06-02");
    expect(move?.pctChange).toBeCloseTo(2, 6);
    expect(move?.direction).toBe("up");
  });

  it("returns null when the date is not a notable move", async () => {
    get_currency_evolution.mockResolvedValue({
      evolution: [
        { date: new Date("2026-06-01T00:00:00.000Z"), buy: 39, sell: 40 },
        { date: new Date("2026-06-02T00:00:00.000Z"), buy: 40.01, sell: 40.05 },
      ],
    });
    expect(await findNotableMove("USD", "2026-06-02")).toBeNull();
  });
});
