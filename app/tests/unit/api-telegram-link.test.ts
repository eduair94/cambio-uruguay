import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireBotSecret = vi.fn()
const linkFindOneAndDelete = vi.fn()
const userUpdateOne = vi.fn()
vi.mock('../../server/utils/telegramAuth', () => ({ requireBotSecret }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/TelegramLink', () => ({
  TelegramLinkModel: { findOneAndDelete: linkFindOneAndDelete },
}))
vi.mock('../../server/models/User', () => ({ UserModel: { updateOne: userUpdateOne } }))

const { readBody } = installNitroGlobals()
const linkH = (await import('../../server/api/telegram/link.post')).default
const unlinkH = (await import('../../server/api/telegram/unlink.post')).default

beforeEach(() => {
  ;[requireBotSecret, linkFindOneAndDelete, userUpdateOne, readBody].forEach(m => m.mockReset())
})

describe('internal telegram link API', () => {
  it('links a valid code to the chat and consumes it', async () => {
    readBody.mockResolvedValueOnce({ code: 'ABC', chatId: '99' })
    linkFindOneAndDelete.mockReturnValueOnce({ exec: () => Promise.resolve({ uid: 'u1' }) })
    userUpdateOne.mockResolvedValueOnce({})
    const res = await linkH({} as any)
    expect(res).toEqual({ ok: true, linked: true })
    expect(userUpdateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $set: { telegramChatId: '99' } })
  })

  it('reports expired when the code is gone', async () => {
    readBody.mockResolvedValueOnce({ code: 'GONE', chatId: '99' })
    linkFindOneAndDelete.mockReturnValueOnce({ exec: () => Promise.resolve(null) })
    expect(await linkH({} as any)).toEqual({ ok: false, reason: 'expired' })
  })

  it('unlink clears the user with that chat', async () => {
    readBody.mockResolvedValueOnce({ chatId: '99' })
    userUpdateOne.mockResolvedValueOnce({})
    expect(await unlinkH({} as any)).toEqual({ ok: true })
    expect(userUpdateOne).toHaveBeenCalledWith(
      { telegramChatId: '99' },
      { $set: { telegramChatId: null } }
    )
  })
})
