import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mismo patrón que `equiparCategoryRoute.test.ts`: stub los globals de Nitro y mockear los dos
// modelos + `connectDb`, sin levantar Mongo ni el runtime de Nuxt.
const { connectDb, findOneMock, leanOneMock, findMock, leanMock, headers } = vi.hoisted(() => {
  const leanOneMock = vi.fn()
  const findOneMock = vi.fn(() => ({ select: () => ({ lean: leanOneMock }) }))
  const leanMock = vi.fn()
  const findMock = vi.fn(() => ({ select: () => ({ lean: leanMock }) }))
  return {
    connectDb: vi.fn(),
    findOneMock,
    leanOneMock,
    findMock,
    leanMock,
    headers: [] as unknown[][],
  }
})

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/MovilidadMeta', () => ({
  MovilidadMetaModel: { findOne: findOneMock },
}))
vi.mock('../../server/models/MovilidadItem', () => ({ MovilidadItemModel: { find: findMock } }))

// La ficha técnica de los modelos de monopatín (`attachMonopatinSpecs`): un `$in` sobre
// movilidadlistings y el snapshot de currency-movilidad-specs.
const { listingLeanMock, snapshotLeanMock } = vi.hoisted(() => ({
  listingLeanMock: vi.fn(),
  snapshotLeanMock: vi.fn(),
}))
vi.mock('../../server/models/MovilidadListing', () => ({
  MovilidadListingModel: {
    find: () => ({ select: () => ({ maxTimeMS: () => ({ lean: listingLeanMock }) }) }),
  },
}))
vi.mock('../../server/models/MovilidadSpecSnapshot', () => ({
  MovilidadSpecSnapshotModel: {
    findOne: () => ({ select: () => ({ maxTimeMS: () => ({ lean: snapshotLeanMock }) }) }),
  },
}))

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', (event: any, key: string) => event[key])
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) =>
  headers.push([name, value])
)
vi.stubGlobal('createError', (options: Record<string, unknown>) =>
  Object.assign(new Error(String(options.statusMessage)), options)
)

const handler = (await import('../../server/api/movilidad/[categoria].get')).default

beforeEach(() => {
  connectDb.mockReset()
  findOneMock.mockClear()
  leanOneMock.mockReset()
  findMock.mockClear()
  leanMock.mockReset()
  listingLeanMock.mockReset()
  listingLeanMock.mockResolvedValue([])
  snapshotLeanMock.mockReset()
  snapshotLeanMock.mockResolvedValue(null)
  headers.length = 0
})

afterAll(() => vi.unstubAllGlobals())

describe('la ficha técnica de los modelos de monopatín', () => {
  const item = (products: unknown[]) => ({
    key: 'monopatin-electrico:urbano',
    category: 'monopatin-electrico',
    categoryLabel: 'Monopatín eléctrico',
    variant: 'urbano',
    variantLabel: 'Urbano o estándar',
    room: 'movilidad',
    tier: 'B',
    rank: 0,
    variantRank: 2,
    image: null,
    regime: 'modelo',
    reason: 'transporte',
    usedOk: true,
    quantity: 1,
    newBand: null,
    usedBand: null,
    usedSavingPct: null,
    products,
    offers: [],
    suspectDropped: 0,
    observedAt: null,
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-01',
  })
  const offer = (listingId: string) => ({
    listingId,
    seller: 'Tienda',
    title: 'Monopatín',
    url: 'https://example.com',
    price: 20_000,
    currency: 'UYU',
    priceUyu: 20_000,
    condition: 'new',
    source: 'mercadolibre',
    observedAt: '2026-11-03',
  })

  it('pega a cada modelo la ficha de su primera oferta leída y las medianas por tipo', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockResolvedValue([
      item([
        {
          slug: 'xiaomi-6',
          name: 'Xiaomi 6',
          brand: 'Xiaomi',
          model: '6',
          image: null,
          offers: [offer('ml:2'), offer('ml:1')],
          bestPriceUyu: 20_000,
          sellers: 2,
        },
        {
          slug: 'otro',
          name: 'Otro',
          brand: 'X',
          model: 'y',
          image: null,
          offers: [offer('ml:9')],
          bestPriceUyu: 20_000,
          sellers: 1,
        },
      ]),
    ])
    listingLeanMock.mockResolvedValue([
      { listingId: 'ml:1', specs: { rangeKm: 45, motorW: 800, from: { rangeKm: 'ficha' } } },
      // Sólo del título: no alcanza para mostrarla como la ficha del modelo.
      { listingId: 'ml:9', specs: { rangeKm: 20, from: { rangeKm: 'titulo' } } },
    ])
    const stats = {
      byVariant: [],
      all: { variant: 'todos', label: 'Todos', n: 3 },
      withFicha: 1,
      total: 3,
      withSpeed: 0,
      over25: 0,
    }
    snapshotLeanMock.mockResolvedValue({ stats })

    const result = await handler({ categoria: 'monopatin-electrico' } as any)
    const [xiaomi, otro] = result.items[0]!.products as Array<{ specs?: unknown }>
    expect(xiaomi!.specs).toMatchObject({ rangeKm: 45, motorW: 800, fromFicha: true })
    expect(otro).not.toHaveProperty('specs')
    expect(result.specStats).toEqual(stats)
  })

  it('las bicicletas leen su propio snapshot (desde el 4/11/2026) y no buscan fichas por modelo', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockResolvedValue([])
    snapshotLeanMock.mockResolvedValue({ stats: { withFicha: 3, total: 9 } })
    const result = await handler({ categoria: 'bicicleta-electrica' } as any)
    // Régimen commodity: no hay `products`, así que no hay ofertas de modelo que buscar.
    expect(listingLeanMock).not.toHaveBeenCalled()
    expect(snapshotLeanMock).toHaveBeenCalled()
    expect(result.specStats).toMatchObject({ withFicha: 3, total: 9 })
  })
})

