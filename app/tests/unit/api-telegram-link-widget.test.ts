import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const verifyTelegramAuth = vi.fn()
const updateOne = vi.fn()

vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/telegramAuth', () => ({ verifyTelegramAuth }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/User', () => ({ UserModel: { updateOne } }))

const { readBody } = installNitroGlobals()
vi.stubGlobal('useRuntimeConfig', () => ({ telegram: { token: 'tok' } }))

const handler = (await import('../../server/api/me/telegram/link-widget.post')).default

beforeEach(() => {
  ;[requireUser, verifyTelegramAuth, updateOne, readBody].forEach(m => m.mockReset())
  updateOne.mockResolvedValue({ acknowledged: true })
})

describe('POST /api/me/telegram/link-widget', () => {
  it('propagates a 401 from requireUser', async () => {
    requireUser.mockRejectedValueOnce(Object.assign(new Error('no'), { statusCode: 401 }))
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects an invalid signature with 400', async () => {
    requireUser.mockResolvedValueOnce({ uid: 'u1' })
    readBody.mockResolvedValueOnce({ id: 5, auth_date: 1, hash: 'bad' })
    verifyTelegramAuth.mockReturnValueOnce(false)
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('links telegramChatId on a valid payload', async () => {
    requireUser.mockResolvedValueOnce({ uid: 'u1' })
    readBody.mockResolvedValueOnce({ id: 4242, username: 'ada', auth_date: 1, hash: 'ok' })
    verifyTelegramAuth.mockReturnValueOnce(true)
    const res = await handler({} as any)
    expect(verifyTelegramAuth).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4242 }),
      'tok'
    )
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { telegramChatId: '4242' } }
    )
    expect(res).toEqual({ ok: true, linked: true, username: 'ada' })
  })
})
