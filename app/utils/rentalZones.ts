import type {
  RentalZone,
  RentalZoneBedrooms,
  RentalZoneBoundaryCollection,
  RentalZoneCrime,
  RentalZoneDataStatus,
  RentalZoneDistribution,
  RentalZoneGeometry,
  RentalZonePrices,
  RentalZonePropertyType,
  RentalZoneResponse,
  RentalZoneServiceCategory,
  RentalZoneSource,
} from './rentalZoneTypes'

export const RENTAL_ZONE_SAMPLE_MINIMUM = 8
export const RENTAL_ZONE_DEPARTMENTS = [
  'Artigas',
  'Canelones',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Montevideo',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
]
const OFFENSES = ['hurto', 'rapina', 'lesiones', 'violencia-domestica', 'abigeato'] as const
const SERVICES: RentalZoneServiceCategory[] = [
  'supermarket',
  'grocery',
  'pharmacy',
  'healthcare',
  'transit',
  'education',
]
const DAY = 86_400_000
const BEDROOMS = ['any', '0', '1', '2', '3', '4plus'] as const
const INE_URL =
  'https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/mapas-vectoriales-ano-2011'
const CRIME_URL =
  'https://catalogodatos.gub.uy/dataset/ministerio-del-interior-delitos_denunciados_en_el_uruguay'
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
const count = (value: unknown, maximum = 1_000_000): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum
const clean = (value: unknown, maximum = 100): string | null => {
  if (typeof value !== 'string' || value.length > maximum || /[\p{Cc}\p{Cf}<>]/u.test(value))
    return null
  return value.normalize('NFC').trim().replace(/\s+/g, ' ') || null
}
export const rentalZoneName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
const department = (value: unknown): string | null => {
  const text = clean(value, 50)
  return text
    ? RENTAL_ZONE_DEPARTMENTS.find(item => rentalZoneName(item) === rentalZoneName(text)) || null
    : null
}
const date = (value: unknown): string | null => {
  if (
    typeof value !== 'string' ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z)?$/.test(value)
  )
    return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value.slice(0, 10)
    ? value
    : null
}
const status = (
  value: string | null,
  now: number,
  readyMs: number,
  maximumMs: number
): RentalZoneDataStatus => {
  const age = value ? now - Date.parse(value) : NaN
  return !Number.isFinite(age) || age < 0 || age > maximumMs
    ? 'unavailable'
    : age > readyMs
      ? 'stale'
      : 'ready'
}
export interface RentalZoneQuery {
  department: string
  propertyType: RentalZonePropertyType
  bedrooms: RentalZoneBedrooms
}
export function normalizeRentalZoneQuery(input: Record<string, unknown>): RentalZoneQuery {
  const raw = record(input)
  if (Object.keys(raw).some(key => !['department', 'propertyType', 'bedrooms'].includes(key)))
    throw new Error('Invalid zone query')
  const scoped =
    raw.department === undefined || raw.department === '' ? '' : department(raw.department)
  const propertyType =
    raw.propertyType === undefined || raw.propertyType === '' ? 'apartamento' : raw.propertyType
  const bedrooms = raw.bedrooms === undefined || raw.bedrooms === '' ? 'any' : raw.bedrooms
  if (
    scoped === null ||
    !['apartamento', 'casa'].includes(propertyType as string) ||
    !BEDROOMS.includes(bedrooms as RentalZoneBedrooms)
  )
    throw new Error('Invalid zone query')
  return {
    department: scoped,
    propertyType: propertyType as RentalZonePropertyType,
    bedrooms: bedrooms as RentalZoneBedrooms,
  }
}

