import type {
  RentalZoneScoreAttribute,
  RentalZoneScores,
  RentalClaimCategory,
  RentalServiceAttribute,
  RentalServiceLevel,
  RentalServiceStatus,
  RentalZoneDataStatus,
  RentalZoneImpact,
  RentalZoneRef,
  RentalZoneSource,
  RentalZoneUtilities,
  RentalZoneUtilitiesMeta,
} from './rentalZoneTypes'

/**
 * Power (UTE), water (OSE) and urban complaints (IM) per official area, as the backend job
 * `currency-property-zones` stores them. Everything here only READS that snapshot: the request never
 * aggregates the ledgers. See docs/app/PROPERTY_ZONE_SERVICES.md.
 */
export const RENTAL_SERVICE_ATTRIBUTES: readonly RentalServiceAttribute[] = [
  'luz',
  'agua',
  'alumbrado',
  'saneamiento',
  'limpieza',
  'calles',
  'denuncias',
]
/** What the directory filters by. Potholes stay a map layer: a weak, noisy signal for a renter. */
export const RENTAL_SERVICE_FILTERS: readonly RentalServiceAttribute[] = [
  'denuncias',
  'luz',
  'agua',
  'saneamiento',
  'limpieza',
  'alumbrado',
]
export const RENTAL_CLAIM_CATEGORIES: readonly RentalClaimCategory[] = [
  'alumbrado',
  'saneamiento',
  'limpieza',
  'calles',
]
const LEVELS: readonly RentalServiceLevel[] = ['low', 'mid', 'high']
const DAY = 86_400_000
const ZONE_ID = /^(?:mvd:(?:[1-9]|[1-5]\d|6[0-2])|ute:\d{1,6})$/

export const UTE_ECSE_URL =
  'https://www.ute.com.uy/institucional/ute/utei/mapa-interactivo-de-la-situacion-del-servicio-electrico'
export const OSE_NOTICES_URL = 'https://www.ose.com.uy/interrupciones/programados'
export const IM_CLAIMS_URL =
  'https://catalogodatos.gub.uy/dataset/reclamos-registrados-en-el-sistema-unico-de-reclamos-de-la-intendencia-de-montevideo'
const DATA_LICENSE =
  'https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/sites/agencia-gobierno-electronico-sociedad-informacion-conocimiento/files/documentos/publicaciones/licencia_de_datos_abiertos_0.pdf'

/** Same identity as the backend's foldZoneName: case, accents and punctuation are not identity. */
export const rentalServiceZoneFold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
const num = (value: unknown, max = 10_000_000): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null
const text = (value: unknown, max = 100): string | null =>
  typeof value === 'string' && value.length <= max && !/[\p{Cc}<>]/u.test(value) && value.trim()
    ? value.trim()
    : null
const day = (value: unknown): string | null => {
  const raw = text(value, 40)
  return raw && /^\d{4}-\d{2}-\d{2}/.test(raw) && Number.isFinite(Date.parse(raw)) ? raw : null
}

interface PowerMetricRaw {
  name: string
  department: string
  customers: number
  unplannedMinutes: number
  plannedMinutes: number
  cutsPerMonth: number
  cutsPerThousand: number
}
interface ClaimMetricRaw {
  counts: Record<RentalClaimCategory, number>
  perThousand: Record<RentalClaimCategory, number> | null
  customers: number | null
}
export interface RentalZoneServiceSnapshot {
  generatedAt: string
  names: Record<string, string>
  localities: Record<string, { name: string; department: string; aliases: string[] }>
  aliases: Record<string, { zone: string; share: number; n: number }>
  power: {
    status: 'ready' | 'collecting'
    observedFrom: string | null
    observedTo: string | null
    observedDays: number
    coverage: number
    zones: Record<string, PowerMetricRaw>
    departments: Record<string, PowerMetricRaw>
  } | null
  water: {
    periodFrom: string
    periodTo: string
    fetchedAt: string | null
    notices: number
    montevideoNotices: number
    montevideoMatched: number
    zones: Record<string, { notices: number; hours: number }>
    departments: Record<string, { notices: number; hours: number }>
  } | null
  claims: {
    periodFrom: string
    periodTo: string
    fetchedAt: string | null
    zones: Record<string, ClaimMetricRaw>
  } | null
  thresholds: RentalZoneUtilitiesMeta['thresholds']
  byZone: Partial<Record<RentalServiceAttribute, Record<string, RentalServiceLevel>>>
  /** The ranked value per zone and attribute (complaints and crime per 1,000 UTE customers). */
  values: Partial<Record<RentalServiceAttribute, Record<string, number>>>
  crimePeriodTo: string | null
  /** OSM service points per km² of each INE barrio, with the index date. */
  amenities: { dataAsOf: string; perKm2: Record<string, number> } | null
}

