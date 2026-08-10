// Pure model for /estadisticas-del-sitio: the shape the backend writes, plus every derivation the
// page draws (deltas, 7-day average, labels, staleness). No Vue/Nuxt imports — vitest-node loads it.
//
// The numbers come from GA4 through the backend job `currency-site-analytics`
// (root `sync_site_analytics.ts` → app Mongo `siteanalyticssnapshots` → /api/site-analytics).
// Everything here is AGGREGATE: totals, whole days, top-N lists. Page paths arrive already stripped
// of their query string by the backend, so nothing a visitor typed can reach this page.

export interface AnalyticsTotals {
  activeUsers: number
  newUsers: number
  sessions: number
  screenPageViews: number
  engagedSessions: number
  /** 0..1 */
  engagementRate: number
  /** Seconds. */
  averageSessionDuration: number
  eventCount: number
}

export interface AnalyticsDailyPoint {
  date: string
  activeUsers: number
  sessions: number
  screenPageViews: number
}

export interface AnalyticsPageRow {
  path: string
  title: string
  views: number
  users: number
  avgEngagementSeconds: number
}

export interface AnalyticsShareRow {
  label: string
  value: number
  /** 0..1 */
  share: number
}

export interface AnalyticsEventRow {
  name: string
  count: number
  users: number
}

export interface AnalyticsRange {
  start: string
  end: string
  days: number
}

export interface SiteAnalyticsSnapshot {
  key: string
  propertyId: string
  asOf: string
  timezone: string
  range: AnalyticsRange
  previousRange: AnalyticsRange
  totals: AnalyticsTotals
  previousTotals: AnalyticsTotals
  daily: AnalyticsDailyPoint[]
  topPages: AnalyticsPageRow[]
  channels: AnalyticsShareRow[]
  countries: AnalyticsShareRow[]
  devices: AnalyticsShareRow[]
  events: AnalyticsEventRow[]
}

// --- "Ahora mismo" (GA4 Realtime, served on demand by the API, not by the daily job) ---

export interface RealtimeMinute {
  /** 0 = the minute happening now, 29 = half an hour ago. */
  minutesAgo: number
  activeUsers: number
}

export interface RealtimePage {
  /** Realtime has no path dimension — only the page title. */
  title: string
  activeUsers: number
  views: number
}

export interface RealtimeSnapshot {
  asOf: string
  /** Unique users in the last 30 minutes. NOT the sum of `perMinute`. */
  activeUsers: number
  activeUsersLast5: number
  /** Oldest first, 30 entries when GA4 answered. */
  perMinute: RealtimeMinute[]
  pages: RealtimePage[]
}

/** Bar heights (0..1) for the live sparkline, scaled to the busiest minute in view. */
export function sparklineHeights(perMinute: RealtimeMinute[]): number[] {
  const values = (perMinute || []).map(m => m.activeUsers)
  const peak = Math.max(0, ...values)
  // A flat zero row would draw nothing at all; a flat non-zero row should read as flat, not as a
  // full-height wall, so an all-equal series lands at half height.
  if (peak <= 0) return values.map(() => 0)
  const min = Math.min(...values)
  if (min === peak) return values.map(() => 0.5)
  return values.map(v => v / peak)
}

/** Whether there is anything live worth showing. Zero users for half an hour = hide the panel. */
export function hasLiveActivity(realtime: RealtimeSnapshot | null | undefined): boolean {
  if (!realtime) return false
  return realtime.activeUsers > 0 || (realtime.perMinute || []).some(m => m.activeUsers > 0)
}

/** Seconds since the realtime snapshot was computed, floored at 0 (clock skew must not go negative). */
export function realtimeAgeSeconds(asOf: string, now: Date = new Date()): number {
  const at = Date.parse(asOf || '')
  if (!Number.isFinite(at)) return 0
  return Math.max(0, Math.round((now.getTime() - at) / 1000))
}

/**
 * The five events marked as key events (conversions) in the GA4 UI. Pinned here because GA4 matches
 * them by literal string: renaming one silently zeroes a conversion report weeks later.
 * `tests/unit/ga4-key-events.test.ts` asserts each is still emitted from its call site.
 */
export const KEY_EVENTS = [
  'outbound_click', // proxy for "went to a casa to change money"
  'alert_created',
  'newsletter_signup',
  'where_to_change',
  'convert',
] as const

export type KeyEventName = (typeof KEY_EVENTS)[number]

export function isKeyEvent(name: string): name is KeyEventName {
  return (KEY_EVENTS as readonly string[]).includes(name)
}

/** GA4 emits these on its own (Enhanced Measurement); they say nothing about what we built. */
const AUTOMATIC_EVENTS = new Set([
  'page_view',
  'session_start',
  'first_visit',
  'user_engagement',
  'scroll',
  'click',
  'form_start',
  'form_submit',
  'file_download',
  'video_start',
  'video_progress',
  'video_complete',
])

export function isAutomaticEvent(name: string): boolean {
  return AUTOMATIC_EVENTS.has(name)
}

// Named `TrendDirection`, not `Direction`: utils/attribution.ts already auto-exports that name and
// Nuxt's auto-import would silently pick one of the two for the whole app.
export type TrendDirection = 'up' | 'down' | 'flat'

export interface MetricDelta {
  value: number
  previous: number
  /** Signed fraction (0.12 = +12%). `null` when there is no previous value to divide by. */
  deltaPct: number | null
  direction: TrendDirection
}

