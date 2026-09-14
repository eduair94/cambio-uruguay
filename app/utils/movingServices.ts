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