function powerMetric(input: unknown): PowerMetricRaw | null {
  const raw = record(input)
  const values = {
    customers: num(raw.customers),
    unplannedMinutes: num(raw.unplannedMinutes, 43_200),
    plannedMinutes: num(raw.plannedMinutes, 43_200),
    cutsPerMonth: num(raw.cutsPerMonth, 1_000_000),
    cutsPerThousand: num(raw.cutsPerThousand, 1_000_000),
  }
  const name = text(raw.name),
    department = text(raw.department, 40)
  if (!name || !department || Object.values(values).includes(null)) return null
  return { name, department, ...(values as Record<keyof typeof values, number>) }
}
function claimCounts(input: unknown): Record<RentalClaimCategory, number> | null {
  const raw = record(input)
  const out = {} as Record<RentalClaimCategory, number>
  for (const category of RENTAL_CLAIM_CATEGORIES) {
    const value = num(raw[category])
    if (value === null) return null
    out[category] = value
  }
  return out
}
function metrics<T>(
  input: unknown,
  read: (value: unknown) => T | null,
  ids = true
): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [id, value] of Object.entries(record(input)).slice(0, 500)) {
    if (ids && !ZONE_ID.test(id)) continue
    const metric = read(value)
    if (metric !== null) out[id] = metric
  }
  return out
}

