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
  /** Power, water and complaint layers of the official area this zone maps to. */
  utilities: RentalZoneUtilities | null
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
  utilities: RentalZoneUtilitiesMeta | null
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

/** Neighbourhood service attributes the directory can filter by ("the third with the fewest problems"). */
export type RentalServiceAttribute =
  | 'luz'
  | 'agua'
  | 'alumbrado'
  | 'saneamiento'
  | 'limpieza'
  | 'calles'
  | 'denuncias'
export type RentalServiceLevel = 'low' | 'mid' | 'high'
/**
 * One requested bound on the listing's official area: `max` keeps areas whose value is at most
 * that number (the slider); `null` keeps the third with the fewest problems (the bare `?servicios=`
 * form older links and the MCP still send).
 */
export interface RentalServiceSelection {
  attribute: RentalServiceAttribute
  max: number | null
}
/** What the directory can offer for one attribute right now, and the range its slider spans. */
export interface RentalServiceFilterOption {
  attribute: RentalServiceAttribute
  status: RentalServiceStatus
  available: boolean
  /** Upper bound of the best third (inclusive), when the layer is usable. */
  low: number | null
  /** Upper bound of the middle third (inclusive). */
  high: number | null
  zones: number
  /** Every ranked value, ascending, so a slider can say how many areas a bound keeps. */
  values: number[]
}
export type RentalClaimCategory = 'alumbrado' | 'saneamiento' | 'limpieza' | 'calles'
/** Status of a service layer; `collecting` = the power ledger has not observed enough days yet. */
export type RentalServiceStatus = RentalZoneDataStatus | 'collecting'
export interface RentalZoneOfficial {
  /** "mvd:<INE code>" or "ute:<UTE locality id>". */
  id: string
  name: string
  /** exact: same official name; alias: measured from the listings' own coordinates. */
  match: 'exact' | 'alias'
  share: number | null
}
export interface RentalZonePower {
  geography: 'zone' | 'department'
  geographyName: string
  customers: number
  /** Minutes per customer per 30 days without power, unplanned cuts. */
  unplannedMinutes: number
  plannedMinutes: number
  cutsPerMonth: number
  cutsPerThousand: number
}
export interface RentalZoneWater {
  geography: 'zone' | 'department'
  geographyName: string
  notices: number
  hours: number
}
export interface RentalZoneClaims {
  counts: Record<RentalClaimCategory, number>
  perThousand: Record<RentalClaimCategory, number> | null
  customers: number | null
}
export interface RentalZoneUtilities {
  official: RentalZoneOfficial | null
  power: RentalZonePower | null
  water: RentalZoneWater | null
  claims: RentalZoneClaims | null
  levels: Partial<Record<RentalServiceAttribute, RentalServiceLevel>>
}
export interface RentalZoneUtilitiesMeta {
  power: {
    status: RentalServiceStatus
    observedFrom: string | null
    observedTo: string | null
    observedDays: number
    coverage: number
    source: RentalZoneSource
  } | null
  water: {
    status: RentalZoneDataStatus
    periodFrom: string
    periodTo: string
    notices: number
    montevideoNotices: number
    montevideoMatched: number
    source: RentalZoneSource
  } | null
  claims: {
    status: RentalZoneDataStatus
    periodFrom: string
    periodTo: string
    source: RentalZoneSource
  } | null
  thresholds: Partial<Record<RentalServiceAttribute, { low: number; high: number; zones: number }>>
}
export type RentalImpactAttribute = RentalServiceAttribute
export interface RentalZoneImpact {
  status: RentalZoneDataStatus
  generatedAt: string
  rentalDataAsOf: string
  minimumListings: number
  zones: Array<{ zone: string; name: string; n: number; rentM2: number }>
  attributes: Array<{
    attribute: RentalImpactAttribute
    zones: number
    rho: number
    rhoLow: number
    rhoHigh: number
    xLow: number
    xHigh: number
    pct: number
    pctLow: number
    pctHigh: number
    verdict: 'lower' | 'higher' | 'inconclusive'
    points: Array<{ zone: string; x: number; y: number }>
  }>
  joint: {
    zones: number
    r2: number
    coefficients: Array<{
      attribute: RentalImpactAttribute
      pctPerSd: number
      low: number
      high: number
    }>
  } | null
}

/** One row of the neighbourhood bars on a listing card. */
export type RentalZoneScoreAttribute = RentalServiceAttribute | 'servicios'
export interface RentalZoneScoreRow {
  attribute: RentalZoneScoreAttribute
  value: number
  /** Share of the other zones with data that fare worse (fewer services, or more problems). */
  betterThan: number
  /** Zones this one is compared with (itself included). */
  zones: number
}
export interface RentalZoneScores {
  generatedAt: string
  zones: Record<string, { name: string; department: string; rows: RentalZoneScoreRow[] }>
  /** Resolve an advertised barrio to a zone id when the listing carries none. */
  resolver: {
    ine: Record<string, string>
    aliases: Record<string, string>
    localities: Record<string, string>
  }
  periods: {
    power: {
      from: string | null
      to: string | null
      status: RentalServiceStatus
      /** Days the ledger has observed so far, and how many it needs before it publishes. */
      observedDays: number
      minDays: number
    } | null
    water: { from: string; to: string } | null
    claims: { from: string; to: string } | null
    crimeTo: string | null
    servicesAsOf: string | null
  }
}