function source(
  raw: unknown,
  kind: 'geometry' | 'crime' | 'services' | 'market'
): RentalZoneSource {
  const value = record(raw)
  const labels = {
    geometry: ['INE · Aproximaciones a barrios de Montevideo (2011)', INE_URL, INE_URL],
    crime: [
      'Ministerio del Interior · AECA · Delitos registrados',
      CRIME_URL,
      'https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/sites/agencia-gobierno-electronico-sociedad-informacion-conocimiento/files/documentos/publicaciones/licencia_de_datos_abiertos_0.pdf',
    ],
    services: [
      'OpenStreetMap · Servicios indexados',
      'https://download.geofabrik.de/south-america/uruguay.html',
      'https://www.openstreetmap.org/copyright',
    ],
    market: [
      'Cambio Uruguay · Avisos de alquiler',
      'https://cambio-uruguay.com/alquileres-uruguay',
      '',
    ],
  }
  const [name, url, licenseUrl] = labels[kind]
  return {
    name: name!,
    url: url!,
    ...(licenseUrl ? { licenseUrl } : {}),
    dataAsOf: date(value.dataAsOf),
    fetchedAt: date(value.fetchedAt),
  }
}
const emptyDistribution = (): RentalZoneDistribution => ({
  count: 0,
  mean: null,
  median: null,
  p25: null,
  p75: null,
})
export const emptyRentalZonePrices = (): RentalZonePrices => ({
  rent: emptyDistribution(),
  commonExpenses: emptyDistribution(),
  monthlyTotal: emptyDistribution(),
  builtSquareMeter: emptyDistribution(),
  sources: 0,
  lastSeenFrom: null,
  lastSeenTo: null,
})
function distribution(input: unknown, allowZero: boolean): RentalZoneDistribution | null {
  const raw = record(input)
  if (!count(raw.count, 60_000)) return null
  if (raw.count < RENTAL_ZONE_SAMPLE_MINIMUM) return { ...emptyDistribution(), count: raw.count }
  const fields = ['mean', 'median', 'p25', 'p75'] as const
  const values = {} as Record<(typeof fields)[number], number>
  for (const key of fields) {
    const value = raw[key]
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      (!allowZero && value === 0) ||
      value > 100_000_000
    )
      return null
    values[key] = value
  }
  if (values.p25 > values.median || values.median > values.p75) return null
  return { count: raw.count, ...values }
}
function prices(input: unknown): RentalZonePrices | null {
  const raw = record(input)
  const rent = distribution(raw.rent, false),
    commonExpenses = distribution(raw.commonExpenses, true)
  const monthlyTotal = distribution(raw.monthlyTotal, false),
    builtSquareMeter = distribution(raw.builtSquareMeter, false)
  if (
    !rent ||
    !commonExpenses ||
    !monthlyTotal ||
    !builtSquareMeter ||
    !count(raw.sources, rent.count) ||
    commonExpenses.count > rent.count ||
    monthlyTotal.count > commonExpenses.count ||
    builtSquareMeter.count > rent.count
  )
    return null
  const lastSeenFrom = date(raw.lastSeenFrom),
    lastSeenTo = date(raw.lastSeenTo)
  if (!lastSeenFrom || !lastSeenTo || Date.parse(lastSeenFrom) > Date.parse(lastSeenTo)) return null
  return {
    rent,
    commonExpenses,
    monthlyTotal,
    builtSquareMeter,
    sources: raw.sources,
    lastSeenFrom,
    lastSeenTo,
  }
}
interface PublicBucket extends RentalZoneQuery {
  neighborhood: string
  prices: RentalZonePrices
}
interface PublicMarket {
  generatedAt: string
  rentalDataAsOf: string
  buckets: PublicBucket[]
}
interface PublicCrimeCounts {
  total: number
  byOffense: Record<string, number>
}
interface PublicCrime {
  periodFrom: string
  periodTo: string
  source: RentalZoneSource
  byCode: Record<string, PublicCrimeCounts>
  byDepartment: Record<string, PublicCrimeCounts>
}
interface PublicServices {
  source: RentalZoneSource
  byCode: Record<string, Partial<Record<RentalZoneServiceCategory, number>>>
}
export interface RentalZoneSnapshots {
  market: PublicMarket | null
  context: {
    generatedAt: string | null
    boundaries: RentalZoneBoundaryCollection | null
    crime: PublicCrime | null
    services: PublicServices | null
  } | null
}

