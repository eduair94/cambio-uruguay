// Builds the public site-analytics snapshot out of GA4 Data API reports.
//
// Two halves on purpose:
//   * `buildSnapshot()` is PURE — reports in, snapshot out. Every rule that could silently publish
//     something we did not mean to (query strings, share arithmetic, delta windows) lives there and
//     is unit-tested without a network.
//   * `refreshSiteAnalytics()` is the thin I/O wrapper the pm2 job calls.
//
// The window ends YESTERDAY, never today: GA4's current day is partial, and a half day rendered
// next to 27 whole ones reads as a traffic collapse.
import { ga4PropertyId, reportRows, reportTotals, runReports } from "./ga4";
import type { Ga4Report, Ga4ReportRequest, Ga4Row } from "./ga4";
import type {
  AnalyticsDailyPoint,
  AnalyticsEventRow,
  AnalyticsPageRow,
  AnalyticsShareRow,
  AnalyticsTotals,
  SiteAnalyticsSnapshot,
} from "./types";
import { SITE_ANALYTICS_KEY } from "./types";

export const DEFAULT_TIMEZONE = "America/Montevideo";
/** Comparison window, in days. 28 (not 30) so it is always exactly four weeks — no weekday bias. */
export const WINDOW_DAYS = 28;
/** How much history the trend chart gets. */
export const SERIES_DAYS = 90;
export const TOP_PAGES = 25;
export const TOP_COUNTRIES = 12;
export const TOP_EVENTS = 15;

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

