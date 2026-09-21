import {
  EQUIPAR_FUENTE_SOURCE,
  type EquiparListingDoc,
  type EquiparProductoPublic,
  type EquiparProductosQuery,
  type EquiparProductosSort,
} from '../../utils/equiparProductos'

/** Same freshness window as `/api/equipar`: a listing not seen in 4 days is not on sale today. */
export const EQUIPAR_PRODUCTOS_STALE_DAYS = 4

export const equiparProductosCutoff = (now: number = Date.now()): string =>
  new Date(now - EQUIPAR_PRODUCTOS_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)

/** A reader's free text is a literal, never a pattern. */
export const equiparEscapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The Mongo `$match` for one query. `suspect: false` is unconditional: the band doubted those rows
 * and a directory sorted by "menor precio" would lead with them. `ignore` drops one filter so a
 * facet can count what each of its options would return with the OTHER filters kept.
 */
export function equiparProductosMatch(
  query: EquiparProductosQuery,
  cutoff: string,
  ignore: ReadonlyArray<keyof EquiparProductosQuery> = []
): Record<string, unknown> {
  const skip = (key: keyof EquiparProductosQuery) => ignore.includes(key)
  const match: Record<string, unknown> = { suspect: false, lastSeen: { $gte: cutoff } }
  if (query.categoria && !skip('categoria')) match.category = query.categoria
  if (query.categoria && query.variante && !skip('variante')) match.variant = query.variante
  if (query.condicion && !skip('condicion'))
    match.condition = query.condicion === 'usado' ? 'used' : 'new'
  if (query.fuente && !skip('fuente')) match.source = EQUIPAR_FUENTE_SOURCE[query.fuente]
  if (query.vendedor && !skip('vendedor')) match.sellerKey = query.vendedor
  if (query.marca && !skip('marca')) match.brandKey = query.marca
  if ((query.precioMin !== null || query.precioMax !== null) && !skip('precioMin')) {
    const range: Record<string, number> = {}
    if (query.precioMin !== null) range.$gte = query.precioMin
    if (query.precioMax !== null && !skip('precioMax')) range.$lte = query.precioMax
    if (Object.keys(range).length) match.priceUyu = range
  }
  if (query.q && !skip('q')) match.title = { $regex: equiparEscapeRegex(query.q), $options: 'i' }
  return match
}

export function equiparProductosSort(orden: EquiparProductosSort): Record<string, 1 | -1> {
  switch (orden) {
    case 'precio_desc':
      return { priceUyu: -1, listingId: 1 }
    case 'reciente':
      return { observedAt: -1, listingId: 1 }
    default:
      return { priceUyu: 1, listingId: 1 }
  }
}

/** Card fields only; `brandKey`, `channel`, `suspect`, `firstSeen` and the timestamps stay inside. */
export const EQUIPAR_PRODUCTOS_PROJECTION = {
  _id: 0,
  listingId: 1,
  category: 1,
  categoryLabel: 1,
  variant: 1,
  variantLabel: 1,
  tier: 1,
  rank: 1,
  condition: 1,
  source: 1,
  sellerKey: 1,
  sellerName: 1,
  brand: 1,
  title: 1,
  url: 1,
  image: 1,
  price: 1,
  currency: 1,
  priceUyu: 1,
  listPrice: 1,
  location: 1,
  freeShipping: 1,
  lastSeen: 1,
} as const

export function equiparProductoPublic(row: Partial<EquiparListingDoc>): EquiparProductoPublic {
  return {
    listingId: String(row.listingId ?? ''),
    category: String(row.category ?? ''),
    categoryLabel: String(row.categoryLabel ?? ''),
    variant: String(row.variant ?? ''),
    variantLabel: String(row.variantLabel ?? ''),
    tier: (row.tier ?? 'C') as EquiparProductoPublic['tier'],
    rank: typeof row.rank === 'number' ? row.rank : 999,
    condition: row.condition === 'used' ? 'used' : 'new',
    source: (row.source ?? 'store') as EquiparProductoPublic['source'],
    sellerKey: String(row.sellerKey ?? ''),
    sellerName: String(row.sellerName ?? ''),
    brand: String(row.brand ?? ''),
    title: String(row.title ?? ''),
    url: String(row.url ?? ''),
    image: typeof row.image === 'string' && row.image ? row.image : null,
    price: Number(row.price ?? 0),
    currency: row.currency === 'USD' ? 'USD' : 'UYU',
    priceUyu: Number(row.priceUyu ?? 0),
    listPrice: typeof row.listPrice === 'number' ? row.listPrice : null,
    location: typeof row.location === 'string' && row.location ? row.location : null,
    freeShipping: typeof row.freeShipping === 'boolean' ? row.freeShipping : null,
    lastSeen: String(row.lastSeen ?? ''),
  }
}
