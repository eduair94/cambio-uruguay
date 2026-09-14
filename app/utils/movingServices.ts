// A dated editorial directory. Reading a page again does not prove its tariff is still valid.
// Keep quoted units, vehicle dimensions, coverage and source URLs intact; never synthesize a
// national average from hourly moves, item assembly and storage plans.
import snapshot from './movingServicesData.json'

export const MOVING_REVIEWED = '2026-09-14'
export const MOVING_PATH = '/fletes-mudanzas-uruguay'
export const MOVING_CATEGORIES = [
  'moving',
  'freight',
  'assembly',
  'packing',
  'storage',
  'cleaning',
  'removal',
  'installation',
] as const
export type MovingCategory = (typeof MOVING_CATEGORIES)[number]
export type MovingUnit = 'hour' | 'trip' | 'km' | 'item' | 'month' | 'm2' | 'service'
export interface MovingSource {
  url: string
  title: string
  accessedAt: string
  publishedAt?: string
  notes?: string
}
export interface MovingVehicle {
  label: string
  dimensions?: string
  volumeM3?: number
  payloadKg?: number
  notes?: string
  sourceUrl: string
}
export interface MovingPrice {
  category: MovingCategory
  /** An extra fee must not be presented as the entry price of the main service. */
  additional?: boolean
  label: string
  amount: number
  maxAmount?: number
  currency: 'UYU' | 'USD'
  unit: MovingUnit
  kind: 'from' | 'fixed' | 'range'
  minimum?: string
  includes?: string[]
  excludes?: string[]
  conditions?: string
  sourceUrl: string
  publishedAt?: string
}
export interface MovingContact {
  kind: 'phone' | 'whatsapp' | 'email'
  value: string
  label?: string
  sourceUrl: string
}
export interface MovingProvider {
  id: string
  name: string
  categories: MovingCategory[]
  baseDepartment?: string
  coverage: string[]
  nationwide?: boolean
  summary: string
  services: string[]
  vehicles: MovingVehicle[]
  prices: MovingPrice[]
  contacts: MovingContact[]
  website: string
  sources: MovingSource[]
  caveats: string[]
}
export const MOVING_PROVIDERS = snapshot as MovingProvider[]
export const MOVING_DEPARTMENTS = [
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
] as const

const movingFold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
export interface MovingFilters {
  category?: string
  department?: string
  query?: string
  pricedOnly?: boolean
  vehicleOnly?: boolean
  localOnly?: boolean
}

export const MOVING_SORTS = ['name', 'price-asc', 'price-desc'] as const
export type MovingSort = (typeof MOVING_SORTS)[number]
export interface MovingDirectoryState extends Required<MovingFilters> {
  sort: MovingSort
}
/** Compatible with router query values without importing Vue or Nuxt into these helpers. */
export type MovingRouteQuery = Record<string, string | null | (string | null)[] | undefined>
const movingQueryKeys = ['servicio', 'departamento', 'q', 'precios', 'camion', 'local', 'orden']

/** Repeated parameters use their first value; malformed values return to the default. */
export function readMovingQuery(query: MovingRouteQuery = {}): MovingDirectoryState {
  const scalar = (key: string) => {
    const raw = query[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    return typeof value === 'string' ? value.trim() : ''
  }
  const requestedCategory = scalar('servicio').toLowerCase()
  const category = MOVING_CATEGORIES.find(value => value === requestedCategory) || ''
  const department =
    MOVING_DEPARTMENTS.find(value => movingFold(value) === movingFold(scalar('departamento'))) || ''
  const requestedSort = scalar('orden')
  return {
    category,
    department,
    query: scalar('q').replace(/\s+/g, ' '),
    pricedOnly: scalar('precios') === '1',
    vehicleOnly: scalar('camion') === '1',
    localOnly: Boolean(department) && scalar('local') === '1',
    sort:
      requestedSort === 'precio-asc'
        ? 'price-asc'
        : requestedSort === 'precio-desc'
          ? 'price-desc'
          : 'name',
  }
}

/** Replace our parameters only, preserving campaign or other unrelated query values. */
export function buildMovingQuery(
  state: Partial<MovingDirectoryState>,
  existingQuery: MovingRouteQuery = {}
): MovingRouteQuery {
  const normalized = readMovingQuery({
    servicio: state.category,
    departamento: state.department,
    q: state.query,
    precios: state.pricedOnly ? '1' : undefined,
    camion: state.vehicleOnly ? '1' : undefined,
    local: state.localOnly ? '1' : undefined,
    orden:
      state.sort === 'price-asc'
        ? 'precio-asc'
        : state.sort === 'price-desc'
          ? 'precio-desc'
          : undefined,
  })
  const query: MovingRouteQuery = Object.fromEntries(
    Object.entries(existingQuery)
      .filter(([key]) => !movingQueryKeys.includes(key))
      .map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])
  )
  if (normalized.category) query.servicio = normalized.category
  if (normalized.department) query.departamento = normalized.department
  if (normalized.query) query.q = normalized.query
  if (normalized.pricedOnly) query.precios = '1'
  if (normalized.vehicleOnly) query.camion = '1'
  if (normalized.localOnly) query.local = '1'
  if (normalized.sort !== 'name')
    query.orden = normalized.sort === 'price-asc' ? 'precio-asc' : 'precio-desc'
  return query
}

