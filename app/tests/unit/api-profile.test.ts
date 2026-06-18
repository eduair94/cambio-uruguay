import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const findByIdAndUpdate = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/User', () => ({ UserModel: { findByIdAndUpdate } }))

installNitroGlobals()
const handler = (await import('../../server/api/me/profile.get')).default

describe('GET /api/me/profile', () => {
  beforeEach(() => {
    requireUser.mockReset()
    findByIdAndUpdate.mockReset()
  })

  it('upserts and returns the user for a valid token', async () => {
    requireUser.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.com' })
    findByIdAndUpdate.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@b.com',
      name: null,
      settings: { locale: 'es' },
    })
    const res = await handler({} as any)
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: { email: 'a@b.com' } },
      expect.objectContaining({ upsert: true, new: true })
    )
    expect(res).toMatchObject({ uid: 'u1', email: 'a@b.com' })
  })

  it('propagates a 401 from requireUser', async () => {
    requireUser.mockRejectedValueOnce(Object.assign(new Error('no'), { statusCode: 401 }))
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
  })
})