/** First boundary for the context document's `utilities` and `aliases`: validated and projected. */
export function projectRentalZoneServices(
  utilitiesInput: unknown,
  aliasesInput: unknown
): RentalZoneServiceSnapshot | null {
  const raw = record(utilitiesInput)
  const generatedAt = day(raw.generatedAt)
  if (raw.version !== 1 || !generatedAt) return null
  const names = metrics(raw.names, value => text(value))
  const localities = metrics(raw.localities, value => {
    const item = record(value)
    const name = text(item.name),
      department = text(item.department, 40)
    const aliases = Array.isArray(item.aliases)
      ? item.aliases
          .map(alias => text(alias))
          .filter((alias): alias is string => !!alias)
          .slice(0, 10)
      : []
    return name && department ? { name, department, aliases } : null
  })
  const aliases: RentalZoneServiceSnapshot['aliases'] = {}
  for (const [key, value] of Object.entries(record(aliasesInput)).slice(0, 2000)) {
    const item = record(value)
    const share = num(item.share, 1),
      n = num(item.n)
    if (
      key.length <= 120 &&
      typeof item.zone === 'string' &&
      ZONE_ID.test(item.zone) &&
      share !== null &&
      n !== null
    )
      aliases[key] = { zone: item.zone, share, n }
  }
  const powerRaw = record(raw.power)
  const power =
    powerRaw.status === 'ready' || powerRaw.status === 'collecting'
      ? {
          status: powerRaw.status as 'ready' | 'collecting',
          observedFrom: day(powerRaw.observedFrom),
          observedTo: day(powerRaw.observedTo),
          observedDays: num(powerRaw.observedDays, 1000) ?? 0,
          coverage: num(powerRaw.coverage, 1) ?? 0,
          zones: metrics(powerRaw.zones, powerMetric),
          departments: metrics(powerRaw.departments, powerMetric, false),
        }
      : null
  const waterRaw = record(raw.water)
  const waterMetric = (value: unknown) => {
    const item = record(value)
    const notices = num(item.notices),
      hours = num(item.hours)
    return notices !== null && hours !== null ? { notices, hours } : null
  }
  const water =
    day(waterRaw.periodFrom) && day(waterRaw.periodTo)
      ? {
          periodFrom: day(waterRaw.periodFrom)!,
          periodTo: day(waterRaw.periodTo)!,
          fetchedAt: day(waterRaw.fetchedAt),
          notices: num(waterRaw.notices) ?? 0,
          montevideoNotices: num(waterRaw.montevideoNotices) ?? 0,
          montevideoMatched: num(waterRaw.montevideoMatched) ?? 0,
          zones: metrics(waterRaw.zones, waterMetric),
          departments: metrics(waterRaw.departments, waterMetric, false),
        }
      : null
  const claimsRaw = record(raw.claims)
  const claims =
    day(claimsRaw.periodFrom) && day(claimsRaw.periodTo)
      ? {
          periodFrom: day(claimsRaw.periodFrom)!,
          periodTo: day(claimsRaw.periodTo)!,
          fetchedAt: day(record(claimsRaw.source).fetchedAt),
          zones: metrics(claimsRaw.zones, value => {
            const item = record(value)
            const counts = claimCounts(item.counts)
            if (!counts) return null
            return {
              counts,
              perThousand: item.perThousand === null ? null : claimCounts(item.perThousand),
              customers: num(item.customers),
            }
          }),
        }
      : null
  const levels = record(raw.levels)
  const thresholds: RentalZoneServiceSnapshot['thresholds'] = {}
  const byZone: RentalZoneServiceSnapshot['byZone'] = {}
  const values: RentalZoneServiceSnapshot['values'] = {}
  for (const attribute of RENTAL_SERVICE_ATTRIBUTES) {
    const threshold = record(record(levels.thresholds)[attribute])
    const low = num(threshold.low, 1e9),
      high = num(threshold.high, 1e9),
      zones = num(threshold.zones, 1000)
    if (low !== null && high !== null && zones !== null)
      thresholds[attribute] = { low, high, zones }
    const entries = metrics(record(levels.byZone)[attribute], value =>
      LEVELS.includes(value as RentalServiceLevel) ? (value as RentalServiceLevel) : null
    )
    if (Object.keys(entries).length) byZone[attribute] = entries
    const ranked = metrics(record(levels.values)[attribute], value => num(value, 1e9))
    if (Object.keys(ranked).length) values[attribute] = ranked
  }
  const amenityRaw = record(raw.amenities)
  const amenityDate = day(amenityRaw.dataAsOf)
  const perKm2 = metrics(amenityRaw.perKm2, value => num(value, 1e6))
  return {
    generatedAt,
    names,
    localities,
    aliases,
    power,
    water,
    claims,
    thresholds,
    byZone,
    values,
    crimePeriodTo: day(raw.crimePeriodTo),
    amenities: amenityDate && Object.keys(perKm2).length ? { dataAsOf: amenityDate, perKm2 } : null,
  }
}

const age = (value: string | null, now: number) => (value ? now - Date.parse(value) : NaN)
const freshness = (
  value: string | null,
  now: number,
  ready: number,
  maximum: number
): RentalZoneDataStatus => {
  const elapsed = age(value, now)
  return !Number.isFinite(elapsed) || elapsed < -DAY || elapsed > maximum
    ? 'unavailable'
    : elapsed > ready
      ? 'stale'
      : 'ready'
}
/** Power: the ledger's last day. Water: the last harvest. Complaints: the end of the counted period. */
export function rentalServiceStatuses(
  snapshot: RentalZoneServiceSnapshot | null,
  now = Date.now()
) {
  const power: RentalServiceStatus = !snapshot?.power
    ? 'unavailable'
    : snapshot.power.status === 'collecting'
      ? 'collecting'
      : freshness(snapshot.power.observedTo, now, 2 * DAY, 7 * DAY)
  const water = freshness(snapshot?.water?.fetchedAt ?? null, now, 7 * DAY, 21 * DAY)
  const claims = freshness(snapshot?.claims?.periodTo ?? null, now, 75 * DAY, 120 * DAY)
  // Same windows as the crime layer of the zone page: a period that ended ≤180 days ago is current.
  const crime = freshness(snapshot?.crimePeriodTo ?? null, now, 180 * DAY, 365 * DAY)
  return { power, water, claims, crime }
}
const usable = (status: RentalServiceStatus) => status === 'ready' || status === 'stale'
const attributeStatus = (
  statuses: ReturnType<typeof rentalServiceStatuses>,
  attribute: RentalServiceAttribute
): RentalServiceStatus =>
  attribute === 'luz'
    ? statuses.power
    : attribute === 'agua'
      ? statuses.water
      : attribute === 'denuncias'
        ? statuses.crime
        : statuses.claims

