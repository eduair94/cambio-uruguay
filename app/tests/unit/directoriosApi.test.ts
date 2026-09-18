import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { CARD_PROGRAMS, CARD_REWARDS_LAST_REVIEWED } from '../../utils/cardRewards'
import { CASAS_LAST_RESEARCHED, CASAS_REPUTATION } from '../../utils/casasDirectory'
import { COURIERS, COURIER_RATES_VERIFIED_AT } from '../../utils/courierShipping'

// Mismo patrón que `movilidadApi.test.ts`: los globals de Nitro stubbeados y cada modelo mockeado,
// sin Mongo ni runtime de Nuxt. Cada meta es un documento que un test puede cambiar o romper.
const m = vi.hoisted(() => {
  const docs: Record<string, unknown> = {}
  const broken = new Set<string>()
  const read = (name: string) => async () => {
    if (broken.has(name)) throw new Error(`${name} caído`)
    return docs[name] ?? null
  }
  const chain = (name: string) => ({ select: () => ({ lean: read(name) }) })
  return {
    docs,
    broken,
    connectDb: vi.fn(),
    fetchMock: vi.fn(),
    headers: [] as Array<[string, string]>,
    RentalMetaModel: { findOne: () => chain('rentals') },
    PropertySaleCatalogMetaModel: { findOne: () => chain('sales') },
    CarCatalogMetaModel: { findOne: () => chain('cars') },
    MovilidadMetaModel: { findOne: () => chain('movilidad') },
    PhoneMetaModel: { findOne: () => chain('phoneMeta') },
    PhoneModelModel: { find: () => chain('phoneRows') },
    ChairCatalogMetaModel: { findOne: () => chain('chairs') },
    EquiparMetaModel: { findOne: () => chain('equipar') },
    StoreProfileModel: {
      countDocuments: async () => {
        if (broken.has('stores')) throw new Error('stores caído')
        return docs.storesCount ?? 0
      },
      findOne: () => ({ sort: () => chain('storesLatest') }),
    },
  }
})

vi.mock('../../server/utils/db', () => ({ connectDb: m.connectDb }))
vi.mock('../../server/models/RentalMeta', () => ({ RentalMetaModel: m.RentalMetaModel }))
vi.mock('../../server/models/PropertySaleCatalog', () => ({
  PropertySaleCatalogModel: {},
  PropertySaleCatalogMetaModel: m.PropertySaleCatalogMetaModel,
}))
vi.mock('../../server/models/CarCatalogMeta', () => ({
  CarCatalogMetaModel: m.CarCatalogMetaModel,
}))
vi.mock('../../server/models/MovilidadMeta', () => ({ MovilidadMetaModel: m.MovilidadMetaModel }))
vi.mock('../../server/models/PhoneMeta', () => ({ PhoneMetaModel: m.PhoneMetaModel }))
vi.mock('../../server/models/PhoneModel', () => ({ PhoneModelModel: m.PhoneModelModel }))
vi.mock('../../server/models/ChairCatalogMeta', () => ({
  ChairCatalogMetaModel: m.ChairCatalogMetaModel,
}))
vi.mock('../../server/models/EquiparMeta', () => ({ EquiparMetaModel: m.EquiparMetaModel }))
vi.mock('../../server/models/StoreProfile', () => ({ StoreProfileModel: m.StoreProfileModel }))
// La regla de "publicable" de celulares tiene su propio test; acá sólo importa que la ruta la use
// en vez de contar todos los modelos que sigue el job.
vi.mock('../../utils/phones', async importOriginal => ({
  ...(await importOriginal<typeof import('../../utils/phones')>()),
  phonePublishable: (model: { publishable?: boolean }) => model.publishable === true,
}))

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) =>
  m.headers.push([name, value])
)
vi.stubGlobal('$fetch', m.fetchMock)

const handler = (await import('../../server/api/directorios.get')).default as (
  event: unknown
) => Promise<{ cifras: Record<string, { count: number | null; asOf: string | null }> }>

function seedAll() {
  m.docs.rentals = { properties: 9120, generatedAt: '2026-09-18T04:52:00.000Z' }
  m.docs.sales = { total: 4310, generatedAt: '2026-09-18T06:21:00.000Z' }
  m.docs.cars = { meta: { listings: 12480 }, generatedAt: '2026-09-18T07:43:00.000Z' }
  m.docs.movilidad = { items: 57, generatedAt: '2026-09-18T15:33:00.000Z' }
  m.docs.phoneMeta = { generatedAt: '2026-09-18T14:29:00.000Z' }
  m.docs.phoneRows = [
    { publishable: true },
    { publishable: false },
    { publishable: true },
    { publishable: false },
  ]
  m.docs.chairs = { products: 212, asOf: '2026-09-18' }
  m.docs.equipar = { items: 1880, generatedAt: '2026-09-18T12:47:00.000Z' }
  m.docs.storesCount = 80
  m.docs.storesLatest = { updatedAt: new Date('2026-09-14T07:17:00.000Z') }
  m.fetchMock.mockResolvedValue({ day: '2026-09-18', count: 215 })
}

