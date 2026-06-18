import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const find = vi.fn()
const updateOne = vi.fn()
const findOne = vi.fn()
const deleteOne = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/Favorite', () => ({
  FavoriteModel: { find, updateOne, findOne, deleteOne },
}))

const { readBody, getRouterParam, getQuery } = installNitroGlobals()

const listHandler = (await import('../../server/api/me/favorites/index.get')).default
const addHandler = (await import('../../server/api/me/favorites/index.post')).default
const delHandler = (await import('../../server/api/me/favorites/[key].delete')).default

beforeEach(() => {
  ;[requireUser, find, updateOne, findOne, deleteOne, readBody, getRouterParam, getQuery].forEach(
    m => m.mockReset()
  )
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('favorites API', () => {
  it('lists only the caller’s favorites', async () => {
    find.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve([{ key: 'brou' }]) }) })
    const res = await listHandler({} as any)
    expect(find).toHaveBeenCalledWith({ uid: 'u1' })
    expect(res).toEqual([{ key: 'brou' }])
  })

  it('add is idempotent (upsert by uid+type+key)', async () => {
    readBody.mockResolvedValueOnce({ type: 'casa', key: 'brou', label: 'BROU' })
    updateOne.mockResolvedValueOnce({})
    findOne.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve({ key: 'brou' }) }) })
    const res = await addHandler({} as any)
    expect(updateOne).toHaveBeenCalledWith(
      { uid: 'u1', type: 'casa', key: 'brou' },
      { $set: { label: 'BROU' } },
      { upsert: true }
    )
    expect(res).toEqual({ key: 'brou' })
  })

  it('rejects add with an invalid type', async () => {
    readBody.mockResolvedValueOnce({ type: 'bogus', key: 'x' })
    await expect(addHandler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('delete removes only within the caller’s scope', async () => {
    getRouterParam.mockReturnValueOnce('brou')
    getQuery.mockReturnValueOnce({ type: 'casa' })
    deleteOne.mockResolvedValueOnce({ deletedCount: 1 })
    const res = await delHandler({} as any)
    expect(deleteOne).toHaveBeenCalledWith({ uid: 'u1', type: 'casa', key: 'brou' })
    expect(res).toEqual({ ok: true })
  })
})
