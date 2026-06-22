import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const findOne = vi.fn()
const findOneAndUpdate = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/ImportCart', () => ({
  ImportCartModel: { findOne, findOneAndUpdate },
}))

const { readBody } = installNitroGlobals()

const getHandler = (await import('../../server/api/me/cart/index.get')).default
const putHandler = (await import('../../server/api/me/cart/index.put')).default

const chain = (value: unknown) => ({ lean: () => ({ exec: () => Promise.resolve(value) }) })

beforeEach(() => {
  ;[requireUser, findOne, findOneAndUpdate, readBody].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('import-cart API', () => {
  it('returns the caller cart scoped by uid', async () => {
    findOne.mockReturnValueOnce(chain({ uid: 'u1', items: [{ id: 'a' }], settings: {} }))
    const res = await getHandler({} as any)
    expect(findOne).toHaveBeenCalledWith({ uid: 'u1' })
    expect(res).toMatchObject({ uid: 'u1', items: [{ id: 'a' }] })
  })

  it('returns an empty cart when none is stored', async () => {
    findOne.mockReturnValueOnce(chain(null))
    const res = await getHandler({} as any)
    expect(res).toEqual({ uid: 'u1', items: [], settings: {} })
  })

  it('upserts the cart bound to the caller uid with sanitized items', async () => {
    readBody.mockResolvedValueOnce({
      items: [
        { id: 'a', name: 'Echo', priceUsd: 49.99, qty: 1, categoryId: 'electronica' },
        { id: 'b' }, // invalid: no name/price -> dropped
        'garbage', // invalid -> dropped
      ],
      settings: { regime: 'courier', useFranchise: true },
    })
    findOneAndUpdate.mockReturnValueOnce(chain({ uid: 'u1', items: [{ id: 'a' }] }))
    const res = await putHandler({} as any)
    const [filter, update] = findOneAndUpdate.mock.calls[0]!
    expect(filter).toEqual({ uid: 'u1' })
    expect(update.uid).toBe('u1')
    expect(update.items).toHaveLength(1)
    expect(update.items[0]).toMatchObject({ id: 'a', name: 'Echo', priceUsd: 49.99 })
    expect(update.settings).toMatchObject({ regime: 'courier' })
    expect(res).toMatchObject({ uid: 'u1' })
  })

  it('coerces a non-array items payload to an empty list', async () => {
    readBody.mockResolvedValueOnce({ items: 'nope', settings: null })
    findOneAndUpdate.mockReturnValueOnce(chain({ uid: 'u1', items: [] }))
    await putHandler({} as any)
    const [, update] = findOneAndUpdate.mock.calls[0]!
    expect(update.items).toEqual([])
    expect(update.settings).toEqual({})
  })
})
