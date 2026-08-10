import { describe, expect, it } from "vitest";
import { reportRows, reportTotals } from "../../classes/site-analytics/ga4";
import {
  addDays,
  analyticsReportRequests,
  analyticsWindows,
  buildSnapshot,
  normalizeGaDate,
  publicPath,
  snapshotIsEmpty,
  SERIES_DAYS,
  WINDOW_DAYS,
  ymdInTimeZone,
} from "../../classes/site-analytics/refresh";
import type { Ga4Report } from "../../classes/site-analytics/ga4";

const TZ = "America/Montevideo";

/** Builds a GA4-shaped report out of plain rows. */
function report(dims: string[], metrics: string[], rows: (string | number)[][], metadata?: any): Ga4Report {
  return {
    dimensionHeaders: dims.map(name => ({ name })),
    metricHeaders: metrics.map(name => ({ name })),
    rows: rows.map(row => ({
      dimensionValues: row.slice(0, dims.length).map(value => ({ value: String(value) })),
      metricValues: row.slice(dims.length).map(value => ({ value: String(value) })),
    })),
    metadata,
  };
}

const SUMMARY_METRICS = [
  "activeUsers",
  "newUsers",
  "sessions",
  "screenPageViews",
  "engagedSessions",
  "engagementRate",
  "averageSessionDuration",
  "eventCount",
];

const totalsReport = (values: number[]) => report([], SUMMARY_METRICS, [values]);