/** La última cabecera cache-control que dejó la ruta. */
function cacheControl(): string | undefined {
  return [...m.headers].reverse().find(([name]) => name === 'cache-control')?.[1]
}

beforeEach(() => {
  for (const key of Object.keys(m.docs)) Reflect.deleteProperty(m.docs, key)
  m.broken.clear()
  m.connectDb.mockReset()
  m.fetchMock.mockReset()
  m.headers.length = 0
})

afterAll(() => vi.unstubAllGlobals())

describe('GET /api/directorios', () => {
  it('lee cada meta con su propio campo y su propia fecha', async () => {
    seedAll()
    const { cifras } = await handler({})
    expect(cifras.alquileres).toEqual({ count: 9120, asOf: '2026-09-18' })
    expect(cifras.ventas).toEqual({ count: 4310, asOf: '2026-09-18' })
    expect(cifras.autos).toEqual({ count: 12480, asOf: '2026-09-18' })
    expect(cifras.movilidad).toEqual({ count: 57, asOf: '2026-09-18' })
    expect(cifras.sillas).toEqual({ count: 212, asOf: '2026-09-18' })
    expect(cifras.equipar).toEqual({ count: 1880, asOf: '2026-09-18' })
    expect(cifras.tiendas).toEqual({ count: 80, asOf: '2026-09-14' })
    expect(cifras.precios).toEqual({ count: 215, asOf: '2026-09-18' })
    expect(cacheControl()).toMatch(/^public/)
  })

  it('celulares cuenta sólo los modelos publicables, no todos los que sigue el job', async () => {
    seedAll()
    const { cifras } = await handler({})
    expect(cifras.celulares).toEqual({ count: 2, asOf: '2026-09-18' })
  })

  it('los curados son el largo de la misma lista que dibuja su página, con su fecha de revisión', async () => {
    seedAll()
    const { cifras } = await handler({})
    expect(cifras.casas).toEqual({ count: CASAS_REPUTATION.length, asOf: CASAS_LAST_RESEARCHED })
    expect(cifras.couriers).toEqual({ count: COURIERS.length, asOf: COURIER_RATES_VERIFIED_AT })
    expect(cifras.tarjetas).toEqual({
      count: CARD_PROGRAMS.length,
      asOf: CARD_REWARDS_LAST_REVIEWED,
    })
  })

  it('no pide cifra para un directorio que declara no tenerla', async () => {
    seedAll()
    const { cifras } = await handler({})
    expect(cifras).not.toHaveProperty('inmobiliarias')
  })

  it('una meta caída deja sólo esa tarjeta sin cifra, y la respuesta se sigue cacheando', async () => {
    seedAll()
    m.broken.add('cars')
    const { cifras } = await handler({})
    expect(cifras).not.toHaveProperty('autos')
    expect(cifras.alquileres?.count).toBe(9120)
    expect(cacheControl()).toMatch(/^public/)
  })

  it('una meta que todavía no existe no inventa una cifra', async () => {
    seedAll()
    delete m.docs.movilidad
    const { cifras } = await handler({})
    expect(cifras).not.toHaveProperty('movilidad')
  })

  it('una fecha que no parece fecha se publica como ausente, no como texto', async () => {
    seedAll()
    m.docs.sales = { total: 4310, generatedAt: 'ayer' }
    const { cifras } = await handler({})
    expect(cifras.ventas).toEqual({ count: 4310, asOf: null })
  })

  it('con Mongo caído igual devuelve los curados y precios, que no dependen de la base', async () => {
    seedAll()
    m.connectDb.mockRejectedValue(new Error('sin conexión'))
    const { cifras } = await handler({})
    expect(Object.keys(cifras).sort()).toEqual(['casas', 'couriers', 'precios', 'tarjetas'])
    expect(cacheControl()).toMatch(/^public/)
  })

  it('si no se pudo leer NINGUNA cifra relevada, la respuesta no se cachea', async () => {
    seedAll()
    m.connectDb.mockRejectedValue(new Error('sin conexión'))
    m.fetchMock.mockRejectedValue(new Error('backend caído'))
    const { cifras } = await handler({})
    expect(Object.keys(cifras).sort()).toEqual(['casas', 'couriers', 'tarjetas'])
    expect(cacheControl()).toBe('no-store')
  })

  it('precios sin catálogo no publica un cero', async () => {
    seedAll()
    m.fetchMock.mockResolvedValue({ day: null, count: 0 })
    const { cifras } = await handler({})
    expect(cifras).not.toHaveProperty('precios')
  })
})
