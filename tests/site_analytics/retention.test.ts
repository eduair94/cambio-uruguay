import { describe, expect, it, vi } from "vitest";
import { completeRetentionReport, fetchRetentionReport, retentionRates, retentionWindows } from "../../classes/site-analytics/retention";
import type { Ga4Report, Ga4ReportRequest } from "../../classes/site-analytics/ga4";

const metadata = { timeZone: "America/Los_Angeles", currencyCode: "USD" };
const now = new Date("2026-10-23T03:00:00Z"); // Still October 22 in the property.
const request: Ga4ReportRequest = {
  dateRanges: [{ startDate: "2026-09-24", endDate: "2026-10-21" }],
  dimensions: [{ name: "landingPage" }, { name: "deviceCategory" }], metrics: [{ name: "sessions" }],
};
function page(paths: string[], rowCount = paths.length): Ga4Report {
  return {
    metadata, rowCount, dimensionHeaders: [{ name: "landingPage" }, { name: "deviceCategory" }], metricHeaders: [{ name: "sessions" }],
    rows: paths.map((value) => ({ dimensionValues: [{ value }, { value: "mobile" }], metricValues: [{ value: "3" }] })),
  };
}

describe("retention windows and row metrics", () => {
  it("uses two adjacent complete 28-day windows in the property timezone", () => {
    expect(retentionWindows(metadata.timeZone, undefined, now)).toEqual({
      current: { startDate: "2026-09-23", endDate: "2026-10-20" },
      previous: { startDate: "2026-08-26", endDate: "2026-09-22" },
    });
    expect(retentionWindows(metadata.timeZone, "2026-10-21", now).current.startDate).toBe("2026-09-24");
  });
  it.each(["", "2026-10-22", "2026-10-24", "2026-02-30", "2026-2-01", "not-a-date"])("rejects invalid or unclosed date %s", (end) => {
    expect(() => retentionWindows(metadata.timeZone, end, now)).toThrow(/retention:/);
  });
  it("derives bounce and engagement from counts and preserves a small sample", () => {
    expect(retentionRates({ sessions: 20, engagedSessions: 15, screenPageViews: 26, userEngagementDuration: 800, activeUsers: 10 })).toMatchObject({
      engagementRate: 0.75, bounceRate: 0.25, viewsPerSession: 1.3,
      engagementSecondsPerSession: 40, engagementSecondsPerActiveUser: 80, sample: "small",
    });
    expect(retentionRates({ sessions: 0, engagedSessions: 0, screenPageViews: 0, userEngagementDuration: 0, activeUsers: 0 })).toMatchObject({ bounceRate: null, viewsPerSession: null, engagementSecondsPerActiveUser: null });
  });
  it.each([
    { sessions: -1 },
    { engagedSessions: 101 },
    { engagedSessions: -1 },
    { screenPageViews: Infinity },
    { userEngagementDuration: NaN },
    { activeUsers: "" },
  ])("refuses invalid rates instead of exporting them as reviewable data: %s", (change) => {
    expect(() => retentionRates({ sessions: 100, engagedSessions: 60, screenPageViews: 180, userEngagementDuration: 3000, activeUsers: 80, ...change })).toThrow(/retention:/);
  });
  it("requires all requested metrics but does not invent a users-to-sessions constraint", () => {
    expect(() => retentionRates({ sessions: 100, activeUsers: 80 })).toThrow(/missing metric/);
    expect(retentionRates({ sessions: 10, engagedSessions: 6, screenPageViews: 18, userEngagementDuration: 300.5, activeUsers: 20 })).toMatchObject({ engagementRate: 0.6, engagementSecondsPerSession: 30.05 });
  });
});

