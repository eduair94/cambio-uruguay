import { beforeEach, describe, expect, it, vi } from 'vitest'

const close = vi.fn()
const disconnect = vi.fn()
const aggregate = vi.fn()
const sourceUrls = vi.fn()
const streamRows = [{ key: 'one' }, { key: 'two' }, { key: 'one' }]
let failAfterFirst = false

vi.mock('../../server/utils/db', () => ({
  connectDb: vi.fn(),
  disconnectDbAfterPrerender: () => disconnect(),
}))
vi.mock('../../server/models/RentalListing', () => ({
  RentalListingModel: { aggregate: (...args: unknown[]) => aggregate(...args) },
}))
vi.mock('../../server/models/RentalMeta', () => ({
  RentalMetaModel: {
    findOne: () => ({ select: () => ({ lean: async () => ({ usdUyu: 41 }) }) }),
  },
}))
vi.mock('../../server/utils/rentalPage', () => ({
  rentalPageAmbiguousKeysStages: () => ['ambiguous'],
  rentalPageSitemapStages: () => ['dossiers'],
  rentalPageSitemapUrls: (...args: unknown[]) => sourceUrls(...args),
}))

const { loadRentalSitemapUrls } = await import('../../server/utils/rentalSitemap')

beforeEach(() => {
  vi.clearAllMocks()
  failAfterFirst = false
  sourceUrls.mockImplementation(([row]) => [{ loc: `/alquileres/${row.key}`, images: [] }])
  aggregate.mockImplementation(([kind]) => {
    const query = {
      collation: vi.fn(() => query),
      option: vi.fn(() =>
        kind === 'ambiguous' ? Promise.resolve([{ key: 'ambiguous-key' }]) : query
      ),
      cursor: vi.fn(() => ({
        close,
        async *[Symbol.asyncIterator]() {
          yield streamRows[0]
          if (failAfterFirst) throw new Error('interrupted cursor')
          yield* streamRows.slice(1)
        },
      })),
    }
    return query
  })
})

describe('rental sitemap catalogue stream', () => {
  it('deduplicates canonical URLs and applies the same rate/identity gate to every row', async () => {
    expect(await loadRentalSitemapUrls()).toEqual([
      { loc: '/alquileres/one', images: [] },
      { loc: '/alquileres/two', images: [] },
    ])
    expect(sourceUrls).toHaveBeenCalledTimes(3)
    expect(sourceUrls).toHaveBeenCalledWith([streamRows[0]], 41, new Set(['ambiguous-key']))
    expect(close).toHaveBeenCalledOnce()
    expect(disconnect).toHaveBeenCalledOnce()
  })
  it('closes a failed cursor and rejects rather than caching a partial sitemap', async () => {
    failAfterFirst = true
    await expect(loadRentalSitemapUrls()).rejects.toThrow('interrupted cursor')
    expect(close).toHaveBeenCalledOnce()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
