import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const linkCreate = vi.fn()
const userFindById = vi.fn()
const userUpdateOne = vi.fn()
;(globalThis as any).useRuntimeConfig = () => ({ telegram: { username: 'CambioBot' } })
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/TelegramLink', () => ({ TelegramLinkModel: { create: linkCreate } }))
vi.mock('../../server/models/User', () => ({
  UserModel: { findById: userFindById, updateOne: userUpdateOne },
}))

installNitroGlobals()
const codeH = (await import('../../server/api/me/telegram/link-code.post')).default
const statusH = (await import('../../server/api/me/telegram/status.get')).default
const delH = (await import('../../server/api/me/telegram/index.delete')).default

beforeEach(() => {
  ;[requireUser, linkCreate, userFindById, userUpdateOne].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('me/telegram API', () => {
  it('issues a link code + deep link', async () => {
    linkCreate.mockResolvedValueOnce({})
    const res = await codeH({} as any)
    expect(res.botUsername).toBe('CambioBot')
    expect(res.deepLink).toBe(`https://t.me/CambioBot?start=${res.code}`)
    expect(linkCreate).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1', code: res.code }))
  })

  it('reports linked status', async () => {
    userFindById.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve({ telegramChatId: '55' }) }),
    })
    expect(await statusH({} as any)).toEqual({ linked: true })
  })

  it('unlinks the caller', async () => {
    userUpdateOne.mockResolvedValueOnce({})
    expect(await delH({} as any)).toEqual({ ok: true })
    expect(userUpdateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $set: { telegramChatId: null } })
  })
})