export function movingVehicleDocumented(vehicle: MovingVehicle): boolean {
  return Boolean(vehicle.dimensions || vehicle.volumeM3 || vehicle.payloadKg)
}

// Geographic containment, not a claim of department-wide service. Ambiguous names (Santa Ana,
// San Luis outside the coastal context, etc.) are intentionally not guessed.
const movingLocalities: Record<string, readonly string[]> = {
  Canelones: [
    'Costa de Oro',
    'Ciudad de la Costa',
    'Las Piedras',
    'La Paz',
    'Pando',
    'Paso Carrasco',
    'Solymar',
    'El Pinar',
    'Shangrilá',
    'Lagomar',
    'Neptunia',
    'Salinas',
    'Marindia',
    'Atlántida',
    'Las Toscas',
    'Parque del Plata',
    'La Floresta',
    'Costa Azul',
    'Bello Horizonte',
    'Guazubirá',
    'Cuchilla Alta',
    'Balneario Arg.',
    'Jaureguiberry',
    'Empalme Olmos',
  ],
  Maldonado: [
    'Punta del Este',
    'Piriápolis',
    'San Carlos',
    'La Barra',
    'José Ignacio',
    'Punta Ballena',
    'Manantiales',
    'Pinares',
    'Solanas',
    'Punta Colorada',
    'Pan de Azúcar',
    'Aiguá',
    'Playa Verde',
    'Playa Hermosa',
    'Playa Grande',
    'Bella Vista',
    'Solís',
  ],
  Colonia: [
    'Colonia del Sacramento',
    'Colonia Del Sacto',
    'Carmelo',
    'Nueva Palmira',
    'Nueva Palmiras',
    'Juan Lacaze',
    'Tarariras',
    'Colonia Valdense',
  ],
  Rocha: [
    'Rocha (Ciudad)',
    'Castillos (Rocha)',
    'La Paloma',
    'Castillos',
    'Chuy',
    'Chui',
    'La Coronilla',
    'Punta del Diablo',
  ],
  'San José': [
    'San José de Mayo',
    'Ciudad del Plata',
    'Libertad',
    'Ecilda Paullier',
    'Ecilda Paulier',
  ],
  Lavalleja: ['Minas', 'Solís de Mataojos', 'José Pedro Varela', 'Jose P. Varela'],
  'Cerro Largo': ['Melo', 'Río Branco', 'Aceguá'],
  Soriano: ['Mercedes', 'Cardona', 'Jose E. Rodo'],
  'Río Negro': ['Fray Bentos', 'Young'],
  Artigas: ['Bella Unión'],
  Tacuarembó: ['Paso de los Toros', 'P. de los Toros'],
  'Treinta y Tres': ['Vergara'],
}
export function movingAreaInDepartment(area: string, department: string): boolean {
  const target = movingFold(department)
  return (
    movingFold(area) === target ||
    Object.entries(movingLocalities).some(
      ([key, places]) =>
        movingFold(key) === target && places.some(place => movingFold(place) === movingFold(area))
    )
  )
}

export function movingPricesFor(
  provider: MovingProvider,
  category = '',
  query = ''
): MovingPrice[] {
  const prices = provider.prices.filter(price => !category || price.category === category)
  const terms = movingFold(query.trim()).split(/\s+/).filter(Boolean)
  const matches = (price: MovingPrice) =>
    terms.length > 0 && terms.every(term => movingFold(price.label).includes(term))
  // Search matches first, then base services, then extras. Never order unrelated work by amount.
  return [...prices].sort(
    (a, b) =>
      Number(matches(b)) - Number(matches(a)) ||
      Number(Boolean(a.additional)) - Number(Boolean(b.additional))
  )
}

/** The exact published tariff the UI must highlight when this provider is price-sorted. */
export function movingPriceForSort(
  provider: MovingProvider,
  filters: MovingFilters = {}
): MovingPrice | undefined {
  return movingPricesFor(provider, filters.category, filters.query).find(
    price => !price.additional && Number.isFinite(price.amount) && price.amount >= 0
  )
}

