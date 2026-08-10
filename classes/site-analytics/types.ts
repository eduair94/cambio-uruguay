// Shape of the public site-analytics snapshot (GA4 Data API → app Mongo → /estadisticas-del-sitio).
//
// Deliberately AGGREGATE ONLY: totals, day buckets and top-N breakdowns. Nothing here can identify a
// visitor, and page paths are stored without their query string (see refresh.ts) so that a search
// term typed into /buscar never ends up on a public page.

/** The metric block reported for a date range. */
export interface AnalyticsTotals {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
  engagedSessions: number;
  /** 0..1 — engagedSessions / sessions, as GA4 computes it. */
  engagementRate: number;
  /** Seconds. */
  averageSessionDuration: number;
  eventCount: number;
}

export interface AnalyticsDailyPoint {
  /** `YYYY-MM-DD` in the property's timezone. */
  date: string;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
}

export interface AnalyticsPageRow {
  /** Path only — query string stripped. */
  path: string;
  title: string;
  views: number;
  users: number;
  /** Seconds of average engagement time on the page. */
  avgEngagementSeconds: number;
}

/** A generic "label + weight + share of the total" row (channels, countries, devices, languages). */
export interface AnalyticsShareRow {
  label: string;
  value: number;
  /** 0..1 share of the breakdown total. */
  share: number;
}

export interface AnalyticsEventRow {
  name: string;
  count: number;
  users: number;
}

export interface SiteAnalyticsSnapshot {
  /** Always `site` — one living document, upserted. */
  key: string;
  /** Numeric GA4 property the numbers came from. Kept so a property switch is visible in the data. */
  propertyId: string;
  /** ISO timestamp of the refresh. */
  asOf: string;
  /** Property reporting timezone (GA4 report metadata), e.g. `America/Montevideo`. */
  timezone: string;
  /** Inclusive reporting window for `totals`, in the property timezone. */
  range: { start: string; end: string; days: number };
  /** The equally long window immediately before `range`, for the deltas. */
  previousRange: { start: string; end: string; days: number };
  totals: AnalyticsTotals;
  previousTotals: AnalyticsTotals;
  /** Longer daily series (default 90 days) for the trend chart. */
  daily: AnalyticsDailyPoint[];
  topPages: AnalyticsPageRow[];
  channels: AnalyticsShareRow[];
  countries: AnalyticsShareRow[];
  devices: AnalyticsShareRow[];
  events: AnalyticsEventRow[];
}

export const SITE_ANALYTICS_KEY = "site";
