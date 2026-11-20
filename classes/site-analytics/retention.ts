// Read-only retention analysis. No models, scheduled jobs, or revenue metrics.
import { exactDimension, reportRows, runReports } from "./ga4";
import type { Ga4Report, Ga4ReportRequest, Ga4Row } from "./ga4";

const DAY_MS = 86400000;
const PAGE_SIZE = 2000;
const MAX_ROWS = 100000;
const METRICS = ["sessions", "engagedSessions", "screenPageViews", "userEngagementDuration", "activeUsers"];
type Runner = (requests: Ga4ReportRequest[]) => Promise<Ga4Report[]>;

function dayOffset(day: string, offset: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);
}

export function retentionWindows(timeZone: string, endDate?: string, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  // Leave a complete additional day for GA4 processing by default. Closed does not mean final.
  const end = endDate === undefined ? dayOffset(today, -2) : endDate;
  const parsed = new Date(`${end}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== end) {
    throw new Error("retention: --end-date must be a real YYYY-MM-DD date");
  }
  if (end >= today) throw new Error("retention: --end-date must precede today in the GA4 property timezone");
  return {
    current: { startDate: dayOffset(end, -27), endDate: end },
    previous: { startDate: dayOffset(end, -55), endDate: dayOffset(end, -28) },
  };
}

/** Derive rates from this API row only. Never sum users or landing-page sessions into site totals. */
export function retentionRates(row: Ga4Row, minSessions = 30) {
  const sessions = metricValue(row.sessions, "sessions");
  const engaged = metricValue(row.engagedSessions, "engagedSessions");
  const seconds = metricValue(row.userEngagementDuration, "userEngagementDuration");
  const users = metricValue(row.activeUsers, "activeUsers");
  const views = metricValue(row.screenPageViews, "screenPageViews");
  assertSessionCounts(sessions, engaged);
  return {
    ...row,
    engagementRate: sessions ? engaged / sessions : null,
    bounceRate: sessions ? 1 - engaged / sessions : null,
    viewsPerSession: sessions ? views / sessions : null,
    engagementSecondsPerSession: sessions ? seconds / sessions : null,
    engagementSecondsPerActiveUser: users ? seconds / users : null,
    sample: sessions >= minSessions ? "sufficient-for-review" : "small",
  };
}

function metricValue(raw: unknown, name: string): number {
  if ((typeof raw !== "string" && typeof raw !== "number") || (typeof raw === "string" && !raw.trim())) {
    throw new Error(`retention: missing metric value for ${name}`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`retention: invalid metric value for ${name}`);
  return value;
}

function assertSessionCounts(sessions: number, engaged: number) {
  if (engaged > sessions) throw new Error("retention: engagedSessions exceeds sessions");
}

/** Check the raw response before reportRows can coerce a missing/invalid cell to zero. */
function validateReportCells(report: Ga4Report, request: Ga4ReportRequest) {
  const rows = report.rows ?? [];
  if (!Array.isArray(rows)) throw new Error("retention: invalid report rows");
  const dimensions = (request.dimensions || []).map((header) => header.name);
  const metrics = request.metrics.map((header) => header.name);
  for (const [headers, expected] of [
    [report.dimensionHeaders, dimensions],
    [report.metricHeaders, metrics],
  ] as const) {
    // An empty protobuf response can omit fields. There are no values to
    // misassociate then; any supplied headers must still match the request.
    if (headers === undefined && rows.length === 0) continue;
    if (headers === undefined && expected.length === 0) continue;
    if (!Array.isArray(headers) || headers.length !== expected.length || headers.some((header, i) => header?.name !== expected[i])) {
      throw new Error("retention: report headers do not match requested dimensions and metrics");
    }
  }
  for (const row of rows) {
    const dimensionValues = row?.dimensionValues ?? [];
    const metricValues = row?.metricValues;
    if (!Array.isArray(dimensionValues) || dimensionValues.length !== dimensions.length || dimensionValues.some((cell) => typeof cell?.value !== "string")) {
      throw new Error("retention: incomplete dimension cells");
    }
    if (!Array.isArray(metricValues) || metricValues.length !== metrics.length) {
      throw new Error("retention: incomplete metric cells");
    }
    const values = metricValues.map((cell, i) => metricValue(cell?.value, metrics[i]));
    const sessionsIndex = metrics.indexOf("sessions");
    const engagedIndex = metrics.indexOf("engagedSessions");
    if (sessionsIndex >= 0 && engagedIndex >= 0) assertSessionCounts(values[sessionsIndex], values[engagedIndex]);
  }
}

/** Refuse a partial table: silently losing the tail biases which landing pages look important. */
export async function completeRetentionReport(
  request: Ga4ReportRequest,
  run: Runner = runReports,
  pageSize = PAGE_SIZE,
  maxRows = MAX_ROWS,
) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !Number.isSafeInteger(maxRows) || maxRows < 1) {
    throw new Error("retention: page size and row budget must be positive integers");
  }
  const dimensions = (request.dimensions || []).map((d) => d.name);
  const rows: Ga4Row[] = [];
  const seen = new Set<string>();
  let total: number | undefined;
  let metadata: Ga4Report["metadata"];
  let pages = 0;
  while (total === undefined || rows.length < total) {
    const [report] = await run([{
      ...request, limit: pageSize, offset: rows.length,
      ...(dimensions.length ? { orderBys: dimensions.map((dimensionName) => ({ dimension: { dimensionName, orderType: "ALPHANUMERIC" } })) } : {}),
    }]);
    if (!report) throw new Error("retention: GA4 omitted a requested report");
    validateReportCells(report, request);
    const batch = reportRows(report);
    const count = report.rowCount ?? (batch.length === 0 ? 0 : NaN);
    if (!Number.isSafeInteger(count) || count < 0 || count > maxRows) throw new Error("retention: invalid or out-of-budget rowCount");
    if (total !== undefined && count !== total) throw new Error("retention: rowCount changed during pagination; rerun later");
    if (pages && JSON.stringify(report.metadata) !== JSON.stringify(metadata)) throw new Error("retention: metadata changed during pagination");
    total = count;
    metadata = report.metadata;
    if (batch.length !== Math.min(pageSize, total - rows.length)) throw new Error("retention: incomplete GA4 page");
    for (const row of batch) {
      const identity = JSON.stringify(dimensions.map((name) => row[name]));
      if (seen.has(identity)) throw new Error("retention: duplicate dimension row during pagination");
      seen.add(identity);
      rows.push(row);
    }
    pages++;
  }
  return { rowCount: total!, pages, metadata, rows };
}

export async function fetchRetentionReport(
  options: { endDate?: string; minSessions?: number; now?: Date } = {},
  run: Runner = runReports,
) {
  const minSessions = options.minSessions ?? 30;
  if (!Number.isSafeInteger(minSessions) || minSessions < 1) throw new Error("retention: minSessions must be a positive integer");
  // Ask the property itself; the server/user timezone need not match GA4's reporting day.
  const [probe] = await run([{
    dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }], metrics: [{ name: "sessions" }], limit: 1,
  }]);
  const timeZone = probe?.metadata?.timeZone;
  if (!timeZone) throw new Error("retention: GA4 did not return its property timezone");
  const windows = retentionWindows(timeZone, options.endDate, options.now);
  const reports: Record<string, Awaited<ReturnType<typeof completeRetentionReport>>> = {};
  for (const [period, window] of Object.entries(windows)) {
    const base = (dimensions: string[], uruguay: boolean): Ga4ReportRequest => ({
      dateRanges: [window], metrics: METRICS.map((name) => ({ name })),
      ...(dimensions.length ? { dimensions: dimensions.map((name) => ({ name })) } : {}),
      ...(uruguay ? { dimensionFilter: exactDimension("countryId", "UY") } : {}),
    });
    const definitions: Record<string, Ga4ReportRequest> = {
      globalTotals: base([], false), uruguayTotals: base([], true),
      globalDevices: base(["deviceCategory"], false), uruguayDevices: base(["deviceCategory"], true),
      uruguayLandings: base(["landingPage", "deviceCategory"], true),
      uruguayChannels: base(["sessionDefaultChannelGroup", "deviceCategory"], true),
      uruguayEvents: { ...base(["eventName"], true), metrics: [{ name: "eventCount" }, { name: "totalUsers" }] },
    };
    for (const [name, request] of Object.entries(definitions)) {
      const report = await completeRetentionReport(request, run);
      if (report.metadata?.timeZone !== timeZone) throw new Error("retention: inconsistent property timezone");
      reports[`${period}.${name}`] = {
        ...report,
        rows: name.endsWith("Events") ? report.rows : report.rows.map((r) => retentionRates(r, minSessions)),
      };
    }
  }
  return {
    generatedAt: (options.now || new Date()).toISOString(), timeZone, windows, minSessions,
    notes: [
      "Site totals are independent GA4 reports, never sums of landing-page or user rows.",
      "Engagement time is foreground engagement, not elapsed session length.",
      "Closed days can still be revised by GA4; default end date leaves one extra processing day.",
      "Small samples and (not set) landing rows remain visible; neither proves a content defect.",
      "Event counts do not form a funnel without matching exposure and click scopes.",
    ],
    reports,
  };
}