/** A group describes the published unit, not equivalent scope or a normalized total. */
export function movingPriceGroupKey(price?: MovingPrice): string {
  return price ? `${price.category}|${price.currency}|${price.unit}` : 'unpriced'
}

const movingSortCurrencies: MovingPrice['currency'][] = ['UYU', 'USD']
const movingSortUnits: MovingUnit[] = ['hour', 'trip', 'km', 'item', 'month', 'm2', 'service']

/**
 * Sort already-filtered providers. Currency/unit groups keep a fixed order in both directions;
 * only amounts within a group reverse. Package totals, fractions and range/from starting amounts
 * stay as published, with the selected tariff's label and conditions required alongside the price.
 */
export function sortMovingProviders(
  providers: readonly MovingProvider[],
  filters: MovingFilters = {},
  sort: MovingSort = 'name'
): MovingProvider[] {
  const byName = (a: MovingProvider, b: MovingProvider) =>
    a.name.localeCompare(b.name, 'es') || a.id.localeCompare(b.id, 'es')
  if (sort === 'name') return [...providers].sort(byName)

  const entries = providers.map(provider => ({
    provider,
    price: movingPriceForSort(provider, filters),
  }))
  const direction = sort === 'price-desc' ? -1 : 1
  entries.sort((a, b) => {
    if (!a.price && !b.price) return byName(a.provider, b.provider)
    if (!a.price) return 1
    if (!b.price) return -1
    return (
      MOVING_CATEGORIES.indexOf(a.price.category) - MOVING_CATEGORIES.indexOf(b.price.category) ||
      movingSortCurrencies.indexOf(a.price.currency) -
        movingSortCurrencies.indexOf(b.price.currency) ||
      movingSortUnits.indexOf(a.price.unit) - movingSortUnits.indexOf(b.price.unit) ||
      direction * (a.price.amount - b.price.amount) ||
      byName(a.provider, b.provider)
    )
  })
  return entries.map(entry => entry.provider)
}

export function filterMovingProviders(
  providers: readonly MovingProvider[],
  filters: MovingFilters
) {
  const terms = movingFold(filters.query?.trim() || '')
    .split(/\s+/)
    .filter(Boolean)
  const department = movingFold(filters.department || '')
  return providers
    .filter(provider => {
      if (filters.category && !provider.categories.includes(filters.category as MovingCategory))
        return false
      if (
        filters.pricedOnly &&
        !movingPricesFor(provider, filters.category).some(price => !price.additional)
      )
        return false
      if (filters.vehicleOnly && !provider.vehicles.some(movingVehicleDocumented)) return false
      if (department) {
        const based = movingFold(provider.baseDepartment || '') === department
        if (filters.localOnly && !based) return false
        if (
          !filters.localOnly &&
          !based &&
          !provider.nationwide &&
          !provider.coverage.some(area => movingAreaInDepartment(area, department))
        )
          return false
      }
      const haystack = movingFold(
        [
          provider.name,
          provider.summary,
          provider.baseDepartment,
          ...provider.coverage,
          ...provider.services,
          ...movingPricesFor(provider, filters.category).map(price => price.label),
          ...provider.vehicles.map(vehicle => `${vehicle.label} ${vehicle.dimensions || ''}`),
        ].join(' ')
      )
      const words = haystack.split(/[^a-z0-9]+/).filter(Boolean)
      return terms.every(term => words.some(word => word.startsWith(term)))
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/** A public contact is actionable only if its format is unambiguous. No guessed digit repairs. */
export function movingContactHref(contact: MovingContact): string | undefined {
  if (contact.kind === 'email') {
    return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(contact.value)
      ? `mailto:${contact.value}`
      : undefined
  }
  let number = contact.value.replace(/[\s().-]/g, '')
  if (/^0[249]\d{7}$/.test(number)) number = `+598${number.slice(1)}`
  else if (/^[24]\d{7}$/.test(number)) number = `+598${number}`
  else if (/^598[249]\d{7}$/.test(number)) number = `+${number}`
  if (!/^\+598[249]\d{7}$/.test(number)) return undefined
  return contact.kind === 'whatsapp' ? `https://wa.me/${number.slice(1)}` : `tel:${number}`
}

export function movingEvidenceAge(accessedAt: string, today: string): number | null {
  const read = Date.parse(accessedAt)
  const now = Date.parse(today)
  if (!Number.isFinite(read) || !Number.isFinite(now)) return null
  return Math.max(0, Math.floor((now - read) / 86_400_000))
}