describe('GET /api/movilidad/[categoria]', () => {
  it('rechaza una categoría desconocida con 404 y nunca toca la base', async () => {
    await expect(handler({ categoria: 'heladera' } as any)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(connectDb).not.toHaveBeenCalled()
    expect(findOneMock).not.toHaveBeenCalled()
    expect(findMock).not.toHaveBeenCalled()
    expect(headers).toEqual([])
  })

  it('rechaza también una categoría vacía o con espacios, sin tocar la base', async () => {
    await expect(handler({ categoria: '' } as any)).rejects.toMatchObject({ statusCode: 404 })
    await expect(handler({ categoria: 'monopatin-electrico ' } as any)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(connectDb).not.toHaveBeenCalled()
  })

  it('resuelve la forma 200 para una categoría real, con caché de 600 s', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue({
      generatedAt: '2026-09-17T00:00:00.000Z',
      usdUyu: 40,
      runs: [
        {
          key: 'ml',
          label: 'Mercado Libre',
          adapter: 'mercadolibre',
          listings: 12,
          ok: true,
          note: 'nota interna',
        },
      ],
    })
    leanMock.mockResolvedValue([])

    const result = await handler({ categoria: 'monopatin-electrico' } as any)

    // `note` y `key` nunca salen del endpoint, sólo `label`/`ok`/`listings`.
    expect(result).toEqual({
      category: 'monopatin-electrico',
      generatedAt: '2026-09-17T00:00:00.000Z',
      usdUyu: 40,
      sources: [{ label: 'Mercado Libre', ok: true, listings: 12 }],
      items: [],
      // Sólo monopatín: sin snapshot todavía, la página no dibuja "Qué esperar de cada tipo".
      specStats: null,
    })
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'monopatin-electrico', lastSeen: expect.anything() })
    )
    expect(headers).toContainEqual([
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400',
    ])
  })

  it('funciona igual para la otra categoría del registro', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockResolvedValue([])

    const result = await handler({ categoria: 'bicicleta-electrica' } as any)

    expect(result.category).toBe('bicicleta-electrica')
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'bicicleta-electrica' })
    )
  })

  it('recorta productos y ofertas a través de movilidadCategoryProjection', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    const offers = Array.from({ length: 20 }, (_, i) => ({
      seller: 'Tienda',
      title: 'Producto',
      url: 'https://example.com',
      price: 1000 + i,
      currency: 'UYU',
      priceUyu: 1000 + i,
      condition: 'new',
      source: 'store',
      observedAt: '2026-09-10',
    }))
    leanMock.mockResolvedValue([
      {
        key: 'monopatin-electrico:urbano',
        category: 'monopatin-electrico',
        categoryLabel: 'Monopatín eléctrico',
        variant: 'urbano',
        variantLabel: 'Urbano o estándar',
        room: 'movilidad',
        tier: 'B',
        rank: 999,
        variantRank: 2,
        image: null,
        regime: 'modelo',
        reason: 'transporte',
        usedOk: true,
        quantity: 1,
        newBand: null,
        usedBand: null,
        usedSavingPct: null,
        products: [],
        offers,
        suspectDropped: 0,
        observedAt: null,
        firstSeen: '2026-01-01',
        lastSeen: '2026-01-01',
      },
    ])

    const result = await handler({ categoria: 'monopatin-electrico' } as any)
    expect(result.items[0]!.offers).toHaveLength(14)
  })

  it('resuelve la forma vacía, sin lanzar, con cache-control no-store cuando falla la base', async () => {
    connectDb.mockRejectedValue(new Error('mongo down'))

    const result = await handler({ categoria: 'monopatin-electrico' } as any)

    expect(result).toEqual({
      category: 'monopatin-electrico',
      generatedAt: null,
      usdUyu: null,
      sources: [],
      items: [],
    })
    expect(headers).toContainEqual(['cache-control', 'no-store'])
    expect(headers).not.toContainEqual([
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400',
    ])
  })
})
