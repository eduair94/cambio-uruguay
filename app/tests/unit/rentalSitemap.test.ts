import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rentalIndexAllowlistFrom, type RentalIndexAllowlist } from '../../utils/rentalIndexHygiene'

const close = vi.fn()
const disconnect = vi.fn()
const aggregate = vi.fn()
const sourceUrls = vi.fn()
// Vistas hace 90 días: viejas para la higiene del índice, que sólo actúa cuando hay lista.
const streamRows = [
  { key: 'one', firstSeen: '2026-06-01' },
  { key: 'two', firstSeen: '2026-06-01' },
  { key: 'one', firstSeen: '2026-06-01' },
]
let failAfterFirst = false
let allowlist: RentalIndexAllowlist | null = null

vi.mock('../../server/utils/rentalIndexAllowlist', () => ({
  loadRentalIndexAllowlist: () => Promise.resolve(allowlist),
}))

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
  allowlist = null
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
  it('drops an old dossier the Search Console allowlist does not name, before building it', async () => {
    allowlist = rentalIndexAllowlistFrom({
      family: 'alquileres',
      asOf: new Date().toISOString().slice(0, 10),
      windowDays: 56,
      minImpressions: 5,
      urls: ['/alquileres/one'],
      rowCount: 1,
      complete: true,
    })
    expect(await loadRentalSitemapUrls()).toEqual([{ loc: '/alquileres/one', images: [] }])
    // "two" nunca llegó a armarse: la regla corre antes del dossier.
    expect(sourceUrls).toHaveBeenCalledTimes(2)
    expect(sourceUrls).not.toHaveBeenCalledWith([streamRows[1]], 41, expect.anything())
  })
  it('closes a failed cursor and rejects rather than caching a partial sitemap', async () => {
    failAfterFirst = true
    await expect(loadRentalSitemapUrls()).rejects.toThrow('interrupted cursor')
    expect(close).toHaveBeenCalledOnce()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
