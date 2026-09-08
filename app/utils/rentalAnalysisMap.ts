import type { RentalAnalysisQuery, RentalAnalysisResponse } from './rentalAnalysis'
import { rentalAnalysisLocationName } from './rentalAnalysisComparison'
import type {
  RentalZoneBoundaryCollection,
  RentalZoneCrime,
  RentalZoneResponse,
  RentalZoneServiceCategory,
  RentalZoneServices,
} from './rentalZoneTypes'

export type RentalAnalysisMapLayer = 'prices' | 'crime' | 'services'
export type RentalAnalysisMapOffense =
  | 'all'
  | 'hurto'
  | 'rapina'
  | 'lesiones'
  | 'violencia-domestica'
  | 'abigeato'
export interface RentalAnalysisMapSelection {
  layer: RentalAnalysisMapLayer
  statistic: 'mean' | 'median'
  service: RentalZoneServiceCategory
  offense: RentalAnalysisMapOffense
}
export interface RentalAnalysisMapRow {
  id: string
  name: string
  department: string
  rental: {
    name: string
    count: number
    mean: number | null
    median: number | null
    p25: number | null
    p75: number | null
  } | null
  services: RentalZoneServices | null
  crime: RentalZoneCrime | null
}
export const RENTAL_ANALYSIS_MAP_MINIMUM = 8
export const RENTAL_ANALYSIS_MAP_PALETTE = ['#d6e6f5', '#a8cae8', '#75a9d7', '#3d80ba', '#15517e']
export const RENTAL_ANALYSIS_MAP_NO_DATA_COLOR = '#d4d9df'

/** Neighborhood changes do not change the all-neighborhood comparison cohort. */
export function rentalAnalysisMapMatches(
  analysis: RentalAnalysisResponse | null,
  query: RentalAnalysisQuery
): boolean {
  return Boolean(
    analysis &&
      rentalAnalysisLocationName(analysis.query.department) ===
        rentalAnalysisLocationName(query.department) &&
      analysis.query.currency === query.currency &&
      analysis.query.type === query.type &&
      analysis.query.bedrooms === query.bedrooms
  )
}
const finitePositive = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
const finiteCount = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null

/** Join only explicit official names and IDs. Converted context prices never enter this result. */
export function rentalAnalysisMapRows(
  boundaries: RentalZoneBoundaryCollection | null,
  analysis: RentalAnalysisResponse | null,
  query: RentalAnalysisQuery,
  context: RentalZoneResponse | null
): RentalAnalysisMapRow[] {
  if (rentalAnalysisLocationName(query.department) !== 'montevideo') return []
  const prices = rentalAnalysisMapMatches(analysis, query) ? analysis!.neighborhoods : []
  const zones =
    context && rentalAnalysisLocationName(context.filters.department) === 'montevideo'
      ? context.zones
      : []
  return (boundaries?.features ?? [])
    .filter(feature => rentalAnalysisLocationName(feature.properties.department) === 'montevideo')
    .map(feature => {
      const { zoneId, name, department, officialCode } = feature.properties
      const matches = prices.filter(
        row => rentalAnalysisLocationName(row.name) === rentalAnalysisLocationName(name)
      )
      const rental = matches.length === 1 ? matches[0]! : null
      const contexts = zones.filter(
        zone =>
          zone.id === zoneId &&
          zone.officialCode === officialCode &&
          zone.boundaryAvailable &&
          rentalAnalysisLocationName(zone.ref.department) ===
            rentalAnalysisLocationName(department) &&
          rentalAnalysisLocationName(zone.ref.neighborhood) === rentalAnalysisLocationName(name)
      )
      const territorial = contexts.length === 1 ? contexts[0]! : null
      const crime = territorial?.crime
      return {
        id: zoneId,
        name,
        department,
        rental: rental
          ? {
              name: rental.name,
              count: finiteCount(rental.rent?.count ?? rental.count) ?? 0,
              mean: finitePositive(rental.rentMean),
              median: finitePositive(rental.rent?.median),
              p25: finitePositive(rental.rent?.p25),
              p75: finitePositive(rental.rent?.p75),
            }
          : null,
        services: territorial?.services ?? null,
        crime:
          crime &&
          crime.geography === 'neighborhood' &&
          rentalAnalysisLocationName(crime.geographyName) === rentalAnalysisLocationName(name)
            ? crime
            : null,
      }
    })
}

export function rentalAnalysisMapMetric(
  row: RentalAnalysisMapRow,
  selection: RentalAnalysisMapSelection
): number | null {
  if (selection.layer === 'prices')
    return row.rental && row.rental.count >= RENTAL_ANALYSIS_MAP_MINIMUM
      ? finitePositive(row.rental[selection.statistic])
      : null
  if (selection.layer === 'services')
    return row.services && row.services.status !== 'unavailable'
      ? finiteCount(row.services.counts[selection.service])
      : null
  if (!row.crime || row.crime.status === 'unavailable') return null
  return finiteCount(
    selection.offense === 'all' ? row.crime.total : row.crime.byOffense[selection.offense]
  )
}

export interface RentalAnalysisMapScale {
  count: number
  min: number | null
  max: number | null
}
export function rentalAnalysisMapScale(values: Array<number | null>): RentalAnalysisMapScale {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value) && value >= 0
  )
  return {
    count: valid.length,
    min: valid.length ? Math.min(...valid) : null,
    max: valid.length ? Math.max(...valid) : null,
  }
}
export function rentalAnalysisMapColor(
  value: number | null,
  scale: RentalAnalysisMapScale
): string {
  if (value === null || !Number.isFinite(value) || scale.min === null || scale.max === null)
    return RENTAL_ANALYSIS_MAP_NO_DATA_COLOR
  if (scale.min === scale.max) return RENTAL_ANALYSIS_MAP_PALETTE[2]!
  const position = Math.floor(((value - scale.min) / (scale.max - scale.min)) * 5)
  return RENTAL_ANALYSIS_MAP_PALETTE[Math.max(0, Math.min(4, position))]!
}