const source = (
  name: string,
  url: string,
  dataAsOf: string | null,
  fetchedAt: string | null
): RentalZoneSource => ({
  name,
  url,
  licenseUrl: url === UTE_ECSE_URL ? undefined : DATA_LICENSE,
  dataAsOf,
  fetchedAt,
})

export function rentalZoneUtilitiesMeta(
  snapshot: RentalZoneServiceSnapshot | null,
  now = Date.now()
): RentalZoneUtilitiesMeta | null {
  if (!snapshot) return null
  const statuses = rentalServiceStatuses(snapshot, now)
  const thresholds: RentalZoneUtilitiesMeta['thresholds'] = {}
  for (const [attribute, value] of Object.entries(snapshot.thresholds) as Array<
    [RentalServiceAttribute, { low: number; high: number; zones: number }]
  >)
    if (usable(attributeStatus(statuses, attribute))) thresholds[attribute] = { ...value }
  return {
    power: snapshot.power
      ? {
          status: statuses.power,
          observedFrom: snapshot.power.observedFrom,
          observedTo: snapshot.power.observedTo,
          observedDays: snapshot.power.observedDays,
          coverage: snapshot.power.coverage,
          source: source(
            'UTE · Mapa de la situación del servicio eléctrico (UTEi)',
            UTE_ECSE_URL,
            snapshot.power.observedTo,
            snapshot.generatedAt
          ),
        }
      : null,
    water: snapshot.water
      ? {
          status: statuses.water,
          periodFrom: snapshot.water.periodFrom,
          periodTo: snapshot.water.periodTo,
          notices: snapshot.water.notices,
          montevideoNotices: snapshot.water.montevideoNotices,
          montevideoMatched: snapshot.water.montevideoMatched,
          source: source(
            'OSE · Interrupciones programadas de agua potable',
            OSE_NOTICES_URL,
            snapshot.water.periodTo,
            snapshot.water.fetchedAt
          ),
        }
      : null,
    claims: snapshot.claims
      ? {
          status: statuses.claims,
          periodFrom: snapshot.claims.periodFrom,
          periodTo: snapshot.claims.periodTo,
          source: source(
            'Intendencia de Montevideo · Sistema Único de Reclamos',
            IM_CLAIMS_URL,
            snapshot.claims.periodTo,
            snapshot.claims.fetchedAt
          ),
        }
      : null,
    thresholds,
  }
}

/** The official area an advertised zone corresponds to: exact official name, else a measured alias. */
export function rentalZoneOfficial(
  snapshot: RentalZoneServiceSnapshot,
  ref: RentalZoneRef,
  officialCode: string | null
): RentalZoneUtilities['official'] {
  if (officialCode) {
    const id = `mvd:${officialCode}`
    return { id, name: snapshot.names[id] || ref.neighborhood, match: 'exact', share: null }
  }
  const neighborhood = rentalServiceZoneFold(ref.neighborhood),
    department = rentalServiceZoneFold(ref.department)
  if (ref.department !== 'Montevideo') {
    for (const [id, locality] of Object.entries(snapshot.localities))
      if (
        rentalServiceZoneFold(locality.department) === department &&
        [locality.name, ...locality.aliases].some(
          name => rentalServiceZoneFold(name) === neighborhood
        )
      )
        return { id, name: locality.name, match: 'exact', share: null }
  }
  const alias = snapshot.aliases[`${department}|${neighborhood}`]
  return alias
    ? {
        id: alias.zone,
        name: snapshot.names[alias.zone] || alias.zone,
        match: 'alias',
        share: alias.share,
      }
    : null
}

