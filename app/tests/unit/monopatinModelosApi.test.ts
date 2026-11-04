import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mismo patrón que movilidadApi.test.ts: stub de los globals de Nitro y del modelo, sin Mongo.
const { connectDb, findOneLean, findLean, findOneFilter, findFilter, headers } = vi.hoisted(() => ({
  connectDb: vi.fn(),
  findOneLean: vi.fn(),
  findLean: vi.fn(),
  findOneFilter: [] as unknown[],
  findFilter: [] as unknown[],
  headers: [] as unknown[][],
}))

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/MovilidadModel', () => ({
  MovilidadModelModel: {
    findOne: (filter: unknown) => {
      findOneFilter.push(filter)
      return { select: () => ({ maxTimeMS: () => ({ lean: findOneLean }) }) }
    },
    find: (filter: unknown) => {
      findFilter.push(filter)
      return { select: () => ({ maxTimeMS: () => ({ lean: findLean }) }) }
    },
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

const detail = (await import('../../server/api/movilidad/modelos/[slug].get')).default
const list = (await import('../../server/api/movilidad/modelos/index.get')).default

const model = (slug: string, over: Record<string, unknown> = {}) => ({
  slug,
  name: slug,
  brandKey: 'xiaomi',
  brandLabel: 'Xiaomi',
  modelLabel: slug,
  variant: 'urbano',
  image: null,
  offers: [],
  newBand: { min: 30000, median: 31000, max: 32000, n: 2, sellers: 2 },
  usedBand: null,
  specs: null,
  fichas: 1,
  listings: 2,
  sellers: 2,
  indexable: true,
  firstSeen: '2026-10-01',
  lastSeen: '2026-11-04',
  generatedAt: '2026-11-04T06:01:00Z',
  history: [],
  ...over,
})

beforeEach(() => {
  connectDb.mockReset()
  findOneLean.mockReset()
  findLean.mockReset()
  findOneFilter.length = 0
  findFilter.length = 0
  headers.length = 0
})
afterAll(() => vi.unstubAllGlobals())

const cache = () => headers.find(([name]) => name === 'cache-control')?.[1]

describe('GET /api/movilidad/modelos/<slug>', () => {
  it('un slug malformado es 404 sin tocar la base', async () => {
    await expect(detail({ slug: 'comparar' } as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(connectDb).not.toHaveBeenCalled()
    expect(cache()).toBe('no-store')
  })

  it('la base caída es 503 sin caché, no un 404', async () => {
    connectDb.mockRejectedValue(new Error('down'))
    await expect(detail({ slug: 'xiaomi-6-pro' } as never)).rejects.toMatchObject({
      statusCode: 503,
    })
    expect(cache()).toBe('no-store')
  })

  it('un modelo que no se ve hace una semana es 404: pide lastSeen fresco', async () => {
    findOneLean.mockResolvedValue(null)
    await expect(detail({ slug: 'xiaomi-6-pro' } as never)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(findOneFilter[0]).toMatchObject({
      slug: 'xiaomi-6-pro',
      lastSeen: { $gte: expect.any(String) },
    })
  })

  it('devuelve el modelo y sus hermanos del mismo tipo, con caché pública', async () => {
    findOneLean.mockResolvedValue(model('xiaomi-6-pro'))
    findLean.mockResolvedValue([
      model('xiaomi-6', { newBand: { min: 25000, median: 25000, max: 25000, n: 1, sellers: 1 } }),
    ])
    const response = await detail({ slug: 'xiaomi-6-pro' } as never)
    expect(response.model.slug).toBe('xiaomi-6-pro')
    expect(response.siblings.map(s => s.slug)).toEqual(['xiaomi-6'])
    expect(response.siblings[0]).not.toHaveProperty('offers')
    expect(findFilter[0]).toMatchObject({ variant: 'urbano', slug: { $ne: 'xiaomi-6-pro' } })
    expect(cache()).toMatch(/public, max-age=900/)
  })
})

describe('GET /api/movilidad/modelos', () => {
  it('resume los modelos frescos, los de más vendedores primero', async () => {
    findLean.mockResolvedValue([
      model('a', { sellers: 2, listings: 3 }),
      model('b', { sellers: 5, listings: 6 }),
      model('c', { sellers: 2, listings: 9 }),
    ])
    const response = await list({} as never)
    expect(response.models.map(m => m.slug)).toEqual(['b', 'c', 'a'])
    expect(findFilter[0]).toMatchObject({ lastSeen: { $gte: expect.any(String) } })
    expect(response.generatedAt).toBe('2026-11-04T06:01:00Z')
    expect(cache()).toMatch(/public/)
  })

  it('sin modelos todavía responde lista vacía, no un error (el hub cae a la tabla vieja)', async () => {
    findLean.mockResolvedValue([])
    const response = await list({} as never)
    expect(response).toEqual({ generatedAt: null, models: [] })
  })

  it('la base caída es 503 sin caché', async () => {
    connectDb.mockRejectedValue(new Error('down'))
    await expect(list({} as never)).rejects.toMatchObject({ statusCode: 503 })
    expect(cache()).toBe('no-store')
  })
})