/** `YYYY-MM-DD` for an instant, as seen in `tz`. */
export function ymdInTimeZone(at: Date, tz: string): string {
  // en-CA gives ISO-ordered parts, so this is a formatter, not a date-math trick.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Calendar arithmetic on a `YYYY-MM-DD` string, timezone-free (the string is already local). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const at = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

export interface AnalyticsWindows {
  current: { start: string; end: string; days: number };
  previous: { start: string; end: string; days: number };
  series: { start: string; end: string; days: number };
}

/** The three date windows every refresh reports on, all ending yesterday in `tz`. */
export function analyticsWindows(now: Date, tz: string = DEFAULT_TIMEZONE): AnalyticsWindows {
  const yesterday = addDays(ymdInTimeZone(now, tz), -1);
  const currentStart = addDays(yesterday, -(WINDOW_DAYS - 1));
  const previousEnd = addDays(currentStart, -1);
  return {
    current: { start: currentStart, end: yesterday, days: WINDOW_DAYS },
    previous: { start: addDays(previousEnd, -(WINDOW_DAYS - 1)), end: previousEnd, days: WINDOW_DAYS },
    series: { start: addDays(yesterday, -(SERIES_DAYS - 1)), end: yesterday, days: SERIES_DAYS },
  };
}

/** The batch of reports the snapshot is made of. Order matters — `buildSnapshot` reads it by index. */
export function analyticsReportRequests(w: AnalyticsWindows): Ga4ReportRequest[] {
  const metrics = (names: string[]) => names.map((name) => ({ name }));
  return [
    // 0 — totals, current window
    { dateRanges: [{ startDate: w.current.start, endDate: w.current.end }], metrics: metrics(SUMMARY_METRICS) },
    // 1 — totals, previous window (the deltas)
    { dateRanges: [{ startDate: w.previous.start, endDate: w.previous.end }], metrics: metrics(SUMMARY_METRICS) },
    // 2 — daily series
    {
      dateRanges: [{ startDate: w.series.start, endDate: w.series.end }],
      dimensions: [{ name: "date" }],
      metrics: metrics(["activeUsers", "sessions", "screenPageViews"]),
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: SERIES_DAYS + 5,
    },
    // 3 — top pages. pagePath still carries the query string here; buildSnapshot strips and re-adds.
    {
      dateRanges: [{ startDate: w.current.start, endDate: w.current.end }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: metrics(["screenPageViews", "activeUsers", "userEngagementDuration"]),
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 300,
    },
    // 4 — acquisition channels
    {
      dateRanges: [{ startDate: w.current.start, endDate: w.current.end }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: metrics(["sessions"]),
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 20,
    },
    // 5 — countries
    {
      dateRanges: [{ startDate: w.current.start, endDate: w.current.end }],
      dimensions: [{ name: "country" }],
      metrics: metrics(["activeUsers"]),
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 50,
    },
    // 6 — devices
    {
      dateRanges: [{ startDate: w.current.start, endDate: w.current.end }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: metrics(["sessions"]),
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    },
    // 7 — events (this is where `useTrack()` shows up)
    {
      dateRanges: [{ startDate: w.current.start, endDate: w.current.end }],
      dimensions: [{ name: "eventName" }],
      metrics: metrics(["eventCount", "activeUsers"]),
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 40,
    },
  ];
}

function num(row: Ga4Row | undefined, key: string): number {
  const v = row?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function totalsOf(report: Ga4Report | undefined): AnalyticsTotals {
  const row = reportTotals(report);
  return {
    activeUsers: num(row, "activeUsers"),
    newUsers: num(row, "newUsers"),
    sessions: num(row, "sessions"),
    screenPageViews: num(row, "screenPageViews"),
    engagedSessions: num(row, "engagedSessions"),
    engagementRate: num(row, "engagementRate"),
    averageSessionDuration: num(row, "averageSessionDuration"),
    eventCount: num(row, "eventCount"),
  };
}

/** `20260710` (GA4's `date` dimension) → `2026-07-10`. Anything else passes through untouched. */
export function normalizeGaDate(raw: string): string {
  return /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
}

/**
 * Path as we are willing to publish it: query string and hash dropped, trailing slash removed,
 * locale prefix kept (`/en/...` is a real, different page).
 *
 * The query string is the whole point: `/buscar?q=<what someone typed>` is a visitor's words, and
 * this snapshot ends up on a public page. Dropping it also merges `?utm_*`-tagged arrivals into the
 * page they actually landed on.
 */
export function publicPath(raw: string): string {
  const path = String(raw || "").split("#")[0].split("?")[0];
  if (!path) return "/";
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return trimmed || "/";
}

function pagesOf(report: Ga4Report | undefined, limit = TOP_PAGES): AnalyticsPageRow[] {
  const merged = new Map<string, AnalyticsPageRow & { titleWeight: number }>();
  for (const row of reportRows(report)) {
    const path = publicPath(String(row.pagePath ?? ""));
    const views = num(row, "screenPageViews");
    const entry = merged.get(path);
    if (!entry) {
      merged.set(path, {
        path,
        title: String(row.pageTitle ?? "").trim(),
        views,
        users: num(row, "activeUsers"),
        // Held as a running sum of seconds; divided by users once the path is fully merged.
        avgEngagementSeconds: num(row, "userEngagementDuration"),
        titleWeight: views,
      });
      continue;
    }
    entry.views += views;
    entry.users += num(row, "activeUsers");
    entry.avgEngagementSeconds += num(row, "userEngagementDuration");
    // Same path, several titles (a title changed mid-window): keep the most-seen one.
    if (views > entry.titleWeight) {
      entry.title = String(row.pageTitle ?? "").trim();
      entry.titleWeight = views;
    }
  }
  return [...merged.values()]
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map(({ titleWeight, ...page }) => ({
      ...page,
      avgEngagementSeconds: page.users > 0 ? Math.round(page.avgEngagementSeconds / page.users) : 0,
    }));
}

/** Top-N breakdown with each row's share of the FULL total (so the shares of a truncated list sum to <1). */
function sharesOf(
  report: Ga4Report | undefined,
  dimension: string,
  metric: string,
  limit: number
): AnalyticsShareRow[] {
  const rows = reportRows(report)
    .map((row) => ({ label: String(row[dimension] ?? "").trim() || "—", value: num(row, metric) }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.slice(0, limit).map((row) => ({ ...row, share: total > 0 ? row.value / total : 0 }));
}

function eventsOf(report: Ga4Report | undefined, limit = TOP_EVENTS): AnalyticsEventRow[] {
  return reportRows(report)
    .map((row) => ({
      name: String(row.eventName ?? "").trim(),
      count: num(row, "eventCount"),
      users: num(row, "activeUsers"),
    }))
    .filter((row) => !!row.name)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function dailyOf(report: Ga4Report | undefined): AnalyticsDailyPoint[] {
  return reportRows(report)
    .map((row) => ({
      date: normalizeGaDate(String(row.date ?? "")),
      activeUsers: num(row, "activeUsers"),
      sessions: num(row, "sessions"),
      screenPageViews: num(row, "screenPageViews"),
    }))
    .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface BuildSnapshotContext {
  propertyId: string;
  windows: AnalyticsWindows;
  asOf: string;
  timezone: string;
}

/** Pure: the eight reports of {@link analyticsReportRequests}, in order, become one snapshot. */
export function buildSnapshot(reports: Ga4Report[], ctx: BuildSnapshotContext): SiteAnalyticsSnapshot {
  return {
    key: SITE_ANALYTICS_KEY,
    propertyId: ctx.propertyId,
    asOf: ctx.asOf,
    // The property's own reporting timezone wins when GA4 states it — that is the clock the numbers
    // were bucketed with, whatever we guessed when we asked for the dates.
    timezone: reports[0]?.metadata?.timeZone || ctx.timezone,
    range: ctx.windows.current,
    previousRange: ctx.windows.previous,
    totals: totalsOf(reports[0]),
    previousTotals: totalsOf(reports[1]),
    daily: dailyOf(reports[2]),
    topPages: pagesOf(reports[3]),
    channels: sharesOf(reports[4], "sessionDefaultChannelGroup", "sessions", 10),
    countries: sharesOf(reports[5], "country", "activeUsers", TOP_COUNTRIES),
    devices: sharesOf(reports[6], "deviceCategory", "sessions", 5),
    events: eventsOf(reports[7]),
  };
}

/** A snapshot with no traffic at all is almost always a misconfiguration, not a quiet month. */
export function snapshotIsEmpty(snapshot: SiteAnalyticsSnapshot): boolean {
  return snapshot.totals.sessions === 0 && snapshot.totals.screenPageViews === 0 && !snapshot.daily.length;
}

export async function refreshSiteAnalytics(now: Date = new Date()): Promise<SiteAnalyticsSnapshot> {
  const timezone = process.env.GA4_TIMEZONE || DEFAULT_TIMEZONE;
  const windows = analyticsWindows(now, timezone);
  const reports = await runReports(analyticsReportRequests(windows));
  return buildSnapshot(reports, {
    propertyId: ga4PropertyId(),
    windows,
    asOf: now.toISOString(),
    timezone,
  });
}
