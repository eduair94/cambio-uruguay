import type {
  RentalAnalysisAreaBasis,
  RentalAnalysisListing,
  RentalAnalysisMeasure,
  RentalAnalysisSummary,
  RentalAnalysisType,
} from './rentalAnalysis'
import type { RentalSource } from './rentals'

export interface RentalAnalysisPriceStats {
  count: number
  mean: number
  median: number
  p10: number
  p25: number
  p75: number
  p90: number
  min: number
  max: number
}
export interface RentalAnalysisAreaBand extends RentalAnalysisSummary {
  basis: RentalAnalysisAreaBasis
  key: string
  /** Inclusive lower bound and exclusive upper bound; null ends at the 450 m² eligibility cap. */
  min: number
  max: number | null
}
export interface RentalAnalysisDetails {
  priceStats: RentalAnalysisPriceStats | null
  areaBands: RentalAnalysisAreaBand[]
  propertyTypes: Array<RentalAnalysisSummary & { type: RentalAnalysisType }>
  bathrooms: Array<RentalAnalysisSummary & { bathrooms: number }>
  parking: {
    knownCount: number
    withParking: RentalAnalysisSummary
    withoutParking: RentalAnalysisSummary
  }
  sources: Array<{ source: RentalSource; count: number }>
  quality: {
    total: number
    expensesKnown: number
    builtAreaKnown: number
    totalAreaKnown: number
    bathroomsKnown: number
    parkingKnown: number
    observedWithin48Hours: number
  }
  /** Area-spaced descriptive sample, not a random sample or a fitted relationship. */
  scatter: Record<RentalAnalysisAreaBasis, Array<{ area: number; price: number }>>
}

const rounded = (value: number) => Math.round(value * 100) / 100
const sortedValues = (values: readonly number[]) =>
  values.filter(Number.isFinite).sort((a, b) => a - b)
function quantile(sorted: readonly number[], p: number): number {
  const index = (sorted.length - 1) * p
  const low = Math.floor(index),
    high = Math.ceil(index)
  return rounded(sorted[low]! + (sorted[high]! - sorted[low]!) * (index - low))
}
export function rentalAnalysisMeasure(values: readonly number[]): RentalAnalysisMeasure | null {
  const sorted = sortedValues(values)
  return sorted.length
    ? {
        count: sorted.length,
        median: quantile(sorted, 0.5),
        p25: quantile(sorted, 0.25),
        p75: quantile(sorted, 0.75),
      }
    : null
}
export function rentalAnalysisPriceStats(
  values: readonly number[]
): RentalAnalysisPriceStats | null {
  const sorted = sortedValues(values)
  if (!sorted.length) return null
  return {
    count: sorted.length,
    mean: rounded(sorted.reduce((total, value) => total + value, 0) / sorted.length),
    median: quantile(sorted, 0.5),
    p10: quantile(sorted, 0.1),
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    min: rounded(sorted[0]!),
    max: rounded(sorted.at(-1)!),
  }
}
export function rentalAnalysisAreaFor(
  row: RentalAnalysisListing,
  basis: RentalAnalysisAreaBasis
): number | null {
  if (basis === 'total' && row.type !== 'apartamento') return null
  const area = row.areas ? row.areas[basis] : row.areaBasis === basis ? row.area : null
  return typeof area === 'number' && Number.isFinite(area) && area >= 20 && area <= 450
    ? area
    : null
}
const knownExpenses = (row: RentalAnalysisListing) =>
  row.commonExpenses !== null && Number.isFinite(row.commonExpenses) && row.commonExpenses >= 0
const knownBathrooms = (row: RentalAnalysisListing) =>
  row.bathrooms !== null &&
  Number.isInteger(row.bathrooms) &&
  row.bathrooms >= 1 &&
  row.bathrooms <= 10
const knownParking = (row: RentalAnalysisListing) =>
  row.parkingSpaces !== null &&
  Number.isInteger(row.parkingSpaces) &&
  row.parkingSpaces >= 0 &&
  row.parkingSpaces <= 10