/** The service layers of one advertised zone. Department context only where the layer has it. */
export function attachRentalZoneUtilities(
  snapshot: RentalZoneServiceSnapshot | null,
  ref: RentalZoneRef,
  officialCode: string | null,
  now = Date.now()
): RentalZoneUtilities | null {
  if (!snapshot) return null
  const statuses = rentalServiceStatuses(snapshot, now)
  const official = rentalZoneOfficial(snapshot, ref, officialCode)
  const id = official?.id
  // Department totals are context for towns only: next to Montevideo barrios they would read as a
  // barrio figure many times larger than any real one.
  const departmentContext = ref.department !== 'Montevideo'
  let power: RentalZoneUtilities['power'] = null
  if (usable(statuses.power) && snapshot.power) {
    const zone = id ? snapshot.power.zones[id] : undefined
    const department = departmentContext ? snapshot.power.departments[ref.department] : undefined
    const metric = zone || department
    if (metric)
      power = {
        geography: zone ? 'zone' : 'department',
        geographyName: zone ? official!.name : ref.department,
        customers: metric.customers,
        unplannedMinutes: metric.unplannedMinutes,
        plannedMinutes: metric.plannedMinutes,
        cutsPerMonth: metric.cutsPerMonth,
        cutsPerThousand: metric.cutsPerThousand,
      }
  }
  let water: RentalZoneUtilities['water'] = null
  if (usable(statuses.water) && snapshot.water) {
    const zone = id ? snapshot.water.zones[id] : undefined
    const department = departmentContext ? snapshot.water.departments[ref.department] : undefined
    const metric = zone || department
    if (metric)
      water = {
        geography: zone ? 'zone' : 'department',
        geographyName: zone ? official!.name : ref.department,
        notices: metric.notices,
        hours: metric.hours,
      }
  }
  const claimMetric = usable(statuses.claims) && id ? snapshot.claims?.zones[id] : undefined
  const claims: RentalZoneUtilities['claims'] = claimMetric
    ? {
        counts: { ...claimMetric.counts },
        perThousand: claimMetric.perThousand ? { ...claimMetric.perThousand } : null,
        customers: claimMetric.customers,
      }
    : null
  const levels: RentalZoneUtilities['levels'] = {}
  if (id)
    for (const attribute of RENTAL_SERVICE_ATTRIBUTES) {
      const level = snapshot.byZone[attribute]?.[id]
      if (level && usable(attributeStatus(statuses, attribute))) levels[attribute] = level
    }
  if (!official && !power && !water && !claims) return null
  return { official, power, water, claims, levels }
}

/**
 * Official areas in the third with the fewest problems for EVERY requested attribute, or null when
 * any requested layer cannot be used right now (the caller must then return no listings rather
 * than silently ignoring the filter).
 */
export function rentalServiceZoneIds(
  snapshot: RentalZoneServiceSnapshot | null,
  attributes: readonly RentalServiceAttribute[],
  now = Date.now()
): string[] | null {
  if (!attributes.length) return []
  if (!snapshot) return null
  const statuses = rentalServiceStatuses(snapshot, now)
  let selected: Set<string> | null = null
  for (const attribute of attributes) {
    const levels = snapshot.byZone[attribute]
    if (!levels || !usable(attributeStatus(statuses, attribute))) return null
    const low = new Set(
      Object.entries(levels)
        .filter(([, level]) => level === 'low')
        .map(([id]) => id)
    )
    selected = selected ? new Set([...selected].filter(id => low.has(id))) : low
  }
  return [...(selected || [])].sort()
}

/** Which filter attributes can be offered right now, with the value that bounds the best third. */
export function rentalServiceFilterOptions(
  snapshot: RentalZoneServiceSnapshot | null,
  now = Date.now()
) {
  const statuses = snapshot ? rentalServiceStatuses(snapshot, now) : null
  return RENTAL_SERVICE_FILTERS.map(attribute => {
    const status: RentalServiceStatus = statuses
      ? attributeStatus(statuses, attribute)
      : 'unavailable'
    const threshold = snapshot?.thresholds[attribute]
    const available = !!snapshot?.byZone[attribute] && usable(status)
    return {
      attribute,
      status,
      available,
      low: available && threshold ? threshold.low : null,
      zones: threshold?.zones ?? 0,
    }
  })
}

export function parseRentalServiceAttributes(input: unknown): RentalServiceAttribute[] {
  const values = (Array.isArray(input) ? input : [input]).flatMap(value =>
    typeof value === 'string' ? value.slice(0, 200).split(',') : []
  )
  return RENTAL_SERVICE_FILTERS.filter(attribute =>
    values.map(value => value.trim()).includes(attribute)
  )
}