describe("complete retention pagination", () => {
  it("reads the tail in stable dimension order without dropping low-volume rows", async () => {
    const run = vi.fn().mockResolvedValueOnce([page(["/a", "/b"], 3)]).mockResolvedValueOnce([page(["/c"], 3)]);
    const result = await completeRetentionReport(request, run, 2);
    expect(result.rows.map((r) => r.landingPage)).toEqual(["/a", "/b", "/c"]);
    expect(result).toMatchObject({ rowCount: 3, pages: 2, metadata });
    expect(run.mock.calls[1][0][0]).toMatchObject({ offset: 2, limit: 2, orderBys: [
      { dimension: { dimensionName: "landingPage", orderType: "ALPHANUMERIC" } },
      { dimension: { dimensionName: "deviceCategory", orderType: "ALPHANUMERIC" } },
    ] });
  });
  it.each([
    ["duplicate", page(["/a"], 3)],
    ["missing tail", page([], 3)],
    ["changed count", page(["/c"], 4)],
    ["changed timezone", { ...page(["/c"], 3), metadata: { timeZone: "UTC" } }],
  ])("refuses %s instead of exporting partial evidence", async (_label, last) => {
    const run = vi.fn().mockResolvedValueOnce([page(["/a", "/b"], 3)]).mockResolvedValueOnce([last]);
    await expect(completeRetentionReport(request, run, 2)).rejects.toThrow(/retention:/);
  });
  it("rejects absent reports and row budgets; accepts a genuinely empty report", async () => {
    await expect(completeRetentionReport(request, vi.fn().mockResolvedValue([]))).rejects.toThrow(/omitted/);
    await expect(completeRetentionReport(request, vi.fn().mockResolvedValue([page(["/a"], 101)]), 2, 100)).rejects.toThrow(/out-of-budget/);
    expect((await completeRetentionReport(request, vi.fn().mockResolvedValue([{ metadata }]))).rows).toEqual([]);
  });
  it.each([0, -1, 1.5, Infinity])("rejects an invalid page size %s before requesting data", async (size) => {
    const run = vi.fn();
    await expect(completeRetentionReport(request, run, size)).rejects.toThrow(/positive integers/);
    expect(run).not.toHaveBeenCalled();
  });
  it.each([
    ["missing metric headers", { metricHeaders: undefined }],
    ["wrong metric", { metricHeaders: [{ name: "activeUsers" }] }],
    ["reordered dimensions", { dimensionHeaders: [{ name: "deviceCategory" }, { name: "landingPage" }] }],
    ["missing dimension headers", { dimensionHeaders: undefined }],
    ["missing metric cell", { rows: [{ dimensionValues: [{ value: "/a" }, { value: "mobile" }], metricValues: [] }] }],
    ["extra metric cell", { rows: [{ dimensionValues: [{ value: "/a" }, { value: "mobile" }], metricValues: [{ value: "3" }, { value: "4" }] }] }],
    ["missing dimension cell", { rows: [{ dimensionValues: [{ value: "/a" }], metricValues: [{ value: "3" }] }] }],
    ["missing dimension value", { rows: [{ dimensionValues: [{ value: "/a" }, {}], metricValues: [{ value: "3" }] }] }],
  ])("rejects %s before flattening one-row reports", async (_name, change) => {
    await expect(completeRetentionReport(request, vi.fn().mockResolvedValue([{ ...page(["/a"]), ...change }]))).rejects.toThrow(/retention:/);
  });
  it.each([undefined, "", " ", "NaN", "Infinity", "-3", "garbage"])("rejects malformed raw metric %s instead of coercing it to zero", async (value) => {
    const report = page(["/a"]);
    report.rows![0].metricValues = [{ value }];
    await expect(completeRetentionReport(request, vi.fn().mockResolvedValue([report]))).rejects.toThrow(/metric value/);
  });
  it("rejects inconsistent raw session counts, including a nonzero engaged count with zero sessions", async () => {
    const countsRequest = { ...request, metrics: [{ name: "sessions" }, { name: "engagedSessions" }] };
    for (const counts of [["10", "12"], ["0", "1"]]) {
      const report = page(["/a"]);
      report.metricHeaders = countsRequest.metrics;
      report.rows![0].metricValues = counts.map((value) => ({ value }));
      await expect(completeRetentionReport(countsRequest, vi.fn().mockResolvedValue([report]))).rejects.toThrow(/exceeds sessions/);
    }
  });
});

describe("retention report scopes", () => {
  it("queries independent totals, keeps Uruguay separate, and never sums landing users", async () => {
    const requests: Ga4ReportRequest[] = [];
    const run = vi.fn(async (batch: Ga4ReportRequest[]) => batch.map((r) => {
      requests.push(r);
      if (r.dateRanges[0].startDate === "yesterday") return { metadata };
      if (r.dimensions?.length) return { metadata, rowCount: 0 };
      return {
        metadata, rowCount: 1, metricHeaders: r.metrics,
        rows: [{ metricValues: ["100", "60", "180", "3000", "80"].map((value) => ({ value })) }],
      };
    }));
    const result = await fetchRetentionReport({ now, endDate: "2026-10-21" }, run);
    expect(Object.keys(result.reports)).toHaveLength(14);
    expect(result.reports["current.globalTotals"].rows[0]).toMatchObject({ sessions: 100, activeUsers: 80, bounceRate: 0.4 });
    expect(result.reports["current.uruguayLandings"].rows).toEqual([]);
    expect(requests[1].dimensionFilter).toBeUndefined();
    expect(requests[2].dimensionFilter).toEqual({ filter: { fieldName: "countryId", stringFilter: { matchType: "EXACT", value: "UY" } } });
    expect(requests.every((r) => r.metrics.every((m) => !/revenue|adClicks|adImpressions/i.test(m.name)))).toBe(true);
    expect(requests.find((r) => r.dimensions?.[0]?.name === "landingPage")?.dimensions).toEqual([{ name: "landingPage" }, { name: "deviceCategory" }]);
  });
  it("does not guess a missing property timezone or accept invalid sample thresholds", async () => {
    await expect(fetchRetentionReport({}, vi.fn().mockResolvedValue([{}]))).rejects.toThrow(/timezone/);
    await expect(fetchRetentionReport({ minSessions: 0 }, vi.fn())).rejects.toThrow(/positive integer/);
  });
});