export function rentalAnalysisSummary(rows: RentalAnalysisListing[]): RentalAnalysisSummary {
  const prices = rows.map(row => row.price).filter(Number.isFinite)
  const known = rows.filter(knownExpenses)
  const perM2 = (basis: RentalAnalysisAreaBasis) =>
    rentalAnalysisMeasure(
      rows.flatMap(row => {
        const area = rentalAnalysisAreaFor(row, basis)
        return area === null ? [] : [row.price / area]
      })
    )
  const dates = rows.map(row => row.lastSeen).sort()
  return {
    count: rows.length,
    rent: rentalAnalysisMeasure(prices),
    rentMean: prices.length
      ? rounded(prices.reduce((sum, price) => sum + price, 0) / prices.length)
      : null,
    expenses: rentalAnalysisMeasure(known.map(row => row.commonExpenses!)),
    monthly: rentalAnalysisMeasure(known.map(row => row.price + row.commonExpenses!)),
    expensesKnownCount: known.length,
    expensesCoveragePct: rows.length ? Math.round((known.length / rows.length) * 1000) / 10 : 0,
    perM2: { built: perM2('built'), total: perM2('total') },
    oldestLastSeen: dates[0] || null,
    newestLastSeen: dates.at(-1) || null,
  }
}

const AREA_BANDS = [
  { key: '20-39', min: 20, max: 40 },
  { key: '40-59', min: 40, max: 60 },
  { key: '60-79', min: 60, max: 80 },
  { key: '80-119', min: 80, max: 120 },
  { key: '120-199', min: 120, max: 200 },
  { key: '200-450', min: 200, max: null },
] as const
const AREA_BASES = ['built', 'total'] as const
const SCATTER_LIMIT = 80

/** Receives the same filtered, fresh, unique-property, single-currency cohort as the headline. */
export function buildRentalAnalysisDetails(
  rows: RentalAnalysisListing[],
  now: Date
): RentalAnalysisDetails {
  const areaRows = (basis: RentalAnalysisAreaBasis) =>
    rows.flatMap(row => {
      const area = rentalAnalysisAreaFor(row, basis)
      return area === null ? [] : [{ row, area }]
    })
  const built = areaRows('built'),
    total = areaRows('total')
  const byArea = { built, total }
  const areaBands = AREA_BASES.flatMap(basis =>
    AREA_BANDS.map(band => ({
      basis,
      ...band,
      ...rentalAnalysisSummary(
        byArea[basis]
          .filter(({ area }) => area >= band.min && (band.max === null || area < band.max))
          .map(({ row }) => row)
      ),
    }))
  )
  const scatter = (basis: RentalAnalysisAreaBasis) => {
    const sorted = byArea[basis]
      .slice()
      .sort((a, b) => a.area - b.area || a.row.advertId.localeCompare(b.row.advertId))
    const count = Math.min(SCATTER_LIMIT, sorted.length)
    return Array.from({ length: count }, (_, index) => {
      const position = count <= 1 ? 0 : Math.round((index * (sorted.length - 1)) / (count - 1))
      const { area, row } = sorted[position]!
      return { area, price: row.price }
    })
  }
  const bathrooms = rows.filter(knownBathrooms),
    parking = rows.filter(knownParking)
  const sources = new Map<RentalSource, number>()
  for (const row of rows) sources.set(row.source, (sources.get(row.source) || 0) + 1)
  const recentCutoff = now.getTime() - 48 * 60 * 60 * 1000
  return {
    priceStats: rentalAnalysisPriceStats(rows.map(row => row.price)),
    areaBands,
    propertyTypes: (['apartamento', 'casa'] as const).map(type => ({
      type,
      ...rentalAnalysisSummary(rows.filter(row => row.type === type)),
    })),
    bathrooms: [...new Set(bathrooms.map(row => row.bathrooms!))]
      .sort((a, b) => a - b)
      .map(value => ({
        bathrooms: value,
        ...rentalAnalysisSummary(bathrooms.filter(row => row.bathrooms === value)),
      })),
    parking: {
      knownCount: parking.length,
      withParking: rentalAnalysisSummary(parking.filter(row => row.parkingSpaces! > 0)),
      withoutParking: rentalAnalysisSummary(parking.filter(row => row.parkingSpaces === 0)),
    },
    sources: [...sources.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
    quality: {
      total: rows.length,
      expensesKnown: rows.filter(knownExpenses).length,
      builtAreaKnown: built.length,
      totalAreaKnown: total.length,
      bathroomsKnown: bathrooms.length,
      parkingKnown: parking.length,
      observedWithin48Hours: rows.filter(row => {
        const observed = Date.parse(row.lastSeen)
        return observed >= recentCutoff && observed <= now.getTime()
      }).length,
    },
    scatter: { built: scatter('built'), total: scatter('total') },
  }
}
