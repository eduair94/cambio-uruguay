import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EQUIPAR_PRODUCTOS_PROJECTION,
  equiparEscapeRegex,
  equiparProductoPublic,
  equiparProductosMatch,
  equiparProductosSort,
} from '../../server/utils/equiparProductos'
import { equiparProductosNormalize } from '../../utils/equiparProductos'

const CUTOFF = '2026-09-17'

describe('equiparProductosMatch', () => {
  it('always keeps suspect rows out and applies the freshness window', () => {
    const match = equiparProductosMatch(equiparProductosNormalize({}), CUTOFF)
    expect(match).toEqual({ suspect: false, lastSeen: { $gte: CUTOFF } })
  })

  it('maps the query vocabulary onto the stored one', () => {
    const match = equiparProductosMatch(
      equiparProductosNormalize({
        categoria: 'heladera',
        variante: 'media',
        condicion: 'usado',
        fuente: 'tienda',
        vendedor: 'divino',
        marca: 'samsung',
        precioMin: '1000',
        precioMax: '50000',
        q: 'no frost (300L)',
      }),
      CUTOFF
    )
    expect(match.category).toBe('heladera')
    expect(match.variant).toBe('media')
    expect(match.condition).toBe('used')
    expect(match.source).toBe('store')
    expect(match.sellerKey).toBe('divino')
    expect(match.brandKey).toBe('samsung')
    expect(match.priceUyu).toEqual({ $gte: 1000, $lte: 50_000 })
    // Parentheses in the reader's text are characters, not a group.
    expect(match.title).toEqual({ $regex: 'no frost \\(300L\\)', $options: 'i' })
  })

  it('ignores one filter so a facet can count the other options', () => {
    const query = equiparProductosNormalize({ categoria: 'heladera', marca: 'samsung' })
    const match = equiparProductosMatch(query, CUTOFF, ['marca'])
    expect(match.category).toBe('heladera')
    expect('brandKey' in match).toBe(false)
  })

  it('escapes regex metacharacters', () => {
    expect(equiparEscapeRegex('a.b*c')).toBe('a\\.b\\*c')
  })
})

describe('equiparProductosSort', () => {
  it('sorts by price by default, with a stable tie-break', () => {
    expect(equiparProductosSort('precio_asc')).toEqual({ priceUyu: 1, listingId: 1 })
    expect(equiparProductosSort('precio_desc')).toEqual({ priceUyu: -1, listingId: 1 })
    expect(equiparProductosSort('reciente')).toEqual({ observedAt: -1, listingId: 1 })
  })
})

describe('equiparProductoPublic', () => {
  it('publishes card fields only and never the internal ones', () => {
    expect('brandKey' in EQUIPAR_PRODUCTOS_PROJECTION).toBe(false)
    expect('suspect' in EQUIPAR_PRODUCTOS_PROJECTION).toBe(false)
    expect('channel' in EQUIPAR_PRODUCTOS_PROJECTION).toBe(false)
    const row = equiparProductoPublic({
      listingId: 'fb:1',
      category: 'olla',
      categoryLabel: 'Olla',
      condition: 'used',
      source: 'facebook',
      price: 500,
      currency: 'UYU',
      priceUyu: 500,
      image: '',
      lastSeen: '2026-09-21',
    })
    expect(row.condition).toBe('used')
    expect(row.source).toBe('facebook')
    expect(row.image).toBeNull()
    expect(row.brand).toBe('')
    expect(row.rank).toBe(999)
  })
})

// --- the handler, with the models mocked -------------------------------------------------------

const { connectDb, listingModel, metaModel, headers } = vi.hoisted(() => {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {}
    for (const name of ['select', 'sort', 'skip', 'limit', 'maxTimeMS', 'option']) {
      c[name] = vi.fn(() => c)
    }
    c.lean = vi.fn(async () => result)
    c.then = (resolve: (value: unknown) => void) => resolve(result)
    return c
  }
  const listingModel = {
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    _chain: chain,
  }
  const metaModel = {
    findOne: vi.fn(() => chain({ generatedAt: '2026-09-21T10:00:00.000Z', usdUyu: 40 })),
  }
  return { connectDb: vi.fn(), listingModel, metaModel, headers: [] as unknown[][] }
})

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/EquiparListing', () => ({ EquiparListingModel: listingModel }))
vi.mock('../../server/models/EquiparMeta', () => ({ EquiparMetaModel: metaModel }))

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getQuery', (event: { query?: Record<string, unknown> }) => event.query ?? {})
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) =>
  headers.push([name, value])
)
vi.stubGlobal('createError', (options: Record<string, unknown>) =>
  Object.assign(new Error(String(options.statusMessage)), options)
)

