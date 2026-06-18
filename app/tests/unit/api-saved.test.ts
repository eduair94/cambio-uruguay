import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const find = vi.fn()
const create = vi.fn()
const deleteOne = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/SavedItem', () => ({ SavedItemModel: { find, create, deleteOne } }))

const { readBody, getRouterParam } = installNitroGlobals()

const listHandler = (await import('../../server/api/me/saved/index.get')).default
const addHandler = (await import('../../server/api/me/saved/index.post')).default
const delHandler = (await import('../../server/api/me/saved/[id].delete')).default

beforeEach(() => {
  ;[requireUser, find, create, deleteOne, readBody, getRouterParam].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('saved API', () => {
  it('lists caller items newest first', async () => {
    const exec = () => Promise.resolve([{ title: 'x' }])
    find.mockReturnValueOnce({ sort: () => ({ lean: () => ({ exec }) }) })
    const res = await listHandler({} as any)
    expect(find).toHaveBeenCalledWith({ uid: 'u1' })
    expect(res).toEqual([{ title: 'x' }])
  })

  it('rejects add without required fields', async () => {
    readBody.mockResolvedValueOnce({ kind: 'conversion' })
    await expect(addHandler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('creates a saved item bound to the caller uid', async () => {
    readBody.mockResolvedValueOnce({
      kind: 'conversion',
      toolSlug: 'conversor-de-monedas',
      title: '100 USD',
      inputs: {},
      result: {},
      snapshot: { capturedAt: new Date().toISOString(), rates: [] },
    })
    create.mockResolvedValueOnce({ _id: 's1', title: '100 USD' })
    const res = await addHandler({} as any)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1', title: '100 USD' }))
    expect(res).toMatchObject({ _id: 's1' })
  })

  it('delete is uid-scoped', async () => {
    getRouterParam.mockReturnValueOnce('s1')
    deleteOne.mockResolvedValueOnce({ deletedCount: 1 })
    const res = await delHandler({} as any)
    expect(deleteOne).toHaveBeenCalledWith({ _id: 's1', uid: 'u1' })
    expect(res).toEqual({ ok: true })
  })
})