/** Period-over-period change. A metric that went 0 → something has no percentage, only a direction. */
export function metricDelta(value: number, previous: number): MetricDelta {
  const safeValue = Number.isFinite(value) ? value : 0
  const safePrevious = Number.isFinite(previous) ? previous : 0
  const deltaPct = safePrevious > 0 ? (safeValue - safePrevious) / safePrevious : null
  const diff = safeValue - safePrevious
  // 0.5% either way is noise at this traffic level, not a trend.
  const direction: TrendDirection =
    deltaPct === null
      ? diff > 0
        ? 'up'
        : diff < 0
          ? 'down'
          : 'flat'
      : Math.abs(deltaPct) < 0.005
        ? 'flat'
        : deltaPct > 0
          ? 'up'
          : 'down'
  return { value: safeValue, previous: safePrevious, deltaPct, direction }
}

export type MetricFormat = 'count' | 'percent' | 'duration'

export interface SummaryMetric extends MetricDelta {
  key:
    | 'activeUsers'
    | 'sessions'
    | 'screenPageViews'
    | 'engagementRate'
    | 'averageSessionDuration'
    | 'newUsers'
  format: MetricFormat
  icon: string
}

/** The KPI row, in reading order. Labels stay out — the page resolves them through i18n. */
export function summaryMetrics(snapshot: SiteAnalyticsSnapshot): SummaryMetric[] {
  const spec: { key: SummaryMetric['key']; format: MetricFormat; icon: string }[] = [
    { key: 'activeUsers', format: 'count', icon: 'mdi-account-group-outline' },
    { key: 'sessions', format: 'count', icon: 'mdi-play-circle-outline' },
    { key: 'screenPageViews', format: 'count', icon: 'mdi-file-eye-outline' },
    { key: 'newUsers', format: 'count', icon: 'mdi-account-plus-outline' },
    { key: 'engagementRate', format: 'percent', icon: 'mdi-gesture-tap' },
    { key: 'averageSessionDuration', format: 'duration', icon: 'mdi-timer-outline' },
  ]
  return spec.map(s => ({
    ...s,
    ...metricDelta(snapshot.totals?.[s.key] ?? 0, snapshot.previousTotals?.[s.key] ?? 0),
  }))
}

/** The last `days` points of the series, oldest first. */
export function seriesSlice(daily: AnalyticsDailyPoint[], days: number): AnalyticsDailyPoint[] {
  if (!Array.isArray(daily)) return []
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  return days > 0 ? sorted.slice(-days) : sorted
}

/**
 * Trailing average over `window` points. Daily traffic on a site this size swings ~40% between a
 * Tuesday and a Sunday; without this the chart shows the week, not the trend. Leading points
 * average over what exists, so the line starts where the data does instead of after a week of gaps.
 */
export function movingAverage(values: number[], window = 7): number[] {
  if (window <= 1) return [...values]
  return values.map((_, i) => {
    const from = Math.max(0, i - window + 1)
    const slice = values.slice(from, i + 1)
    return slice.reduce((sum, v) => sum + v, 0) / slice.length
  })
}

/** The busiest day of the series (ties resolved by the later date). */
export function busiestDay(daily: AnalyticsDailyPoint[]): AnalyticsDailyPoint | null {
  return (daily || []).reduce<AnalyticsDailyPoint | null>(
    (best, point) => (!best || point.activeUsers >= best.activeUsers ? point : best),
    null
  )
}

const TITLE_SUFFIX = /\s*[|·—-]\s*cambio\s*uruguay.*$/i

/** Page title as it reads in a table: the site name suffix dropped, the path as fallback. */
export function pageLabel(row: Pick<AnalyticsPageRow, 'path' | 'title'>): string {
  const title = (row.title || '').replace(TITLE_SUFFIX, '').trim()
  if (title && title.toLowerCase() !== 'cambio uruguay') return title
  return row.path
}

/** Share of the window's page views that a page row accounts for. */
export function pageShare(row: AnalyticsPageRow, totals: AnalyticsTotals): number {
  const total = totals?.screenPageViews || 0
  return total > 0 ? row.views / total : 0
}

/**
 * Whether the snapshot is old enough to say so on the page. The job runs daily, so a snapshot older
 * than two days means the cron did not run (or GA4 refused it) — the page should not present
 * week-old numbers as "the last 28 days" without a warning.
 */
export function isStale(asOf: string, now: Date = new Date(), hours = 48): boolean {
  const at = Date.parse(asOf || '')
  if (!Number.isFinite(at)) return true
  return now.getTime() - at > hours * 3600_000
}

/** `95.4` seconds → `1 min 35 s`; under a minute stays in seconds. */
export function formatDuration(
  seconds: number,
  unit: { min: string; sec: string } = { min: 'min', sec: 's' }
): string {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  if (!mins) return `${secs} ${unit.sec}`
  return `${mins} ${unit.min} ${secs} ${unit.sec}`
}

export function formatCount(value: number, locale = 'es-UY'): string {
  return new Intl.NumberFormat(locale).format(Math.round(Number(value) || 0))
}

export function formatPercent(fraction: number, locale = 'es-UY', digits = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(fraction) || 0)
}

/** Signed percentage for the delta chips (`+12,4 %`). `null` renders as an em dash by the caller. */
export function formatDelta(deltaPct: number | null, locale = 'es-UY'): string | null {
  if (deltaPct === null || !Number.isFinite(deltaPct)) return null
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(deltaPct)
}

/** `2026-07-10` → a short local label, without dragging a date library in. */
export function formatDay(date: string, locale = 'es-UY'): string {
  const [y, m, d] = (date || '').split('-').map(Number)
  if (!y || !m || !d) return date || ''
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}
