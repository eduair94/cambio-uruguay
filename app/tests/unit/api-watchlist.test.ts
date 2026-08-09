import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'
import { DEFAULT_WATCHLIST, MAX_ORIGINS } from '../../utils/watchlist'

const requireUser = vi.fn()
const findOne = vi.fn()
const findOneAndUpdate = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/Watchlist', () => ({
  WatchlistModel: { findOne, findOneAndUpdate },
}))

const { readBody } = installNitroGlobals()

const getHandler = (await import('../../server/api/me/watchlist/index.get')).default
const putHandler = (await import('../../server/api/me/watchlist/index.put')).default

const chain = (value: unknown) => ({ lean: () => ({ exec: () => Promise.resolve(value) }) })

beforeEach(() => {
  ;[requireUser, findOne, findOneAndUpdate, readBody].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('watchlist API', () => {
  it('returns the caller list scoped by uid', async () => {
    findOne.mockReturnValueOnce(chain({ uid: 'u1', origins: ['gales'], cards: ['prex'] }))
    const res = await getHandler({} as any)
    expect(findOne).toHaveBeenCalledWith({ uid: 'u1' })
    expect(res).toMatchObject({ origins: ['gales'], cards: ['prex'] })
  })

  it('returns an empty list when the account has none stored', async () => {
    findOne.mockReturnValueOnce(chain(null))
    const res = await getHandler({} as any)
    expect(res).toMatchObject({ ...DEFAULT_WATCHLIST, uid: 'u1' })
  })

  it('upserts the list bound to the caller uid, sanitized', async () => {
    readBody.mockResolvedValueOnce({
      zone: { mode: 'department', department: 'SALTO' },
      origins: ['gales', 'gales', 42],
      cards: ['prex'],
      currencies: ['usd'],
      direction: 'buy',
      amountUsd: 49.99,
    })
    findOneAndUpdate.mockReturnValueOnce(chain({ uid: 'u1' }))
    await putHandler({} as any)
    const [filter, update] = findOneAndUpdate.mock.calls[0]!
    expect(filter).toEqual({ uid: 'u1' })
    expect(update.uid).toBe('u1')
    expect(update.origins).toEqual(['gales'])
    expect(update.currencies).toEqual(['USD'])
    expect(update.zone).toMatchObject({ mode: 'department', department: 'SALTO' })
    expect(update.amountUsd).toBe(49.99)
  })

  it('caps a hostile payload instead of storing it whole', async () => {
    readBody.mockResolvedValueOnce({
      origins: Array.from({ length: 500 }, (_, i) => `o${i}`),
      zone: { mode: 'point', lat: -34.9, lng: -56.1, radiusKm: 99999 },
    })
    findOneAndUpdate.mockReturnValueOnce(chain({ uid: 'u1' }))
    await putHandler({} as any)
    const [, update] = findOneAndUpdate.mock.calls[0]!
    expect(update.origins).toHaveLength(MAX_ORIGINS)
    expect(update.zone.radiusKm).toBeLessThanOrEqual(200)
  })

  it('falls back to the defaults for a junk body', async () => {
    readBody.mockResolvedValueOnce('not an object')
    findOneAndUpdate.mockReturnValueOnce(chain({ uid: 'u1' }))
    await putHandler({} as any)
    const [, update] = findOneAndUpdate.mock.calls[0]!
    expect(update).toMatchObject({ uid: 'u1', ...DEFAULT_WATCHLIST })
  })
})
