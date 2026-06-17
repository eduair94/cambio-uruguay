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
