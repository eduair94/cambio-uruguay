// Framework-agnostic data-merging for the "compare exchange houses over time"
// page (`pages/comparar.vue`).
//
// These are PURE functions (no Vue/Nuxt runtime, no global state) so they can be
// unit-tested in plain Node via vitest. The page imports and reuses them — it
// must NOT duplicate this alignment math.
//
// Types come from the shared API contract; imported relatively so this module
// stays runtime-agnostic.
import type { EvolutionPoint } from '../types/api'

/** Which side of the quote to plot. */
export type PriceKind = 'buy' | 'sell'

/** A single house's evolution series, tagged with the label to show in the legend. */
export interface LabelledSeries {
  /** Human-readable name shown in the chart legend (e.g. the exchange house name). */
  label: string
  /** The raw evolution points for this house, in any order. */
  points: readonly EvolutionPoint[]
}

/** One chart.js dataset: a label plus per-date values (null where the house has no data). */
export interface ComparisonDataset {
  label: string
  data: (number | null)[]
}

/** Chart-ready payload consumable by `components/charts/LineChart.vue`. */
export interface ComparisonChartData {
  /** Unified, ascending list of ISO date strings shared by every dataset. */
  labels: string[]
  datasets: ComparisonDataset[]
}

/**
 * Pick the buy or sell value from an evolution point.
 *
 * Kept as a tiny named helper so the selection is testable in isolation and the
 * page never reaches into `point.buy`/`point.sell` directly.
 */
export function pickPrice(point: EvolutionPoint, kind: PriceKind): number {
  return kind === 'buy' ? point.buy : point.sell
}

/**
 * A value this many times above/below the series median is treated as a
 * data-entry error (e.g. a `2981` typo among ~30-peso quotes) rather than real
 * movement. Exchange rates don't swing 10x over a few months, so the band is
 * wide enough never to drop legitimate fluctuation. Dropping these points keeps
 * one bad quote from inflating the shared y-axis and flattening every line.
 */
export const OUTLIER_RATIO = 10

/** Median of a numeric list (0 for an empty list). Used as a robust centre. */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/**
 * Align multiple labelled evolution series onto a single, sorted date axis.
 *
 * - Collects the union of every series' dates and sorts them ascending.
 * - For each series, emits one value per date: the chosen `kind` price when the
 *   house has a point for that date, otherwise `null` (so chart.js leaves a gap
 *   rather than connecting across missing data).
 * - When a series carries duplicate points for the same date, the last one wins.
 *
 * Empty input (or series with no points) yields empty `labels` and one empty
 * dataset per series, so the caller can render a stable, predictable chart.
 *
 * @param series one entry per exchange house to overlay.
 * @param kind   plot buy or sell prices (default `'sell'`).
 */
export function buildComparisonChartData(
  series: readonly LabelledSeries[],
  kind: PriceKind = 'sell'
): ComparisonChartData {
  // Build the unified, sorted date axis from the union of all series' dates.
  const dateSet = new Set<string>()
  for (const s of series) {
    for (const point of s.points) {
      dateSet.add(point.date)
    }
  }
  const labels = Array.from(dateSet).sort((a, b) => a.localeCompare(b))

  // Map each series to a date -> price lookup (last duplicate wins), then project
  // it onto the shared axis, filling gaps with null. Non-finite prices (some
  // houses omit buy/sell) are skipped, and gross outliers are dropped so a
  // single bad quote can't distort the axis shared by every line.
  const datasets: ComparisonDataset[] = series.map(s => {
    const byDate = new Map<string, number>()
    for (const point of s.points) {
      const value = pickPrice(point, kind)
      if (typeof value === 'number' && Number.isFinite(value)) {
        byDate.set(point.date, value)
      }
    }

    const med = median([...byDate.values()])
    const isOutlier = (v: number): boolean =>
      med > 0 && (v > med * OUTLIER_RATIO || v < med / OUTLIER_RATIO)

    return {
      label: s.label,
      data: labels.map(date => {
        const value = byDate.get(date)
        if (value === undefined || isOutlier(value)) return null
        return value
      }),
    }
  })

  return { labels, datasets }
}

/**
 * Time-range presets for the comparison chart. `'all'` keeps every point; the
 * finite keys map to a rolling window measured in days (see {@link RANGE_DAYS}).
 */
export type RangeKey = '7d' | '1m' | '3m' | '6m' | '1y' | 'all'

/** Ordered list of every range key, for validation and UI iteration. */
export const RANGE_KEYS: readonly RangeKey[] = ['7d', '1m', '3m', '6m', '1y', 'all']

/** How many days each finite range spans. `'all'` has no bound and is absent here. */
export const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = {
  '7d': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Narrow an arbitrary string to a {@link RangeKey}, falling back to `'all'`. */
export function parseRangeKey(raw: unknown): RangeKey {
  return typeof raw === 'string' && (RANGE_KEYS as readonly string[]).includes(raw)
    ? (raw as RangeKey)
    : 'all'
}

/**
 * Keep only the points within `range` of the most recent date present across
 * every series.
 *
 * The window is anchored to the latest data point in the input — not "today" —
 * so a house whose feed lags by a few days still shows a full window instead of
 * an empty tail. `'all'` (or input with no parseable dates) returns the series
 * unchanged. Series identity/order is preserved so downstream colour-by-index
 * and legend labels stay stable.
 */
export function filterSeriesByRange(
  series: readonly LabelledSeries[],
  range: RangeKey
): LabelledSeries[] {
  if (range === 'all') return series.map(s => ({ ...s, points: [...s.points] }))

  let maxMs = Number.NEGATIVE_INFINITY
  for (const s of series) {
    for (const point of s.points) {
      const ms = Date.parse(point.date)
      if (Number.isFinite(ms) && ms > maxMs) maxMs = ms
    }
  }
  if (!Number.isFinite(maxMs)) return series.map(s => ({ ...s, points: [...s.points] }))

  const cutoff = maxMs - RANGE_DAYS[range] * DAY_MS
  return series.map(s => ({
    ...s,
    points: s.points.filter(point => {
      const ms = Date.parse(point.date)
      return Number.isFinite(ms) && ms >= cutoff
    }),
  }))
}

/** Summary statistics for a single house over the visible window. */
export interface DatasetStats {
  /** Most recent (last non-null) value, or `null` if the window has no data. */
  current: number | null
  min: number | null
  max: number | null
  avg: number | null
}

/**
 * Derive summary stats from a merged dataset's aligned values.
 *
 * The input is one `ComparisonDataset.data` array (ascending by date, `null`
 * for gaps and dropped outliers). Computing the table from the SAME cleaned,
 * range-filtered series that feeds the chart guarantees the numbers below the
 * chart always match the lines above it.
 */
export function datasetStats(data: readonly (number | null)[]): DatasetStats {
  const values = data.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (values.length === 0) return { current: null, min: null, max: null, avg: null }

  // Labels are ascending, so the last finite value is the most recent quote.
  let current: number | null = null
  for (let i = data.length - 1; i >= 0; i--) {
    const v = data[i]
    if (typeof v === 'number' && Number.isFinite(v)) {
      current = v
      break
    }
  }

  return {
    current,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
  }
}