const handler = (await import('../../server/api/equipar/productos.get')).default as (event: {
  query?: Record<string, unknown>
}) => Promise<import('../../utils/equiparProductos').EquiparProductosResponse>

const stored = {
  listingId: 'ml:1',
  category: 'heladera',
  categoryLabel: 'Heladera',
  variant: 'media',
  variantLabel: 'Media',
  tier: 'S',
  rank: 0,
  condition: 'new',
  source: 'mercadolibre',
  sellerKey: 'mercadolibre',
  sellerName: 'X',
  brand: 'Samsung',
  title: 'Heladera',
  url: 'https://articulo.mercadolibre.com.uy/MLU-1',
  image: null,
  price: 30_000,
  currency: 'UYU',
  priceUyu: 30_000,
  listPrice: null,
  location: null,
  freeShipping: null,
  lastSeen: '2026-09-21',
}

beforeEach(() => {
  connectDb.mockReset()
  headers.length = 0
  listingModel.find.mockReset()
  listingModel.countDocuments.mockReset()
  listingModel.aggregate.mockReset()
  listingModel.find.mockImplementation(() => listingModel._chain([stored]))
  listingModel.countDocuments.mockImplementation(() => listingModel._chain(1))
  listingModel.aggregate.mockImplementation((pipeline: Array<Record<string, unknown>>) => {
    const group = pipeline[1]!.$group as { _id: string }
    const field = group._id.slice(1)
    const value = field === 'source' ? 'store' : field === 'condition' ? 'used' : 'heladera'
    return listingModel._chain([
      { _id: value, name: value === 'store' ? 'store' : 'Heladera', count: 3 },
    ])
  })
})

describe('GET /api/equipar/productos', () => {
  it('pages in Mongo, translates the facets and caches for five minutes', async () => {
    const response = await handler({ query: { categoria: 'heladera', page: '3' } })
    expect(response.total).toBe(1)
    expect(response.page).toBe(3)
    expect(response.perPage).toBe(24)
    expect(response.items[0]!.listingId).toBe('ml:1')
    expect(response.usdUyu).toBe(40)
    const chain = listingModel.find.mock.results[0]!.value as Record<
      string,
      ReturnType<typeof vi.fn>
    >
    expect(chain.skip).toHaveBeenCalledWith(48)
    expect(chain.limit).toHaveBeenCalledWith(24)
    expect(response.facets.fuentes).toEqual([{ slug: 'tienda', name: 'Tienda', count: 3 }])
    expect(response.facets.condiciones).toEqual([{ slug: 'usado', name: 'Usado', count: 3 }])
    expect(response.facets.categorias[0]!.slug).toBe('heladera')
    expect(response.facets.variantes.length).toBeGreaterThan(0)
    expect(headers).toContainEqual(['cache-control', 'public, max-age=300, s-maxage=300'])
  })

  it('does not count variants without a category', async () => {
    const response = await handler({ query: {} })
    expect(response.facets.variantes).toEqual([])
  })

  it('?ids= returns those rows, unfiltered, and never from a shared cache', async () => {
    const response = await handler({ query: { ids: 'ml:1, fb:2,,bad id', categoria: 'olla' } })
    const filter = listingModel.find.mock.calls[0]![0] as { listingId: { $in: string[] } }
    expect(filter).toEqual({ listingId: { $in: ['ml:1', 'fb:2'] } })
    expect(response.items).toHaveLength(1)
    expect(response.facets.categorias).toEqual([])
    expect(headers).toContainEqual(['cache-control', 'private, no-store'])
  })

  it('a database failure is a 503 that is never cached', async () => {
    connectDb.mockRejectedValueOnce(new Error('down'))
    await expect(handler({ query: {} })).rejects.toMatchObject({ statusCode: 503 })
    expect(headers).toContainEqual(['cache-control', 'no-store'])
  })
})
