import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const find = vi.fn()
const create = vi.fn()
const findOneAndUpdate = vi.fn()
const deleteOne = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/Alert', () => ({
  AlertModel: { find, create, findOneAndUpdate, deleteOne },
}))

const { readBody, getRouterParam } = installNitroGlobals()

const listH = (await import('../../server/api/me/alerts/index.get')).default
const addH = (await import('../../server/api/me/alerts/index.post')).default
const patchH = (await import('../../server/api/me/alerts/[id].patch')).default
const delH = (await import('../../server/api/me/alerts/[id].delete')).default

beforeEach(() => {
  ;[requireUser, find, create, findOneAndUpdate, deleteOne, readBody, getRouterParam].forEach(m =>
    m.mockReset()
  )
  requireUser.mockResolvedValue({ uid: 'u1', email: 'a@b.com' })
})

describe('alerts API', () => {
  it('lists caller alerts newest first', async () => {
    find.mockReturnValueOnce({
      sort: () => ({ lean: () => ({ exec: () => Promise.resolve([{ target: 41 }]) }) }),
    })
    const res = await listH({} as any)
    expect(find).toHaveBeenCalledWith({ uid: 'u1' })
    expect(res).toEqual([{ target: 41 }])
  })

  it('rejects an invalid op on create', async () => {
    readBody.mockResolvedValueOnce({ currency: 'USD', kind: 'bestBuy', op: '!=', target: 41 })
    await expect(addH({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('creates a valid alert bound to uid', async () => {
    readBody.mockResolvedValueOnce({ currency: 'USD', kind: 'bestBuy', op: '>=', target: 41 })
    create.mockResolvedValueOnce({ _id: 'a1', uid: 'u1' })
    const res = await addH({} as any)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u1', currency: 'USD', kind: 'bestBuy', op: '>=', target: 41 })
    )
    expect(res).toMatchObject({ _id: 'a1' })
  })

  it('patch updates within uid scope and re-arms', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ active: false })
    findOneAndUpdate.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve({ _id: 'a1', active: false }) }),
    })
    const res = await patchH({} as any)
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'a1', uid: 'u1' },
      { $set: expect.objectContaining({ active: false, armed: true }) },
      { new: true }
    )
    expect(res).toMatchObject({ _id: 'a1' })
  })

  it('delete is uid-scoped', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    deleteOne.mockResolvedValueOnce({ deletedCount: 1 })
    const res = await delH({} as any)
    expect(deleteOne).toHaveBeenCalledWith({ _id: 'a1', uid: 'u1' })
    expect(res).toEqual({ ok: true })
  })
})
