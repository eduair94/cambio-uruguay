import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const connectDb = vi.fn()
const lean = vi.fn()
const collation = vi.fn()
const aggregate = vi.fn<(stages: unknown[]) => { collation: typeof collation }>(() => ({
  collation,
}))
const buildRentalPage = vi.fn()
const rentalPageEvidenceStages = vi.fn()
const rentalPageIdentityStages = vi.fn(() => [{ $match: { identity: true } }])
const rentalPageReprice = vi.fn(value => value)
const rentalPageMarket = vi.fn(() => ({ status: 'insufficient' }))
const rentalPageSimilarKeys = vi.fn(() => ['peer'])
const rentalPageSimilarStages = vi.fn(() => [{ $match: { similar: true } }])
vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/RentalMeta', () => ({
  RentalMetaModel: { findOne: () => ({ select: () => ({ lean }) }) },
}))
vi.mock('../../server/models/RentalListing', () => ({ RentalListingModel: { aggregate } }))
vi.mock('../../server/utils/rentalPage', () => ({
  buildRentalPage,
  rentalPageEvidenceStages,
  rentalPageIdentityStages,
  rentalPageReprice,
  rentalPageMarket,
  rentalPageSimilarKeys,
  rentalPageSimilarStages,
  RENTAL_PAGE_STALE_DAYS: 10,
}))
const { getRouterParam, getQuery } = installNitroGlobals()
const setResponseHeader = vi.fn()
vi.stubGlobal('setResponseHeader', setResponseHeader)
const handler = (await import('../../server/api/rentals/ficha/[key].get')).default

describe('canonical rental page API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connectDb.mockReset().mockResolvedValue(undefined)
    lean.mockReset().mockResolvedValue({ usdUyu: 40 })
    collation
      .mockReset()
      .mockResolvedValueOnce([{ key: 'canonical-key' }])
      .mockResolvedValueOnce([{ key: 'peer' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ key: 'full-peer' }])
    getRouterParam.mockReturnValue('canonical-key')
    getQuery.mockReturnValue({ monthlyMax: '1', source: 'facebook' })
    rentalPageEvidenceStages.mockReturnValue([{ $match: { peer: true } }])
    buildRentalPage.mockReturnValue({ canonicalPath: '/alquileres/canonical-key' })
  })
  it('ignores user query parameters so canonical content does not change by entrance path', async () => {
    expect(await handler({} as any)).toEqual({ canonicalPath: '/alquileres/canonical-key' })
    expect(getQuery).not.toHaveBeenCalled()
    expect(buildRentalPage).toHaveBeenCalledWith(
      { key: 'canonical-key' },
      [{ key: 'full-peer' }],
      40,
      false,
      { status: 'insufficient' }
    )
    expect(aggregate.mock.calls[0]![0]).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ $match: { source: 'facebook' } })])
    )
  })
  it('preserves an honest 404 for an absent/expired property instead of returning a thin 200', async () => {
    collation.mockReset().mockResolvedValue([])
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 })
    expect(buildRentalPage).not.toHaveBeenCalled()
    expect(aggregate).toHaveBeenCalledTimes(1)
  })
  it('returns 503 on dependency failure, including peer data, instead of false absence or zero benchmark', async () => {
    collation
      .mockReset()
      .mockResolvedValueOnce([{ key: 'canonical-key' }])
      .mockRejectedValueOnce(new Error('DB unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 503 })
    } finally {
      log.mockRestore()
    }
  })
  it('rejects invalid keys before opening a connection', async () => {
    getRouterParam.mockReturnValue(' '.repeat(3))
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 })
    expect(connectDb).not.toHaveBeenCalled()
  })
})
