import { describe, expect, it } from "vitest";
import { marketLogPruneFilter, nextLog, priceAt, shiftDay } from "../../classes/marketseries/log";
import type { MarketPriceLog } from "../../classes/marketseries/types";
import { observation } from "./fixtures";

const first = nextLog(undefined, observation({ seenDay: "2026-09-01", price: 100 }));

describe("nextLog", () => {
  it("starts a log on the day of the catalogue's own observation", () => {
    expect(first).toEqual({
      key: "alquiler:infocasas:1",
      vertical: "alquiler",
      advertId: "infocasas:1",
      firstSeen: "2026-09-01",
      lastSeen: "2026-09-01",
      points: [{ d: "2026-09-01", p: 100, c: "UYU" }],
    });
  });
  it("same price another day: only lastSeen moves", () => {
    const next = nextLog(first, observation({ seenDay: "2026-09-05", price: 100 }));
    expect(next.lastSeen).toBe("2026-09-05");
    expect(next.points).toHaveLength(1);
  });
  it("a new price appends a point; a new currency too", () => {
    const priced = nextLog(first, observation({ seenDay: "2026-09-05", price: 90 }));
    expect(priced.points.map(point => point.p)).toEqual([100, 90]);
    const dollars = nextLog(priced, observation({ seenDay: "2026-09-06", price: 90, currency: "USD" }));
    expect(dollars.points.at(-1)).toEqual({ d: "2026-09-06", p: 90, c: "USD" });
  });
  it("a second price the same day replaces that day's point", () => {
    const priced = nextLog(first, observation({ seenDay: "2026-09-05", price: 90 }));
    expect(nextLog(priced, observation({ seenDay: "2026-09-05", price: 95 })).points.map(point => point.p)).toEqual([100, 95]);
  });
  it("nothing new returns the very same object (so it is not rewritten)", () => {
    expect(nextLog(first, observation({ seenDay: "2026-09-01", price: 100 }))).toBe(first);
    expect(nextLog(first, observation({ seenDay: "2026-08-30", price: 80 }))).toBe(first);
  });
  it("keeps the newest 40 points", () => {
    let log: MarketPriceLog = first;
    for (let day = 2; day <= 60; day++) log = nextLog(log, observation({ seenDay: shiftDay("2026-09-01", day), price: 100 + day }));
    expect(log.points).toHaveLength(40);
    expect(log.points.at(-1)!.p).toBe(160);
  });
});

describe("priceAt", () => {
  const log = nextLog(nextLog(first, observation({ seenDay: "2026-09-10", price: 90 })), observation({ seenDay: "2026-09-20", price: 80 }));
  it("returns the price in force that day", () => {
    expect(priceAt(log, "2026-09-01")!.p).toBe(100);
    expect(priceAt(log, "2026-09-15")!.p).toBe(90);
    expect(priceAt(log, "2026-09-25")!.p).toBe(80);
  });
  it("before we first saw it there is no price", () => {
    expect(priceAt(log, "2026-08-31")).toBeNull();
    expect(priceAt(undefined, "2026-09-15")).toBeNull();
  });
  it("a day older than the oldest kept point has no price either", () => {
    expect(priceAt({ ...log, points: log.points.slice(1) }, "2026-09-05")).toBeNull();
  });
});

describe("marketLogPruneFilter", () => {
  it("120 days unseen, one vertical at a time", () => {
    expect(marketLogPruneFilter("autos", "2026-09-18")).toEqual({ vertical: "autos", lastSeen: { $lt: "2026-05-21" } });
  });
});
