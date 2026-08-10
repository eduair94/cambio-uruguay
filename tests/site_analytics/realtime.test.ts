import { describe, expect, it } from "vitest";
import { buildRealtime, emptyRealtime, REALTIME_MINUTES } from "../../classes/site-analytics/realtime";
import type { Ga4Report } from "../../classes/site-analytics/ga4";

function report(dims: string[], metrics: string[], rows: (string | number)[][]): Ga4Report {
  return {
    dimensionHeaders: dims.map(name => ({ name })),
    metricHeaders: metrics.map(name => ({ name })),
    rows: rows.map(row => ({
      dimensionValues: row.slice(0, dims.length).map(value => ({ value: String(value) })),
      metricValues: row.slice(dims.length).map(value => ({ value: String(value) })),
    })),
  };
}

const ASOF = "2026-08-10T13:00:00.000Z";

describe("buildRealtime", () => {
  const snapshot = buildRealtime(
    [
      report([], ["activeUsers"], [[41]]),
      report(
        ["minutesAgo"],
        ["activeUsers"],
        [
          ["00", 7],
          ["01", 9],
          ["04", 3],
          ["29", 12],
          // GA4 never sends this, but a bucket outside 0..29 must not widen the sparkline.
          ["45", 999],
        ]
      ),
      report(
        ["unifiedScreenName"],
        ["activeUsers", "screenPageViews"],
        [
          ["Dólar hoy", 12, 20],
          ["Pizarra", 20, 24],
          ["", 99, 99],
        ]
      ),
    ],
    ASOF
  );

  it("reports the unique-user headcount from the totals report, not the per-minute sum", () => {
    // The per-minute rows add up to 31; the same person recurs minute after minute.
    expect(snapshot.activeUsers).toBe(41);
  });

  it("fills the minutes GA4 omits, oldest first", () => {
    expect(snapshot.perMinute).toHaveLength(REALTIME_MINUTES);
    expect(snapshot.perMinute[0]).toEqual({ minutesAgo: 29, activeUsers: 12 });
    expect(snapshot.perMinute.at(-1)).toEqual({ minutesAgo: 0, activeUsers: 7 });
    expect(snapshot.perMinute.find(m => m.minutesAgo === 10)).toEqual({ minutesAgo: 10, activeUsers: 0 });
  });

  it("ignores buckets outside the 30-minute window", () => {
    expect(snapshot.perMinute.some(m => m.activeUsers === 999)).toBe(false);
  });

  it("takes the busiest recent minute for the 5-minute figure — a sum would count one visitor five times", () => {
    expect(snapshot.activeUsersLast5).toBe(9);
  });

  it("ranks the live pages by users and drops the unnamed row", () => {
    expect(snapshot.pages.map(p => p.title)).toEqual(["Pizarra", "Dólar hoy"]);
    expect(snapshot.pages[0]).toMatchObject({ activeUsers: 20, views: 24 });
  });

  it("survives GA4 answering nothing at all", () => {
    const empty = emptyRealtime(new Date(ASOF));
    expect(empty.activeUsers).toBe(0);
    expect(empty.pages).toEqual([]);
    expect(empty.perMinute).toHaveLength(REALTIME_MINUTES);
    expect(empty.perMinute.every(m => m.activeUsers === 0)).toBe(true);
  });
});
