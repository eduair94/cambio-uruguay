import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireBotSecret = vi.fn()
const userFindOne = vi.fn()
const alertFind = vi.fn()
const alertCreate = vi.fn()
vi.mock('../../server/utils/telegramAuth', () => ({ requireBotSecret }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/User', () => ({ UserModel: { findOne: userFindOne } }))
vi.mock('../../server/models/Alert', () => ({
  AlertModel: { find: alertFind, create: alertCreate },
}))

const { getQuery, readBody } = installNitroGlobals()
const alertsH = (await import('../../server/api/telegram/alerts.get')).default
const alertCreateH = (await import('../../server/api/telegram/alert.post')).default

beforeEach(() => {
  ;[requireBotSecret, userFindOne, alertFind, alertCreate, getQuery, readBody].forEach(m =>
    m.mockReset()
  )
})

function linkUser(uid: string | null) {
  userFindOne.mockReturnValueOnce({
    lean: () => ({ exec: () => Promise.resolve(uid ? { _id: uid } : null) }),
  })
}

describe('internal telegram account API', () => {
  it('returns linked:false for an unknown chat', async () => {
    getQuery.mockReturnValueOnce({ chatId: '5' })
    linkUser(null)
    expect(await alertsH({} as any)).toEqual({ linked: false })
  })

  it('lists the user alerts', async () => {
    getQuery.mockReturnValueOnce({ chatId: '5' })
    linkUser('u1')
    alertFind.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve([{ target: 41 }]) }),
    })
    expect(await alertsH({} as any)).toEqual({ linked: true, alerts: [{ target: 41 }] })
  })

  it('creates an alert from chat', async () => {
    readBody.mockResolvedValueOnce({
      chatId: '5',
      currency: 'USD',
      kind: 'bestBuy',
      op: '>=',
      target: 41,
    })
    linkUser('u1')
    alertCreate.mockResolvedValueOnce({ _id: 'a1' })
    const res = await alertCreateH({} as any)
    expect(res).toMatchObject({ ok: true })
    expect(alertCreate).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u1', currency: 'USD' })
    )
  })

  it('rejects a bad currency on create', async () => {
    readBody.mockResolvedValueOnce({
      chatId: '5',
      currency: 'XXX',
      kind: 'bestBuy',
      op: '>=',
      target: 41,
    })
    await expect(alertCreateH({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })
})
