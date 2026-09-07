import { agencyKey, agencyPath, safeAgency, type Agency } from './propertyAdvertiser'

export { agencyPath }
export interface AgencySummary {
  agency: Agency
  rentals: number
  sales: number
  listings: number
  departments: string[]
  zones: Array<{ department: string; neighborhood: string; listings: number }>
  lastListingSeen: string
}
export interface AgencyQuery {
  q: string
  department: string
  operation: 'all' | 'rent' | 'sale'
  page: number
  perPage: number
}
export interface AgenciesResponse {
  items: AgencySummary[]
  total: number
  page: number
  pages: number
  perPage: number
  query: AgencyQuery
  departments: string[]
  coverage: { agencies: number; listings: number; sources: string[]; computedAt: string }
}
const scalar = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
export function normalizeAgencyQuery(raw: Record<string, unknown> = {}): AgencyQuery {
  return {
    q: scalar(raw.q).slice(0, 100),
    department: scalar(raw.department).slice(0, 100),
    operation: raw.operation === 'rent' || raw.operation === 'sale' ? raw.operation : 'all',
    page: Math.min(500, Math.max(1, Math.trunc(Number(raw.page) || 1))),
    perPage: Math.min(48, Math.max(12, Math.trunc(Number(raw.perPage) || 24))),
  }
}
export function agencyCatalogueLinks(key: string) {
  const agency = agencyKey(key)
  return {
    rentals: `/alquileres-uruguay?${new URLSearchParams({ agency })}`,
    sales: `/venta-viviendas-uruguay?${new URLSearchParams({ agency })}`,
  }
}
export interface AgencyAggregateRow {
  agency: unknown
  source: string
  operation: 'rent' | 'sale'
  department: string
  neighborhood: string
  count: number
  lastSeen: string
}
/** Mongo already deduplicates source advert IDs. Names are display text, never grouping keys. */
export function buildAgencyDirectory(
  rows: AgencyAggregateRow[],
  now = Date.now()
): AgencySummary[] {
  const agencies = new Map<string, AgencySummary>()
  for (const row of rows) {
    const agency = safeAgency(row.agency, row.source, now)
    if (
      !agency ||
      !['rent', 'sale'].includes(row.operation) ||
      !Number.isSafeInteger(row.count) ||
      row.count <= 0
    )
      continue
    const current = agencies.get(agency.key) || {
      agency,
      rentals: 0,
      sales: 0,
      listings: 0,
      departments: [],
      zones: [],
      lastListingSeen: '',
    }
    if (Date.parse(agency.observedAt) > Date.parse(current.agency.observedAt))
      current.agency = agency
    current[row.operation === 'rent' ? 'rentals' : 'sales'] += row.count
    current.listings += row.count
    if (
      typeof row.department === 'string' &&
      row.department &&
      !current.departments.includes(row.department)
    )
      current.departments.push(row.department)
    if (
      typeof row.department === 'string' &&
      typeof row.neighborhood === 'string' &&
      row.neighborhood
    ) {
      const zone = current.zones.find(
        zone => zone.department === row.department && zone.neighborhood === row.neighborhood
      )
      if (zone) zone.listings += row.count
      else
        current.zones.push({
          department: row.department,
          neighborhood: row.neighborhood,
          listings: row.count,
        })
    }
    if (
      Number.isFinite(Date.parse(row.lastSeen)) &&
      Date.parse(row.lastSeen) <= now + 300000 &&
      (!current.lastListingSeen || Date.parse(row.lastSeen) > Date.parse(current.lastListingSeen))
    )
      current.lastListingSeen = row.lastSeen
    agencies.set(agency.key, current)
  }
  return [...agencies.values()]
    .map(row => ({
      ...row,
      departments: row.departments.sort(),
      zones: row.zones
        .sort(
          (a, b) => b.listings - a.listings || a.neighborhood.localeCompare(b.neighborhood, 'es')
        )
        .slice(0, 100),
    }))
    .sort((a, b) => b.listings - a.listings || a.agency.key.localeCompare(b.agency.key))
}
export function queryAgencies(
  rows: AgencySummary[],
  input: Record<string, unknown> = {},
  now = Date.now()
): AgenciesResponse {
  const query = normalizeAgencyQuery(input),
    needle = fold(query.q)
  const filtered = rows.filter(
    row =>
      (!needle || fold(row.agency.name).includes(needle)) &&
      (!query.department || row.departments.includes(query.department)) &&
      (query.operation === 'all' || (query.operation === 'rent' ? row.rentals : row.sales) > 0)
  )
  const pages = Math.ceil(filtered.length / query.perPage),
    page = Math.min(query.page, Math.max(1, pages))
  return {
    items: filtered.slice((page - 1) * query.perPage, page * query.perPage),
    total: filtered.length,
    page,
    pages,
    perPage: query.perPage,
    query: { ...query, page },
    departments: [...new Set(rows.flatMap(row => row.departments))].sort(),
    coverage: {
      agencies: rows.length,
      listings: rows.reduce((sum, row) => sum + row.listings, 0),
      sources: [...new Set(rows.map(row => row.agency.key.split(':')[0]!))].sort(),
      computedAt: new Date(now).toISOString(),
    },
  }
}
