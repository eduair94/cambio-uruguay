/**
 * Saved searches for the listing directories that are not rentals: used cars, used motos and homes
 * for sale. Each kind normalises with its own directory's normaliser and serialiser, so a stored
 * alert and the page it came from can never disagree about what the search means.
 */
import { RentalAlertValidationError } from './alertErrors'
import { carsFilterChips, carsQueryParams, normalizeCarsQuery } from './cars'
import { motoFilterChips, motoNormalizeQuery, motoQueryParams, type MotoFacets } from './motos'
import {
  PROPERTY_SALES_PATH,
  normalizePropertySalesQuery,
  propertySalesQueryToParams,
} from './propertySales'
import { propertySaleSourceName, propertySalesMessages } from './propertySalesMessages'

export const LISTING_ALERT_KINDS = ['car-search', 'moto-search', 'sale-search'] as const
export type ListingAlertKind = (typeof LISTING_ALERT_KINDS)[number]

export function isListingAlertKind(value: unknown): value is ListingAlertKind {
  return (LISTING_ALERT_KINDS as readonly unknown[]).includes(value)
}

/** Only the comparison against other adverts has no own price to fall from. */
export function kindSupportsPriceDrops(kind: string): boolean {
  return kind !== 'rental-opportunity'
}

/** Layout, paging and "seen in the last N days": an alert only ever looks at what is new. */
const PRESENTATION = new Set([
  'sort',
  'page',
  'perPage',
  'view',
  'keys',
  'sinceDays',
  'recent',
  'refLat',
  'refLng',
  'refLabel',
])

interface ListingDirectory {
  path: string
  allowed: ReadonlySet<string>
  defaults: Record<string, unknown>
  params: (input: Record<string, unknown>) => Record<string, string>
}

const DIRECTORIES: Record<ListingAlertKind, ListingDirectory> = {
  'car-search': {
    path: '/autos-usados-uruguay',
    allowed: new Set(Object.keys(normalizeCarsQuery({}))),
    defaults: { ...normalizeCarsQuery({}) },
    params: input => carsQueryParams(normalizeCarsQuery(input)),
  },
  'moto-search': {
    path: '/motos-usadas-uruguay',
    allowed: new Set(Object.keys(motoNormalizeQuery({}))),
    defaults: { ...motoNormalizeQuery({}) },
    params: input => motoQueryParams(motoNormalizeQuery(input)),
  },
  'sale-search': {
    path: PROPERTY_SALES_PATH,
    allowed: new Set([...Object.keys(normalizePropertySalesQuery({})), 'dueno']),
    defaults: { ...normalizePropertySalesQuery({}) },
    params: input => propertySalesQueryToParams(normalizePropertySalesQuery(input)),
  },
}

export function listingAlertPath(kind: ListingAlertKind): string {
  return DIRECTORIES[kind].path
}

const populated = (value: unknown) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)

function filterParams(directory: ListingDirectory, input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(directory.params(input)).filter(([key]) => !PRESENTATION.has(key))
  )
}

/** Reject criteria the directory would drop instead of turning a narrow alert into a broad one. */
export function normalizeListingAlertFilters(
  kind: ListingAlertKind,
  input: unknown
): Record<string, string> {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).length > 45
  )
    throw new RentalAlertValidationError('invalid_alert')
  const directory = DIRECTORIES[kind]
  const empty = JSON.stringify(filterParams(directory, {}))
  const kept: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (PRESENTATION.has(key) || !populated(value)) continue
    if (!directory.allowed.has(key) || Array.isArray(value))
      throw new RentalAlertValidationError('unsupported_filter')
    if (!['string', 'number', 'boolean'].includes(typeof value) || String(value).length > 200)
      throw new RentalAlertValidationError('invalid_alert')
    const alone = JSON.stringify(filterParams(directory, { [key]: value }))
    const neutral =
      ['0', 'all', 'false'].includes(String(value)) ||
      String(directory.defaults[key]) === String(value)
    if (alone === empty && !neutral) throw new RentalAlertValidationError('unsupported_filter')
    kept[key] = value
  }
  return Object.fromEntries(
    Object.entries(filterParams(directory, kept)).sort(([a], [b]) => a.localeCompare(b))
  )
}

/** "citroen-c4-picasso" → "Citroen C4 Picasso": the directory shows facet names we do not store. */
function slugName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const SALE_LABELS: Record<string, string> = {
  q: 'keywords',
  department: 'department',
  locality: 'locality',
  neighborhood: 'neighborhood',
  type: 'type',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  minArea: 'minArea',
  maxArea: 'maxArea',
  parking: 'parking',
  furnished: 'furnished',
  photos: 'photos',
  amenity: 'amenity',
  seller: 'seller',
  agency: 'selectedAgency',
  owner: 'owner',
  source: 'source',
}
const SALE_FLAGS = new Set(['agency', 'owner', 'parking', 'furnished', 'photos'])

/** The same chips the directory shows above its results, as plain text for the alert summary. */
export function listingAlertChips(
  kind: ListingAlertKind,
  filters: Record<string, unknown>,
  locale: string
): string[] {
  if (kind === 'car-search') {
    const query = normalizeCarsQuery(filters)
    const named = (slug: string) => (slug ? [{ slug, name: slugName(slug), count: 0 }] : [])
    return carsFilterChips(query, {
      brands: named(query.brand),
      models: named(query.model),
    }).map(chip => chip.label)
  }
  if (kind === 'moto-search') {
    const query = motoNormalizeQuery(filters)
    const named = (value: string) => (value ? [{ value, label: slugName(value), count: 0 }] : [])
    return motoFilterChips(query, {
      brands: named(query.marca),
      models: named(query.modelo),
    } as MotoFacets).map(chip => chip.label)
  }
  const lang = locale.startsWith('en') ? 'en' : locale.startsWith('pt') ? 'pt' : 'es'
  const messages = propertySalesMessages[lang] as Record<string, string>
  const query = normalizePropertySalesQuery(filters)
  const money = new Intl.NumberFormat(lang === 'es' ? 'es-UY' : lang === 'pt' ? 'pt-BR' : 'en-US')
  return Object.entries(propertySalesQueryToParams(query))
    .filter(([key]) => key in SALE_LABELS)
    .map(([key, value]) => {
      const label = messages[SALE_LABELS[key]!] ?? key
      if (SALE_FLAGS.has(key)) return label
      const shown =
        key === 'type' || key === 'amenity'
          ? (messages[value] ?? value)
          : key === 'source'
            ? propertySaleSourceName(value)
            : key === 'minPrice' || key === 'maxPrice'
              ? `${query.currency} ${money.format(Number(value))}`
              : value
      return `${label}: ${shown}`
    })
}
