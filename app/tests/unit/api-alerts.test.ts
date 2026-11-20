import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const find = vi.fn()
const create = vi.fn()
const findOneAndUpdate = vi.fn()
const deleteOne = vi.fn()
const exists = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/Alert', () => ({
  AlertModel: { find, create, findOneAndUpdate, deleteOne, exists },
}))

const { readBody, getRouterParam } = installNitroGlobals()

const listH = (await import('../../server/api/me/alerts/index.get')).default
const addH = (await import('../../server/api/me/alerts/index.post')).default
const patchH = (await import('../../server/api/me/alerts/[id].patch')).default
const delH = (await import('../../server/api/me/alerts/[id].delete')).default

beforeEach(() => {
  ;[
    requireUser,
    find,
    create,
    findOneAndUpdate,
    deleteOne,
    exists,
    readBody,
    getRouterParam,
  ].forEach(m => m.mockReset())
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
      { returnDocument: 'after' }
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

describe('alerts API: canal Telegram', () => {
  it('crear una alerta desde la web guarda el canal Telegram', async () => {
    readBody.mockResolvedValueOnce({
      currency: 'USD',
      kind: 'bestBuy',
      op: '>=',
      target: 41,
      channels: { push: false, email: true, telegram: true },
    })
    create.mockResolvedValueOnce({ _id: 'a1' })
    await addH({} as any)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ channels: { push: false, email: true, telegram: true } })
    )
  })

  it('editarla también', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ channels: { push: true, email: true, telegram: true } })
    findOneAndUpdate.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve({}) }) })
    await patchH({} as any)
    expect(findOneAndUpdate.mock.calls[0][1].$set['channels.telegram']).toBe(true)
  })
})

// The email unsubscribe link (one click from the inbox) can leave an alert with no channel, and an
// active alert with none fires into nothing: switching one on, or creating one, needs a channel —
// the rule the rental alerts already follow (rentalAlertSubscriptions.ts).
describe('alerts API: an alert needs a channel to be on', () => {
  const query = (value: unknown) => ({ lean: () => ({ exec: () => Promise.resolve(value) }) })

  it('switching on asks Mongo for a channel in the same update', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ active: true })
    findOneAndUpdate.mockReturnValueOnce(query({ _id: 'a1', active: true }))
    expect(await patchH({} as any)).toMatchObject({ _id: 'a1' })
    expect(findOneAndUpdate.mock.calls[0][0]).toEqual({
      _id: 'a1',
      uid: 'u1',
      $or: [{ 'channels.push': true }, { 'channels.email': true }, { 'channels.telegram': true }],
    })
  })

  it('refuses to switch on an alert left without a channel', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ active: true })
    findOneAndUpdate.mockReturnValueOnce(query(null))
    exists.mockResolvedValueOnce({ _id: 'a1' })
    await expect(patchH({} as any)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'no-channel',
    })
  })

  it("still answers null for an alert that is not the caller's", async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ active: true })
    findOneAndUpdate.mockReturnValueOnce(query(null))
    exists.mockResolvedValueOnce(null)
    expect(await patchH({} as any)).toBeNull()
  })

  it('refuses switching on while turning every channel off, without writing', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ active: true, channels: { push: false, email: false } })
    await expect(patchH({} as any)).rejects.toMatchObject({ statusCode: 409 })
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('switches on with the channel the same request turns back on', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ active: true, channels: { push: false, email: true } })
    findOneAndUpdate.mockReturnValueOnce(query({ _id: 'a1' }))
    await patchH({} as any)
    expect(findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: 'a1', uid: 'u1' })
    expect(findOneAndUpdate.mock.calls[0][1].$set).toMatchObject({
      active: true,
      'channels.email': true,
      'channels.push': false,
    })
  })

  it('turning every channel off pauses the alert, as the rental alerts do', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ channels: { push: false, email: false } })
    findOneAndUpdate.mockReturnValueOnce(query({ _id: 'a1' }))
    await patchH({} as any)
    expect(findOneAndUpdate.mock.calls[0][1].$set).toMatchObject({
      active: false,
      'channels.push': false,
      'channels.email': false,
      'channels.telegram': false,
    })
  })

  it('switching off needs no channel', async () => {
    getRouterParam.mockReturnValueOnce('a1')
    readBody.mockResolvedValueOnce({ active: false, channels: { push: false, email: false } })
    findOneAndUpdate.mockReturnValueOnce(query({ _id: 'a1' }))
    await patchH({} as any)
    expect(findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: 'a1', uid: 'u1' })
  })

  it('refuses to create an alert with no channel', async () => {
    readBody.mockResolvedValueOnce({
      currency: 'USD',
      kind: 'bestBuy',
      op: '<',
      target: 39,
      channels: { push: false, email: false, telegram: false },
    })
    await expect(addH({} as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'no-channel',
    })
    expect(create).not.toHaveBeenCalled()
  })
})