describe("date windows", () => {
  it("formats an instant in the property timezone, not UTC", () => {
    // 02:30 UTC on the 11th is still 23:30 on the 10th in Montevideo (UTC-3).
    expect(ymdInTimeZone(new Date("2026-07-11T02:30:00Z"), TZ)).toBe("2026-07-10");
    expect(ymdInTimeZone(new Date("2026-07-11T02:30:00Z"), "UTC")).toBe("2026-07-11");
  });

  it("does calendar arithmetic across month and year ends", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("ends the window yesterday — GA4's today is a partial day", () => {
    const w = analyticsWindows(new Date("2026-07-11T13:00:00Z"), TZ);
    expect(w.current.end).toBe("2026-07-10");
    expect(w.current.start).toBe("2026-06-13");
    expect(w.current.days).toBe(WINDOW_DAYS);
  });

  it("puts the previous window immediately before the current one, same length", () => {
    const w = analyticsWindows(new Date("2026-07-11T13:00:00Z"), TZ);
    expect(w.previous.end).toBe(addDays(w.current.start, -1));
    expect(w.previous.days).toBe(w.current.days);
    expect(addDays(w.previous.start, WINDOW_DAYS - 1)).toBe(w.previous.end);
  });

  it("asks for a longer series than the comparison window", () => {
    const w = analyticsWindows(new Date("2026-07-11T13:00:00Z"), TZ);
    expect(w.series.end).toBe(w.current.end);
    expect(addDays(w.series.start, SERIES_DAYS - 1)).toBe(w.series.end);
  });
});

describe("report requests", () => {
  const requests = analyticsReportRequests(analyticsWindows(new Date("2026-07-11T13:00:00Z"), TZ));

  it("keeps the order buildSnapshot reads by index", () => {
    expect(requests).toHaveLength(8);
    expect(requests[2].dimensions?.[0].name).toBe("date");
    expect(requests[3].dimensions?.map(d => d.name)).toEqual(["pagePath", "pageTitle"]);
    expect(requests[4].dimensions?.[0].name).toBe("sessionDefaultChannelGroup");
    expect(requests[5].dimensions?.[0].name).toBe("country");
    expect(requests[6].dimensions?.[0].name).toBe("deviceCategory");
    expect(requests[7].dimensions?.[0].name).toBe("eventName");
  });

  it("asks for every metric the snapshot totals declare", () => {
    expect(requests[0].metrics.map(m => m.name)).toEqual(SUMMARY_METRICS);
    expect(requests[1].metrics.map(m => m.name)).toEqual(SUMMARY_METRICS);
  });

  it("requests enough days to fill the series", () => {
    expect(requests[2].limit).toBeGreaterThanOrEqual(SERIES_DAYS);
  });
});

describe("publicPath", () => {
  it("drops the query string — /buscar?q= is a visitor's own words on a public page", () => {
    expect(publicPath("/buscar?q=cuanto%20gana%20un%20contador")).toBe("/buscar");
  });

  it("merges utm-tagged arrivals into the page they landed on", () => {
    expect(publicPath("/dolar-hoy?utm_source=telegram&utm_campaign=daily")).toBe("/dolar-hoy");
  });

  it("drops the hash and the trailing slash, keeps the locale prefix and the root", () => {
    expect(publicPath("/estado#casas")).toBe("/estado");
    expect(publicPath("/pizarra/")).toBe("/pizarra");
    expect(publicPath("/en/dolar-hoy")).toBe("/en/dolar-hoy");
    expect(publicPath("/")).toBe("/");
    expect(publicPath("")).toBe("/");
  });
});

describe("normalizeGaDate", () => {
  it("turns GA4's compact date into an ISO day", () => {
    expect(normalizeGaDate("20260710")).toBe("2026-07-10");
  });

  it("leaves anything else alone", () => {
    expect(normalizeGaDate("2026-07-10")).toBe("2026-07-10");
    expect(normalizeGaDate("(other)")).toBe("(other)");
  });
});

describe("buildSnapshot", () => {
  const windows = analyticsWindows(new Date("2026-07-11T13:00:00Z"), TZ);
  const ctx = { propertyId: "123456789", windows, asOf: "2026-07-11T13:00:00.000Z", timezone: TZ };

  const reports: Ga4Report[] = [
    totalsReport([1000, 700, 1400, 3200, 900, 0.642857, 95.4, 8800]),
    totalsReport([800, 600, 1100, 2400, 700, 0.636363, 90.1, 7000]),
    report(
      ["date"],
      ["activeUsers", "sessions", "screenPageViews"],
      [
        ["20260710", 60, 80, 190],
        ["20260708", 40, 55, 120],
        ["bad", 999, 999, 999],
      ]
    ),
    report(
      ["pagePath", "pageTitle"],
      ["screenPageViews", "activeUsers", "userEngagementDuration"],
      [
        ["/dolar-hoy", "Dólar hoy", 500, 100, 6000],
        ["/dolar-hoy?utm_source=x", "Dólar hoy (promo)", 100, 20, 400],
        ["/buscar?q=alquiler+barato", "Buscar", 300, 60, 1200],
      ]
    ),
    report(["sessionDefaultChannelGroup"], ["sessions"], [["Organic Search", 700], ["Direct", 300]]),
    report(["country"], ["activeUsers"], [["Uruguay", 800], ["Argentina", 200]]),
    report(["deviceCategory"], ["sessions"], [["mobile", 900], ["desktop", 100]]),
    report(
      ["eventName"],
      ["eventCount", "activeUsers"],
      [
        ["page_view", 3200, 1000],
        ["convert", 210, 130],
        ["", 999, 999],
      ]
    ),
  ];

  const snapshot = buildSnapshot(reports, ctx);

  it("carries the windows and the property through", () => {
    expect(snapshot.key).toBe("site");
    expect(snapshot.propertyId).toBe("123456789");
    expect(snapshot.range).toEqual(windows.current);
    expect(snapshot.previousRange).toEqual(windows.previous);
  });

  it("reads both windows' totals", () => {
    expect(snapshot.totals.sessions).toBe(1400);
    expect(snapshot.totals.screenPageViews).toBe(3200);
    expect(snapshot.previousTotals.sessions).toBe(1100);
  });

  it("sorts the daily series and drops rows GA4 could not date", () => {
    expect(snapshot.daily.map(d => d.date)).toEqual(["2026-07-08", "2026-07-10"]);
  });

  it("merges the query-string variants of a page into one row", () => {
    const dolar = snapshot.topPages.find(p => p.path === "/dolar-hoy");
    expect(dolar?.views).toBe(600);
    expect(dolar?.users).toBe(120);
    // Title of the heavier variant wins, not the last one seen.
    expect(dolar?.title).toBe("Dólar hoy");
  });

  it("never publishes a searched-for term as a page path", () => {
    expect(snapshot.topPages.map(p => p.path)).toContain("/buscar");
    expect(JSON.stringify(snapshot.topPages)).not.toContain("alquiler");
  });

  it("turns engagement duration into seconds per user", () => {
    const dolar = snapshot.topPages.find(p => p.path === "/dolar-hoy");
    expect(dolar?.avgEngagementSeconds).toBe(Math.round(6400 / 120));
  });

  it("computes shares against the breakdown total", () => {
    expect(snapshot.channels[0]).toMatchObject({ label: "Organic Search", value: 700, share: 0.7 });
    expect(snapshot.countries[0].share).toBeCloseTo(0.8, 6);
    expect(snapshot.devices[0].label).toBe("mobile");
  });

  it("drops unnamed events and keeps the ranking", () => {
    expect(snapshot.events.map(e => e.name)).toEqual(["page_view", "convert"]);
  });

  it("prefers the property's own reporting timezone when GA4 states it", () => {
    const withMeta = buildSnapshot(
      [totalsReport([0, 0, 0, 0, 0, 0, 0, 0])].map(r => ({ ...r, metadata: { timeZone: "UTC" } })),
      ctx
    );
    expect(withMeta.timezone).toBe("UTC");
    expect(snapshot.timezone).toBe(TZ);
  });

  it("survives a batch that came back short", () => {
    const partial = buildSnapshot([], ctx);
    expect(partial.totals.sessions).toBe(0);
    expect(partial.topPages).toEqual([]);
    expect(partial.daily).toEqual([]);
  });

  it("flags an all-zero snapshot as suspicious, not as a quiet month", () => {
    expect(snapshotIsEmpty(snapshot)).toBe(false);
    expect(snapshotIsEmpty(buildSnapshot([], ctx))).toBe(true);
  });
});

describe("report flattening", () => {
  it("keys dimensions as strings and metrics as numbers", () => {
    const rows = reportRows(report(["country"], ["activeUsers"], [["Uruguay", "800"]]));
    expect(rows).toEqual([{ country: "Uruguay", activeUsers: 800 }]);
  });

  it("answers zeros for a metrics-only report with no rows", () => {
    expect(reportTotals(report([], ["sessions"], []))).toEqual({ sessions: 0 });
    expect(reportRows(undefined)).toEqual([]);
  });
});