function publicGeometry(raw: unknown, budget: { points: number }): RentalZoneGeometry | null {
  const input = record(raw)
  if (
    !['Polygon', 'MultiPolygon'].includes(input.type as string) ||
    !Array.isArray(input.coordinates)
  )
    return null
  const polygons = input.type === 'Polygon' ? [input.coordinates] : input.coordinates
  if (!polygons.length || polygons.length > 200) return null
  const converted: number[][][][] = []
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length || polygon.length > 200) return null
    const rings: number[][][] = []
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4 || ring.length > 100_000) return null
      const points: number[][] = []
      for (const point of ring) {
        if (++budget.points > 100_000 || !Array.isArray(point) || point.length !== 2) return null
        const [lng, lat] = point
        if (
          typeof lng !== 'number' ||
          typeof lat !== 'number' ||
          !Number.isFinite(lng) ||
          !Number.isFinite(lat) ||
          lng <= -56.6 ||
          lng >= -55.9 ||
          lat <= -35 ||
          lat >= -34.6
        )
          return null
        points.push([lng, lat])
      }
      if (points[0]![0] !== points.at(-1)![0] || points[0]![1] !== points.at(-1)![1]) return null
      rings.push(points)
    }
    converted.push(rings)
  }
  return input.type === 'Polygon'
    ? { type: 'Polygon', coordinates: converted[0]! }
    : { type: 'MultiPolygon', coordinates: converted }
}
function boundaries(raw: unknown): RentalZoneBoundaryCollection | null {
  const geometry = record(raw)
  if (!Array.isArray(geometry.zones) || geometry.zones.length !== 62) return null
  const features: RentalZoneBoundaryCollection['features'] = [],
    codes = new Set<string>(),
    names = new Set<string>()
  const budget = { points: 0 }
  for (const input of geometry.zones) {
    const zone = record(input),
      code = zone.officialCode
    const name = clean(zone.name)
    if (
      typeof code !== 'string' ||
      !/^(?:[1-9]|[1-5]\d|6[0-2])$/.test(code) ||
      codes.has(code) ||
      !name ||
      names.has(rentalZoneName(name)) ||
      department(zone.department) !== 'Montevideo'
    )
      return null
    const shape = publicGeometry(zone.geometry, budget)
    if (!shape) return null
    codes.add(code)
    names.add(rentalZoneName(name))
    features.push({
      type: 'Feature',
      properties: {
        zoneId: `uy-mo-barrio-${code}`,
        officialCode: code,
        name,
        department: 'Montevideo',
      },
      geometry: shape,
    })
  }
  return { type: 'FeatureCollection', source: source(geometry.source, 'geometry'), features }
}
function crimeCounts(input: unknown): PublicCrimeCounts | null {
  const raw = record(input),
    entries = record(raw.byOffense),
    byOffense: Record<string, number> = {}
  if (!count(raw.total)) return null
  for (const offense of OFFENSES) {
    if (!count(entries[offense])) return null
    byOffense[offense] = entries[offense]
  }
  if (Object.values(byOffense).reduce((sum, value) => sum + value, 0) !== raw.total) return null
  return { total: raw.total, byOffense }
}
function crime(input: unknown): PublicCrime | null {
  const raw = record(input),
    periodFrom = date(raw.periodFrom),
    periodTo = date(raw.periodTo)
  if (!periodFrom || !periodTo || raw.includesAttempts !== true) return null
  const start = new Date(periodFrom),
    end = new Date(periodTo)
  if (
    start.getUTCDate() !== 1 ||
    periodFrom.length !== 10 ||
    periodTo.length !== 10 ||
    Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), 1) - DAY !== end.getTime()
  )
    return null
  const byCode: PublicCrime['byCode'] = {},
    byDepartment: PublicCrime['byDepartment'] = {}
  for (let code = 1; code <= 62; code++) {
    const counts = crimeCounts(record(raw.countsByOfficialCode)[String(code)])
    if (counts) byCode[String(code)] = counts
  }
  for (const name of RENTAL_ZONE_DEPARTMENTS) {
    const counts = crimeCounts(record(raw.countsByDepartment)[name])
    if (counts) byDepartment[name] = counts
  }
  if (!Object.keys(byCode).length && !Object.keys(byDepartment).length) return null
  return {
    periodFrom,
    periodTo,
    source: { ...source(raw.source, 'crime'), dataAsOf: periodTo },
    byCode,
    byDepartment,
  }
}
function services(input: unknown): PublicServices | null {
  const raw = record(input),
    dataAsOf = date(raw.dataAsOf),
    fetchedAt = date(raw.fetchedAt)
  if (!dataAsOf || !fetchedAt) return null
  const byCode: PublicServices['byCode'] = {}
  for (let code = 1; code <= 62; code++) {
    const values = record(record(raw.countsByOfficialCode)[String(code)])
    if (!SERVICES.every(category => count(values[category], 100_000))) continue
    byCode[String(code)] = Object.fromEntries(
      SERVICES.map(category => [category, values[category]])
    )
  }
  return Object.keys(byCode).length
    ? { source: source({ dataAsOf, fetchedAt }, 'services'), byCode }
    : null
}

