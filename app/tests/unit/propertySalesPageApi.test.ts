import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const connectDb = vi.fn()
const loadPropertySalesMeta = vi.fn()
const advertLean = vi.fn()
const similarLean = vi.fn()
const similarMaxTime = vi.fn()
const advertQuery = { select: () => advertQuery, maxTimeMS: () => advertQuery, lean: advertLean }
const similarQuery = {
  select: () => similarQuery,
  sort: () => similarQuery,
  limit: () => similarQuery,
  collation: () => similarQuery,
  maxTimeMS: (ms: number) => {
    similarMaxTime(ms)
    return similarQuery
  },
  lean: similarLean,
}
vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/utils/propertySales', () => ({ loadPropertySalesMeta }))
vi.mock('../../server/models/PropertySaleCatalog', () => ({
  PropertySaleCatalogModel: { findOne: () => advertQuery, find: () => similarQuery },
}))
vi.mock('../../server/utils/propertySalesPublic', () => ({
  propertySaleDetailProjection: {},
  propertySaleSummaryProjection: {},
  publicPropertySaleListing: (row: Record<string, unknown>) => ({ ...row }),
  publicPropertySaleSummary: (row: Record<string, unknown>) => ({ ...row }),
}))
vi.mock('../../utils/propertySales', async importOriginal => ({
  ...(await importOriginal<typeof import('../../utils/propertySales')>()),
  propertySaleIndexable: () => true,
}))
const { getRouterParam } = installNitroGlobals()
const setResponseHeader = vi.fn()
vi.stubGlobal('setResponseHeader', setResponseHeader)
const handler = (await import('../../server/api/property-sales/ficha/[key].get')).default

const advert = {
  key: 'casasweb-224054',
  department: 'Montevideo',
  locality: 'Montevideo',
  neighborhood: 'Cordón',
  propertyType: 'apartamento',
  bedrooms: 3,
}
const timeLimit = () =>
  Object.assign(new Error('operation exceeded time limit'), { name: 'MongoServerError', code: 50 })

describe('property sale advert API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connectDb.mockReset().mockResolvedValue(undefined)
    loadPropertySalesMeta.mockReset().mockResolvedValue({ usdUyu: 40 })
    advertLean.mockReset().mockResolvedValue(advert)
    similarLean.mockReset().mockResolvedValue([{ key: 'infocasas-1' }])
    getRouterParam.mockReturnValue(advert.key)
  })
  it('serves the advert with its similar adverts', async () => {
    const page = await handler({} as any)
    expect(page).toMatchObject({
      property: { key: advert.key },
      usdUyu: 40,
      similar: [{ key: 'infocasas-1' }],
    })
  })
  it('still serves the advert when the optional similar adverts time out (Sentry 271fde96)', async () => {
    similarLean.mockReset().mockRejectedValue(timeLimit())
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const page = await handler({} as any)
      // The page hides the section when the list is empty: nothing claims there are none.
      expect(page).toMatchObject({ property: { key: advert.key }, similar: [] })
      expect(log).toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  })
  it('gives the similar adverts a budget well under the advert read', async () => {
    await handler({} as any)
    expect(similarMaxTime).toHaveBeenCalledTimes(1)
    expect(similarMaxTime.mock.calls[0]![0]).toBeLessThanOrEqual(3000)
  })
  it('still answers 503 when the advert itself cannot be read', async () => {
    advertLean.mockReset().mockRejectedValue(timeLimit())
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 503 })
    } finally {
      log.mockRestore()
    }
  })
  it('keeps an honest 404 for an absent advert', async () => {
    advertLean.mockReset().mockResolvedValue(null)
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 })
  })
})
