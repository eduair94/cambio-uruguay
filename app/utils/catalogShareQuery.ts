/* eslint-disable no-control-regex -- Strip invisible controls from user-provided filter text. */
import { emptyChairFilters, type ChairDirectoryFilters } from './chairCatalog'

export const PHONE_SHARE_QUERY_KEYS = ['marca', 'precioMax'] as const
export const CHAIR_SHARE_QUERY_KEYS = [
  'q',
  'marca',
  'categoria',
  'condicion',
  'precioMax',
  'rating',
  'orden',
] as const

const text = (value: unknown): string => {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string'
    ? first
        .replace(/[\u0000-\u001F<>]/g, '')
        .trim()
        .slice(0, 100)
    : ''
}
const price = (value: unknown): number | null => {
  const raw = text(value)
  if (!/^\d{1,7}$/.test(raw)) return null
  const result = Number(raw)
  return result <= 1_000_000 ? result : null
}

export interface PhoneShareFilters {
  brand: string | null
  maxPrice: number | null
}

export function phoneFiltersFromQuery(query: Record<string, unknown>): PhoneShareFilters {
  const brand = text(query.marca)
  return {
    brand: /^[a-z0-9-]{1,50}$/.test(brand) ? brand : null,
    maxPrice: price(query.precioMax),
  }
}

export function phoneFiltersToQuery(filters: PhoneShareFilters): Record<string, string> {
  return {
    ...(filters.brand ? { marca: filters.brand } : {}),
    ...(filters.maxPrice !== null ? { precioMax: String(filters.maxPrice) } : {}),
  }
}

export function chairFiltersFromQuery(query: Record<string, unknown>): ChairDirectoryFilters {
  const filters = emptyChairFilters()
  filters.query = text(query.q)
  filters.brand = text(query.marca) || 'all'
  filters.maxPrice = price(query.precioMax)
  const category = text(query.categoria)
  if (['ergonomic', 'gaming', 'executive', 'operative', 'unknown'].includes(category))
    filters.category = category as ChairDirectoryFilters['category']
  const condition = text(query.condicion)
  if (condition === 'new' || condition === 'used') filters.condition = condition
  const stars = Number(text(query.rating))
  if ([3, 4, 4.5].includes(stars)) filters.minStars = stars
  const sort = text(query.orden)
  if (['price-asc', 'price-desc', 'rating', 'sellers'].includes(sort))
    filters.sort = sort as ChairDirectoryFilters['sort']
  return filters
}

export function chairFiltersToQuery(filters: ChairDirectoryFilters): Record<string, string> {
  return {
    ...(filters.query.trim() ? { q: filters.query.trim() } : {}),
    ...(filters.brand !== 'all' ? { marca: filters.brand } : {}),
    ...(filters.category !== 'all' ? { categoria: filters.category } : {}),
    ...(filters.condition !== 'all' ? { condicion: filters.condition } : {}),
    ...(filters.maxPrice !== null ? { precioMax: String(filters.maxPrice) } : {}),
    ...(filters.minStars ? { rating: String(filters.minStars) } : {}),
    ...(filters.sort !== 'relevance' ? { orden: filters.sort } : {}),
  }
}

/** Replace only our filters; campaigns and other independent controls retain their values. */
export function catalogQueryWithFilters(
  search: string,
  ownedKeys: readonly string[],
  values: Record<string, string>
): string {
  const params = new URLSearchParams(search)
  for (const key of ownedKeys) params.delete(key)
  for (const [key, value] of Object.entries(values)) params.set(key, value)
  return params.toString()
}