/** First boundary for the stored price analysis. */
export function projectRentalZoneImpact(input: unknown, now = Date.now()): RentalZoneImpact | null {
  const raw = record(input)
  const generatedAt = day(raw.generatedAt),
    rentalDataAsOf = day(raw.rentalDataAsOf)
  if (
    raw.version !== 1 ||
    !generatedAt ||
    !rentalDataAsOf ||
    !Array.isArray(raw.zones) ||
    !Array.isArray(raw.attributes)
  )
    return null
  const zones = raw.zones.slice(0, 300).flatMap(value => {
    const item = record(value)
    const zone = typeof item.zone === 'string' && ZONE_ID.test(item.zone) ? item.zone : null
    const name = text(item.name),
      n = num(item.n),
      rentM2 = num(item.rentM2, 100_000)
    return zone && name && n !== null && rentM2 !== null ? [{ zone, name, n, rentM2 }] : []
  })
  const attributes = raw.attributes.slice(0, 20).flatMap(value => {
    const item = record(value)
    const attribute = item.attribute as RentalZoneImpact['attributes'][number]['attribute']
    if (!RENTAL_SERVICE_ATTRIBUTES.includes(attribute)) return []
    const fields = [
      'rho',
      'rhoLow',
      'rhoHigh',
      'xLow',
      'xHigh',
      'pct',
      'pctLow',
      'pctHigh',
    ] as const
    const numbers = {} as Record<(typeof fields)[number], number>
    for (const field of fields) {
      const v = item[field]
      if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1e7) return []
      numbers[field] = v
    }
    const count = num(item.zones, 1000)
    if (
      count === null ||
      !['lower', 'higher', 'inconclusive'].includes(item.verdict as string) ||
      !Array.isArray(item.points)
    )
      return []
    const points = item.points.slice(0, 300).flatMap(point => {
      const p = record(point)
      const zone = typeof p.zone === 'string' && ZONE_ID.test(p.zone) ? p.zone : null
      const x = num(p.x, 1e7),
        y = num(p.y, 1e6)
      return zone && x !== null && y !== null ? [{ zone, x, y }] : []
    })
    return [
      {
        attribute,
        zones: count,
        ...numbers,
        verdict: item.verdict as 'lower' | 'higher' | 'inconclusive',
        points,
      },
    ]
  })
  const jointRaw = record(raw.joint)
  const joint =
    Array.isArray(jointRaw.coefficients) &&
    num(jointRaw.zones, 1000) !== null &&
    num(jointRaw.r2, 1) !== null
      ? {
          zones: jointRaw.zones as number,
          r2: jointRaw.r2 as number,
          coefficients: jointRaw.coefficients.slice(0, 20).flatMap(value => {
            const item = record(value)
            const attribute = item.attribute as RentalZoneImpact['attributes'][number]['attribute']
            const values = [item.pctPerSd, item.low, item.high]
            return RENTAL_SERVICE_ATTRIBUTES.includes(attribute) &&
              values.every(v => typeof v === 'number' && Number.isFinite(v))
              ? [
                  {
                    attribute,
                    pctPerSd: item.pctPerSd as number,
                    low: item.low as number,
                    high: item.high as number,
                  },
                ]
              : []
          }),
        }
      : null
  return {
    status: freshness(generatedAt, now, 3 * DAY, 10 * DAY),
    generatedAt,
    rentalDataAsOf,
    minimumListings: num(raw.minimumListings, 1000) ?? 15,
    zones,
    attributes,
    joint,
  }
}

/**
 * Where each zone stands among the zones that have the same figure: the neighbourhood bars of the
 * listing cards. Computed from the stored snapshot (a few hundred numbers), never from listings.
 * `betterThan` is the share of the OTHER zones that fare worse, so a full bar always means better,
 * whether the figure is a problem (fewer is better) or a service (more is better).
 */
