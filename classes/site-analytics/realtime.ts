// "Ahora mismo": GA4's Realtime report — who is on the site in the last 30 minutes.
//
// This is the one part of /estadisticas-del-sitio that cannot come from the daily snapshot, so it is
// served on demand by the API (`GET /site-analytics-realtime`) instead of by the cron. Three round
// trips (no batch endpoint exists for realtime), behind a Redis TTL so the two clustered API
// instances share one answer and GA4 sees at most a couple of calls a minute no matter how many
// people have the page open.
//
// Aggregate only, like the rest of the page: a headcount, a per-minute shape, and page TITLES —
// realtime has no path dimension, which incidentally removes any chance of a query string leaking.
import { reportRows, reportTotals, runRealtimeReport } from "./ga4";
import type { Ga4Report, Ga4Row } from "./ga4";

/** GA4 keeps 30 one-minute buckets, `minutesAgo` 00..29. */
export const REALTIME_MINUTES = 30;
export const REALTIME_TOP_PAGES = 8;

export interface RealtimeMinute {
  /** 0 = the minute happening now, 29 = half an hour ago. */
  minutesAgo: number;
  activeUsers: number;
}

export interface RealtimePage {
  title: string;
  activeUsers: number;
  views: number;
}

export interface RealtimeSnapshot {
  /** When the API computed this (ISO). The page shows the age, not the clock. */
  asOf: string;
  /** Unique users in the last 30 minutes — NOT the sum of `perMinute` (the same person recurs). */
  activeUsers: number;
  /** Unique users in the last 5 minutes. */
  activeUsersLast5: number;
  /** Oldest first, so it reads left to right as a sparkline. Always 30 entries. */
  perMinute: RealtimeMinute[];
  pages: RealtimePage[];
}

function num(row: Ga4Row | undefined, key: string): number {
  const v = row?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Pure: the three realtime reports (totals, by-minute, by-page) become one snapshot. */
export function buildRealtime(reports: (Ga4Report | undefined)[], asOf: string): RealtimeSnapshot {
  const [totals, minutes, pages] = reports;

  const byMinute = new Map<number, number>();
  for (const row of reportRows(minutes)) {
    const minutesAgo = Number(row.minutesAgo);
    if (!Number.isFinite(minutesAgo) || minutesAgo < 0 || minutesAgo >= REALTIME_MINUTES) continue;
    byMinute.set(minutesAgo, (byMinute.get(minutesAgo) || 0) + num(row, "activeUsers"));
  }
  // Fill the gaps: GA4 omits minutes with no activity, and a sparkline that silently skips them
  // would compress a quiet half hour into a busy-looking line.
  const perMinute: RealtimeMinute[] = [];
  for (let minutesAgo = REALTIME_MINUTES - 1; minutesAgo >= 0; minutesAgo--) {
    perMinute.push({ minutesAgo, activeUsers: byMinute.get(minutesAgo) || 0 });
  }

  const last5 = perMinute
    .filter((m) => m.minutesAgo < 5)
    .reduce((max, m) => Math.max(max, m.activeUsers), 0);

  return {
    asOf,
    activeUsers: num(reportTotals(totals), "activeUsers"),
    // Per-minute rows count the same person once per minute, so a 5-minute SUM would overcount a
    // single visitor five times. The busiest of those minutes is the honest floor.
    activeUsersLast5: last5,
    perMinute,
    pages: reportRows(pages)
      .map((row) => ({
        title: String(row.unifiedScreenName ?? "").trim(),
        activeUsers: num(row, "activeUsers"),
        views: num(row, "screenPageViews"),
      }))
      .filter((page) => !!page.title)
      .sort((a, b) => b.activeUsers - a.activeUsers || b.views - a.views)
      .slice(0, REALTIME_TOP_PAGES),
  };
}

export async function fetchRealtime(now: Date = new Date()): Promise<RealtimeSnapshot> {
  const reports = await Promise.all([
    runRealtimeReport({ metrics: [{ name: "activeUsers" }] }),
    runRealtimeReport({
      dimensions: [{ name: "minutesAgo" }],
      metrics: [{ name: "activeUsers" }],
      limit: REALTIME_MINUTES,
    }),
    runRealtimeReport({
      dimensions: [{ name: "unifiedScreenName" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 25,
    }),
  ]);
  return buildRealtime(reports, now.toISOString());
}

/** What the API answers when GA4 is not wired up yet — the page hides the live panel on this. */
export function emptyRealtime(now: Date = new Date()): RealtimeSnapshot {
  return buildRealtime([], now.toISOString());
}