/** First boundary: drop database-only fields before caching; failure of one layer never hides another. */
export function projectRentalZoneSnapshots(
  marketInput: unknown,
  contextInput: unknown
): RentalZoneSnapshots {
  const rawMarket = record(marketInput),
    rawContext = record(contextInput)
  let market: PublicMarket | null = null
  const generatedAt = date(rawMarket.generatedAt),
    rentalDataAsOf = date(rawMarket.rentalDataAsOf)
  if (
    rawMarket.version === 1 &&
    generatedAt &&
    rentalDataAsOf &&
    rawMarket.sampleMinimum === RENTAL_ZONE_SAMPLE_MINIMUM &&
    Array.isArray(rawMarket.buckets) &&
    rawMarket.buckets.length <= 20_000
  ) {
    const buckets = new Map<string, PublicBucket>(),
      duplicate = new Set<string>()
    for (const input of rawMarket.buckets) {
      const row = record(input),
        scoped = department(row.department),
        neighborhood = clean(row.neighborhood)
      if (
        !scoped ||
        !neighborhood ||
        !['apartamento', 'casa'].includes(row.propertyType as string) ||
        !BEDROOMS.includes(row.bedrooms as RentalZoneBedrooms)
      )
        continue
      const value = prices(row.prices)
      if (!value) continue
      const key = JSON.stringify([
        scoped,
        rentalZoneName(neighborhood),
        row.propertyType,
        row.bedrooms,
      ])
      if (buckets.has(key) || duplicate.has(key)) {
        buckets.delete(key)
        duplicate.add(key)
        continue
      }
      buckets.set(key, {
        department: scoped,
        neighborhood,
        propertyType: row.propertyType as RentalZonePropertyType,
        bedrooms: row.bedrooms as RentalZoneBedrooms,
        prices: value,
      })
    }
    market = { generatedAt, rentalDataAsOf, buckets: [...buckets.values()] }
  }
  const context =
    rawContext.version === 1
      ? {
          generatedAt: date(rawContext.generatedAt),
          boundaries: boundaries(rawContext.geometry),
          crime: crime(rawContext.crime),
          services: services(rawContext.services),
        }
      : null
  return { market, context }
}

