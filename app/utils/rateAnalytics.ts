import type { RateAnalyticsPoint, RateAnalyticsSeries } from '../types/api'

export type RateAnalyticsSide = 'buy' | 'sell'

export interface RateAnalyticsAnomaly {
  origin: string
  houseName: string
  side: RateAnalyticsSide
  at: string
  value: number
  baseline: number
  deviationPct: number
}

export interface PreparedHouseRateSeries {
  origin: string
  houseName: string
  type: string
  data: Array<number | null>
  availableCount: number
  gapCount: number
  anomalies: RateAnalyticsAnomaly[]
}

export interface PreparedRateChartSeries {
  labels: string[]
  series: PreparedHouseRateSeries[]
  anomalies: RateAnalyticsAnomaly[]
}

export interface AggregateRatePoint {
  at: string
  buy: number | null
  sell: number | null
  purchasingPower: number | null
}

export interface AnalyticsHouseSummary {
  origin: string
  houseName: string
  type: string
  buy: number
  sell: number
  sellChangePct: number
  purchasingPower: number
}

const average = (values: number[]): number | null =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!
}

const finiteRate = (point: RateAnalyticsPoint | undefined, side: RateAnalyticsSide) => {
  const value = point?.[side]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Detect only isolated spikes: the value must differ at least 8% from a stable
 * local neighbourhood and immediately return to the prior range. Sustained
 * market moves therefore remain visible.
 */
export function detectRateAnomalies(
  series: RateAnalyticsSeries,
  side: RateAnalyticsSide
): RateAnalyticsAnomaly[] {
  const anomalies: RateAnalyticsAnomaly[] = []

  for (let index = 1; index < series.points.length - 1; index++) {
    const value = finiteRate(series.points[index], side)
    const previous = finiteRate(series.points[index - 1], side)
    const next = finiteRate(series.points[index + 1], side)
    if (value === null || previous === null || next === null) continue

    const neighbours = [previous, next]
    const previousTwo = finiteRate(series.points[index - 2], side)
    const nextTwo = finiteRate(series.points[index + 2], side)
    if (previousTwo !== null) neighbours.push(previousTwo)
    if (nextTwo !== null) neighbours.push(nextTwo)

    const baseline = median(neighbours)
    if (baseline <= 0) continue
    const neighbourSpreadPct =
      ((Math.max(...neighbours) - Math.min(...neighbours)) / baseline) * 100
    const deviationPct = (Math.abs(value - baseline) / baseline) * 100

    if (deviationPct >= 8 && neighbourSpreadPct <= 5) {
      anomalies.push({
        origin: series.origin,
        houseName: series.houseName,
        side,
        at: series.points[index]!.at,
        value,
        baseline,
        deviationPct,
      })
    }
  }

  return anomalies
}

export function cleanRateAnalyticsSeries(series: RateAnalyticsSeries[]): RateAnalyticsSeries[] {
  return series.map(item => {
    const anomalousBuy = new Set(detectRateAnomalies(item, 'buy').map(anomaly => anomaly.at))
    const anomalousSell = new Set(detectRateAnomalies(item, 'sell').map(anomaly => anomaly.at))
    return {
      ...item,
      points: item.points.map(point => ({
        ...point,
        buy: anomalousBuy.has(point.at) ? null : point.buy,
        sell: anomalousSell.has(point.at) ? null : point.sell,
      })),
    }
  })
}

/**
 * Align every house to the union of timestamps. Missing observations remain
 * `null`, which makes Chart.js break the line when `spanGaps` is disabled.
 */
export function prepareRateChartSeries(
  rawSeries: RateAnalyticsSeries[],
  side: RateAnalyticsSide,
  hideAnomalies = true
): PreparedRateChartSeries {
  const labels = [...new Set(rawSeries.flatMap(item => item.points.map(point => point.at)))].sort()
  const prepared = rawSeries.map(item => {
    const values = new Map(
      item.points
        .map(point => [point.at, finiteRate(point, side)] as const)
        .filter((entry): entry is readonly [string, number] => entry[1] !== null)
    )
    const anomalies = detectRateAnomalies(item, side)
    const anomalousDates = new Set(anomalies.map(anomaly => anomaly.at))

    return {
      origin: item.origin,
      houseName: item.houseName,
      type: item.type,
      data: labels.map(at =>
        hideAnomalies && anomalousDates.has(at) ? null : (values.get(at) ?? null)
      ),
      availableCount: values.size,
      gapCount: labels.length - values.size,
      anomalies,
    }
  })

  return {
    labels,
    series: prepared,
    anomalies: prepared.flatMap(item => item.anomalies),
  }
}

export function aggregateRateSeries(
  series: RateAnalyticsSeries[],
  uyuBudget: number
): AggregateRatePoint[] {
  const timestamps = [...new Set(series.flatMap(item => item.points.map(point => point.at)))].sort()

  return timestamps.map(at => {
    const points = series
      .map(item => item.points.find(point => point.at === at))
      .filter((point): point is NonNullable<typeof point> => Boolean(point))
    const buy = average(
      points.map(point => point.buy).filter((value): value is number => typeof value === 'number')
    )
    const sell = average(
      points.map(point => point.sell).filter((value): value is number => typeof value === 'number')
    )
    return {
      at,
      buy,
      sell,
      purchasingPower: sell && uyuBudget > 0 ? uyuBudget / sell : null,
    }
  })
}

function firstNumber(values: Array<number | null>): number | null {
  return values.find((value): value is number => typeof value === 'number') ?? null
}

function lastNumber(values: Array<number | null>): number | null {
  return [...values].reverse().find((value): value is number => typeof value === 'number') ?? null
}

export function summarizeAnalyticsHouses(
  series: RateAnalyticsSeries[],
  uyuBudget: number
): AnalyticsHouseSummary[] {
  return series
    .map(item => {
      const sellValues = item.points.map(point => point.sell)
      const first = firstNumber(sellValues)
      const last = lastNumber(sellValues) ?? item.currentSell
      const sellChangePct = first && first !== 0 ? ((last - first) / first) * 100 : 0
      return {
        origin: item.origin,
        houseName: item.houseName,
        type: item.type,
        buy: item.currentBuy,
        sell: item.currentSell,
        sellChangePct,
        purchasingPower: item.currentSell > 0 ? uyuBudget / item.currentSell : 0,
      }
    })
    .sort((a, b) => a.sell - b.sell)
}
