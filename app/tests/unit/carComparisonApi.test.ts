import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const mocks = vi.hoisted(() => ({
  connectDb: vi.fn(),
  find: vi.fn(),
  lean: vi.fn(),
  select: vi.fn(),
  limit: vi.fn(),
  loadCarCatalogMeta: vi.fn(),
}))
vi.mock('../../server/utils/db', () => ({ connectDb: mocks.connectDb }))
vi.mock('../../server/models/CarCatalog', () => ({ CarCatalogModel: { find: mocks.find } }))
vi.mock('../../server/utils/cars', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/utils/cars')>()),
  loadCarCatalogMeta: mocks.loadCarCatalogMeta,
}))
const { getQuery } = installNitroGlobals()
const headers = vi.fn()
vi.stubGlobal('setResponseHeader', headers)
const handler = (await import('../../server/api/cars/compare-listings.get')).default

beforeEach(() => {
  vi.clearAllMocks()
  const chain = {
    select: mocks.select,
    limit: mocks.limit,
    maxTimeMS: () => chain,
    lean: mocks.lean,
  }
  mocks.find.mockReturnValue(chain)
  mocks.select.mockReturnValue(chain)
  mocks.limit.mockReturnValue(chain)
  mocks.connectDb.mockResolvedValue(undefined)
  mocks.lean.mockResolvedValue([])
  mocks.loadCarCatalogMeta.mockResolvedValue({ freshDays: 4 })
})

describe('bounded public car comparison API', () => {
  it('does not touch the database for invalid selections', async () => {
    getQuery.mockReturnValue({ autos: { $ne: null } })
    expect(await handler({} as never)).toEqual({ items: [], missing: [] })
    expect(mocks.connectDb).not.toHaveBeenCalled()
  })

  it('limits the query and projects only public fields, in the requested order', async () => {
    getQuery.mockReturnValue({ autos: 'carone-2,carone-1,carone-9,carone-8' })
    mocks.lean.mockResolvedValue([
      {
        key: 'carone-1',
        source: 'carone',
        title: 'Car one',
        lastSeen: new Date().toISOString(),
        sellerId: 'PRIVATE',
        description: 'PRIVATE',
        identity: { secret: true },
        phone: 'PRIVATE',
      },
      { key: 'carone-2', source: 'carone', title: 'Car two', lastSeen: new Date().toISOString() },
    ])
    const response = await handler({} as never)
    expect(mocks.find).toHaveBeenCalledWith({ key: { $in: ['carone-2', 'carone-1', 'carone-9'] } })
    expect(mocks.limit).toHaveBeenCalledWith(3)
    const projection = mocks.select.mock.calls[0]![0]
    expect(projection.specs).toBe(1)
    expect(projection.sellerId).toBeUndefined()
    expect(projection.identity).toBeUndefined()
    expect(response.items.map(entry => entry.car.key)).toEqual(['carone-2', 'carone-1'])
    expect(response.missing).toEqual(['carone-9'])
    expect(JSON.stringify(response)).not.toContain('PRIVATE')
    expect(JSON.stringify(response)).not.toContain('secret')
  })

  it('distinguishes an outage from an empty selection and prevents error caching', async () => {
    getQuery.mockReturnValue({ autos: 'carone-1' })
    mocks.connectDb.mockRejectedValueOnce(new Error('offline'))
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 503 })
    expect(headers).toHaveBeenCalledWith(expect.anything(), 'cache-control', 'no-store')
  })
})
