/** Search references use an explicit department and the advertised neighborhood/locality. */
export interface RentalZoneRef {
  department: string
  neighborhood: string
}
export interface RentalZonePreferences {
  mode: 'prefer' | 'only'
  include: RentalZoneRef[]
  exclude: RentalZoneRef[]
}
export type RentalZonePropertyType = 'apartamento' | 'casa'
export type RentalZoneBedrooms = 'any' | '0' | '1' | '2' | '3' | '4plus'
export type RentalZoneDataStatus = 'ready' | 'stale' | 'unavailable'
export interface RentalZoneDistribution {
  count: number
  mean: number | null
  median: number | null
  p25: number | null
  p75: number | null
}
export interface RentalZonePrices {
  rent: RentalZoneDistribution
  commonExpenses: RentalZoneDistribution
  monthlyTotal: RentalZoneDistribution
  builtSquareMeter: RentalZoneDistribution
  sources: number
  lastSeenFrom: string | null
  lastSeenTo: string | null
}
export type RentalZoneServiceCategory =
  | 'supermarket'
  | 'grocery'
  | 'pharmacy'
  | 'healthcare'
  | 'transit'
  | 'education'
export interface RentalZoneSource {
  name: string
  url: string
  licenseUrl?: string
  dataAsOf: string | null
  fetchedAt: string | null
}
export interface RentalZoneServices {
  status: RentalZoneDataStatus
  counts: Partial<Record<RentalZoneServiceCategory, number>>
  source: RentalZoneSource
  coverage: 'partial'
}
export interface RentalZoneCrime {
  status: RentalZoneDataStatus
  geography: 'neighborhood' | 'department'
  geographyName: string
  periodFrom: string | null
  periodTo: string | null
  /** Registered events, never an estimate of individual risk or unreported crimes. */
  total: number | null
  byOffense: Record<string, number>
  source: RentalZoneSource
}
export interface RentalZone {
  id: string
  ref: RentalZoneRef
  officialCode: string | null
  prices: RentalZonePrices
  services: RentalZoneServices | null
  crime: RentalZoneCrime | null
  boundaryAvailable: boolean
}
export interface RentalZoneResponse {
  version: 1
  status: RentalZoneDataStatus
  generatedAt: string | null
  rentalDataAsOf: string | null
  sampleMinimum: number
  filters: {
    department: string
    propertyType: RentalZonePropertyType
    bedrooms: RentalZoneBedrooms
  }
  departments: string[]
  zones: RentalZone[]
  boundaryUrl: string | null
  sources: RentalZoneSource[]
}
export type RentalZoneGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
export interface RentalZoneBoundaryCollection {
  type: 'FeatureCollection'
  source: RentalZoneSource
  features: Array<{
    type: 'Feature'
    properties: { zoneId: string; name: string; department: string; officialCode: string }
    geometry: RentalZoneGeometry
  }>
}
