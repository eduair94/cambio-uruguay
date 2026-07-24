import type { RateAnalyticsSeries } from '../types/api'

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
