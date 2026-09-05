import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'
import { RENTAL_COLLATION } from '../../utils/rentals'

const connectDb = vi.fn()
const lean = vi.fn()
const select = vi.fn(() => ({ lean }))
const findOne = vi.fn(() => ({ select }))
const collation = vi.fn()
const aggregate = vi.fn<(stages: unknown[]) => { collation: typeof collation }>(() => ({
  collation,
}))
vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/RentalMeta', () => ({ RentalMetaModel: { findOne } }))
vi.mock('../../server/models/RentalListing', () => ({ RentalListingModel: { aggregate } }))

const { getQuery, getRouterParam } = installNitroGlobals()
const setResponseHeader = vi.fn()
vi.stubGlobal('setResponseHeader', setResponseHeader)
const handler = (await import('../../server/api/rentals/propiedad/[key].get')).default

describe('a requested rental property detail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connectDb.mockReset().mockResolvedValue(undefined)
    lean.mockReset().mockResolvedValue({ usdUyu: 40 })
    collation.mockReset().mockResolvedValue([{ key: 'requested', title: 'Visible property' }])
    getRouterParam.mockReturnValue('requested')
    getQuery.mockReturnValue({})
  })

  it('returns one public property and the conversion used to evaluate its current filters', async () => {
    getQuery.mockReturnValue({
      key: 'another-property',
      neighborhoods: 'CORDON,Pocitos',
      monthlyMax: '25000',
      source: 'infocasas',
      page: '999',
    })
    const result = await handler({} as any)
    expect(result).toEqual({
      property: { key: 'requested', title: 'Visible property' },
      usdUyu: 40,
    })
    const stages = aggregate.mock.calls[0][0] as Array<Record<string, any>>
    expect(stages[0].$match).toMatchObject({
      key: 'requested',
      neighborhood: { $in: ['CORDON', 'Pocitos'] },
    })
    expect(stages.find(stage => stage.$match?.offers)?.$match.offers).toMatchObject({
      $elemMatch: { source: 'infocasas', commonExpenses: { $type: 'number', $gte: 0 } },
    })
    expect(stages.some(stage => '$skip' in stage)).toBe(false)
    expect(stages).toContainEqual({ $limit: 1 })
    expect(collation).toHaveBeenCalledWith(RENTAL_COLLATION)
    expect(setResponseHeader).toHaveBeenLastCalledWith(
      expect.anything(),
      'cache-control',
      'public, max-age=30, s-maxage=60'
    )
  })

  it('preserves unavailable conversion as zero rather than inventing a rate', async () => {
    lean.mockResolvedValue(null)
    expect((await handler({} as any)).usdUyu).toBe(0)
  })

  it('returns an uncached 404 when the property is absent or no longer matches the filter', async () => {
    collation.mockResolvedValue([])
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 })
    expect(setResponseHeader).toHaveBeenLastCalledWith(
      expect.anything(),
      'cache-control',
      'no-store'
    )
  })

  it.each([undefined, '', '   ', 'x'.repeat(513)])(
    'rejects an invalid key without querying the DB',
    async key => {
      getRouterParam.mockReturnValue(key)
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 })
      expect(connectDb).not.toHaveBeenCalled()
      expect(aggregate).not.toHaveBeenCalled()
    }
  )

  it('distinguishes a backend failure from a missing property', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    collation.mockRejectedValue(new Error('Mongo unavailable'))
    try {
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 503 })
      expect(setResponseHeader).toHaveBeenLastCalledWith(
        expect.anything(),
        'cache-control',
        'no-store'
      )
      expect(log).toHaveBeenCalledTimes(1)
    } finally {
      log.mockRestore()
    }
  })
})