export function buildRentalZoneScores(
  snapshot: RentalZoneServiceSnapshot | null,
  now = Date.now()
): RentalZoneScores | null {
  if (!snapshot) return null
  const statuses = rentalServiceStatuses(snapshot, now)
  const series: Array<{
    attribute: RentalZoneScoreAttribute
    values: Record<string, number>
    higherIsBetter: boolean
  }> = []
  if (usable(statuses.power) && snapshot.power)
    series.push({
      attribute: 'luz',
      values: Object.fromEntries(
        Object.entries(snapshot.power.zones).map(([id, metric]) => [id, metric.unplannedMinutes])
      ),
      higherIsBetter: false,
    })
  if (usable(statuses.water) && snapshot.water)
    series.push({
      attribute: 'agua',
      values: Object.fromEntries(
        Object.entries(snapshot.water.zones).map(([id, metric]) => [id, metric.notices])
      ),
      higherIsBetter: false,
    })
  for (const attribute of ['alumbrado', 'saneamiento', 'limpieza'] as const)
    if (usable(statuses.claims) && snapshot.values[attribute])
      series.push({ attribute, values: snapshot.values[attribute]!, higherIsBetter: false })
  if (usable(statuses.crime) && snapshot.values.denuncias)
    series.push({
      attribute: 'denuncias',
      values: snapshot.values.denuncias,
      higherIsBetter: false,
    })
  const servicesAge = snapshot.amenities ? now - Date.parse(snapshot.amenities.dataAsOf) : NaN
  if (snapshot.amenities && Number.isFinite(servicesAge) && servicesAge <= 45 * DAY)
    series.push({ attribute: 'servicios', values: snapshot.amenities.perKm2, higherIsBetter: true })
  const zones: RentalZoneScores['zones'] = {}
  const order: RentalZoneScoreAttribute[] = [
    'denuncias',
    'luz',
    'agua',
    'saneamiento',
    'limpieza',
    'alumbrado',
    'servicios',
  ]
  for (const { attribute, values, higherIsBetter } of series.sort(
    (a, b) => order.indexOf(a.attribute) - order.indexOf(b.attribute)
  )) {
    const entries = Object.entries(values).filter(([, value]) => Number.isFinite(value))
    if (entries.length < 9) continue
    for (const [id, value] of entries) {
      const worse = entries.filter(([, other]) =>
        higherIsBetter ? other < value : other > value
      ).length
      const name = snapshot.names[id]
      if (!name) continue
      const zone = (zones[id] ||= {
        name,
        department: snapshot.localities[id]?.department || 'Montevideo',
        rows: [],
      })
      zone.rows.push({
        attribute,
        value,
        betterThan: Math.round((worse / (entries.length - 1)) * 1000) / 1000,
        zones: entries.length,
      })
    }
  }
  const ine: Record<string, string> = {}
  for (const [id, name] of Object.entries(snapshot.names))
    if (id.startsWith('mvd:')) ine[rentalServiceZoneFold(name)] = id
  const localities: Record<string, string> = {}
  for (const [id, locality] of Object.entries(snapshot.localities))
    for (const name of [locality.name, ...locality.aliases])
      localities[`${rentalServiceZoneFold(locality.department)}|${rentalServiceZoneFold(name)}`] =
        id
  return {
    generatedAt: snapshot.generatedAt,
    zones,
    resolver: {
      ine,
      aliases: Object.fromEntries(
        Object.entries(snapshot.aliases).map(([key, alias]) => [key, alias.zone])
      ),
      localities,
    },
    periods: {
      power: snapshot.power
        ? {
            from: snapshot.power.observedFrom,
            to: snapshot.power.observedTo,
            status: statuses.power,
          }
        : null,
      water: snapshot.water
        ? { from: snapshot.water.periodFrom, to: snapshot.water.periodTo }
        : null,
      claims: snapshot.claims
        ? { from: snapshot.claims.periodFrom, to: snapshot.claims.periodTo }
        : null,
      crimeTo: snapshot.crimePeriodTo,
      servicesAsOf: snapshot.amenities?.dataAsOf ?? null,
    },
  }
}

/** The zone id of a listing: its own official zone, else its advertised barrio resolved by name. */
export function rentalZoneScoreId(
  scores: RentalZoneScores | null,
  place: {
    zone?: string | null
    department?: string | null
    neighborhood?: string | null
    locality?: string | null
  }
): string | null {
  if (!scores) return null
  if (place.zone && scores.zones[place.zone]) return place.zone
  const department = rentalServiceZoneFold(place.department || '')
  for (const name of [place.neighborhood, place.locality]) {
    if (!name) continue
    const folded = rentalServiceZoneFold(name)
    const id =
      (department === 'montevideo' ? scores.resolver.ine[folded] : undefined) ||
      scores.resolver.localities[`${department}|${folded}`] ||
      scores.resolver.aliases[`${department}|${folded}`]
    if (id && scores.zones[id]) return id
  }
  return null
}