export function rentalZoneBoundaries(
  snapshots: RentalZoneSnapshots
): RentalZoneBoundaryCollection | null {
  return snapshots.context?.boundaries || null
}
export function buildRentalZoneResponse(
  snapshots: RentalZoneSnapshots,
  filters: RentalZoneQuery,
  now = Date.now()
): RentalZoneResponse {
  const { market, context } = snapshots
  const marketStatus = status(market?.generatedAt || null, now, 36 * 3_600_000, 72 * 3_600_000)
  const marketDataStatus = status(
    market?.rentalDataAsOf || null,
    now,
    36 * 3_600_000,
    72 * 3_600_000
  )
  const priceStatus = [marketStatus, marketDataStatus].includes('unavailable')
    ? 'unavailable'
    : [marketStatus, marketDataStatus].includes('stale')
      ? 'stale'
      : 'ready'
  const crimeStatus = status(context?.crime?.periodTo || null, now, 180 * DAY, 365 * DAY)
  const serviceStatus = status(context?.services?.source.dataAsOf || null, now, 14 * DAY, 45 * DAY)
  const features = context?.boundaries?.features || []
  const official = new Map(
    features.map(feature => [rentalZoneName(feature.properties.name), feature.properties])
  )
  const result = new Map<string, RentalZone>()
  const attach = (
    id: string,
    scoped: string,
    neighborhood: string,
    code: string | null,
    value: RentalZonePrices
  ): RentalZone => {
    const serviceCounts = code ? context?.services?.byCode[code] : null
    const crimeCounts =
      scoped === 'Montevideo'
        ? code
          ? context?.crime?.byCode[code]
          : null
        : context?.crime?.byDepartment[scoped]
    let reported: RentalZoneCrime | null = null
    if (context?.crime && crimeCounts)
      reported = {
        status: crimeStatus,
        geography: scoped === 'Montevideo' ? 'neighborhood' : 'department',
        geographyName: scoped === 'Montevideo' ? neighborhood : scoped,
        periodFrom: context.crime.periodFrom,
        periodTo: context.crime.periodTo,
        total: crimeStatus === 'unavailable' ? null : crimeCounts.total,
        byOffense: crimeStatus === 'unavailable' ? {} : { ...crimeCounts.byOffense },
        source: { ...context.crime.source },
      }
    return {
      id,
      ref: { department: scoped, neighborhood },
      officialCode: code,
      prices: value,
      boundaryAvailable: code !== null,
      crime: reported,
      services:
        context?.services && serviceCounts
          ? {
              status: serviceStatus,
              counts: serviceStatus === 'unavailable' ? {} : { ...serviceCounts },
              source: { ...context.services.source },
              coverage: 'partial',
            }
          : null,
    }
  }
  if (!filters.department || filters.department === 'Montevideo') {
    for (const feature of features) {
      const { zoneId, name, officialCode } = feature.properties
      result.set(zoneId, attach(zoneId, 'Montevideo', name, officialCode, emptyRentalZonePrices()))
    }
  }
  for (const bucket of market?.buckets || []) {
    if (filters.department && bucket.department !== filters.department) continue
    const area =
      bucket.department === 'Montevideo' ? official.get(rentalZoneName(bucket.neighborhood)) : null
    const id =
      area?.zoneId ||
      `advertised-${encodeURIComponent(rentalZoneName(bucket.department))}-${encodeURIComponent(rentalZoneName(bucket.neighborhood))}`
    if (!result.has(id))
      result.set(
        id,
        attach(
          id,
          bucket.department,
          bucket.neighborhood,
          area?.officialCode || null,
          emptyRentalZonePrices()
        )
      )
    if (bucket.propertyType === filters.propertyType && bucket.bedrooms === filters.bedrooms) {
      result.set(
        id,
        attach(
          id,
          bucket.department,
          bucket.neighborhood,
          area?.officialCode || null,
          priceStatus === 'unavailable' ? emptyRentalZonePrices() : bucket.prices
        )
      )
    }
  }
  const contextUsable =
    !!features.length || crimeStatus !== 'unavailable' || serviceStatus !== 'unavailable'
  const sources: RentalZoneSource[] = []
  if (market)
    sources.push(
      source({ dataAsOf: market.rentalDataAsOf, fetchedAt: market.generatedAt }, 'market')
    )
  if (context?.boundaries) sources.push({ ...context.boundaries.source })
  if (context?.crime) sources.push({ ...context.crime.source })
  if (context?.services) sources.push({ ...context.services.source })
  const availableDepartments = new Set<string>(
    market?.buckets.map(bucket => bucket.department) || []
  )
  if (features.length) availableDepartments.add('Montevideo')
  for (const name of Object.keys(context?.crime?.byDepartment || {})) availableDepartments.add(name)
  return {
    version: 1,
    status:
      priceStatus !== 'unavailable'
        ? priceStatus
        : contextUsable
          ? market
            ? 'stale'
            : 'ready'
          : 'unavailable',
    generatedAt: market?.generatedAt || context?.generatedAt || null,
    rentalDataAsOf: market?.rentalDataAsOf || null,
    sampleMinimum: RENTAL_ZONE_SAMPLE_MINIMUM,
    filters: { ...filters },
    departments: [...availableDepartments].sort((a, b) => a.localeCompare(b, 'es')),
    zones: [...result.values()].sort(
      (a, b) =>
        a.ref.department.localeCompare(b.ref.department, 'es') ||
        a.ref.neighborhood.localeCompare(b.ref.neighborhood, 'es')
    ),
    boundaryUrl:
      features.length && (!filters.department || filters.department === 'Montevideo')
        ? '/api/rentals/zone-boundaries'
        : null,
    sources,
  }
}
