import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const updateOne = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/User', () => ({ UserModel: { updateOne } }))

const { readBody } = installNitroGlobals()
const handler = (await import('../../server/api/me/fcm-token.post')).default

beforeEach(() => {
  ;[requireUser, updateOne, readBody].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('POST /api/me/fcm-token', () => {
  it('rejects an empty token', async () => {
    readBody.mockResolvedValueOnce({ token: '' })
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('adds the token to the user (idempotent)', async () => {
    readBody.mockResolvedValueOnce({ token: 'tok-123' })
    updateOne.mockResolvedValueOnce({})
    const res = await handler({} as any)
    expect(updateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $addToSet: { fcmTokens: 'tok-123' } })
    expect(res).toEqual({ ok: true })
  })
})
