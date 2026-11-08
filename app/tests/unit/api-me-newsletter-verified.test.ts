import { beforeEach, describe, expect, it, vi } from 'vitest'

// The account switch subscribes the account's address with no confirmation mail, so it must be an
// address Firebase verified: an email/password account can be opened with anyone's address
// (privacy audit, 2026-11-08).
const mocks = vi.hoisted(() => ({
  user: { uid: 'u1', email: 'someone@example.com', emailVerified: false },
  account: {
    email: 'someone@example.com',
    telegramChatId: null,
    settings: { locale: 'es' },
    values: {} as Record<string, unknown>,
    set(key: string, value: unknown) {
      this.values[key] = value
    },
    get(key: string) {
      return this.values[key]
    },
    save: vi.fn(),
  },
  updateOne: vi.fn(),
}))
vi.mock('../../server/utils/auth', () => ({ requireUser: async () => mocks.user }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/User', () => ({
  UserModel: { findById: () => ({ exec: async () => mocks.account }) },
}))
vi.mock('../../server/models/NewsletterSubscriber', () => ({
  NewsletterSubscriberModel: { updateOne: mocks.updateOne },
}))

const readBody = vi.fn()
vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('readBody', readBody)
vi.stubGlobal('createError', (e: { statusCode: number; statusMessage: string }) =>
  Object.assign(new Error(e.statusMessage), e)
)

const { default: handler } = await import('../../server/api/me/newsletter.put')

beforeEach(() => {
  mocks.updateOne.mockReset()
  mocks.account.values = {}
})

describe('PUT /api/me/newsletter', () => {
  it('refuses to subscribe an unverified address', async () => {
    mocks.user.emailVerified = false
    readBody.mockResolvedValueOnce({ email: true })
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'email-not-verified',
    })
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('subscribes a verified address, and anyone can switch it off', async () => {
    mocks.user.emailVerified = true
    readBody.mockResolvedValueOnce({ email: true })
    await handler({} as never)
    expect(mocks.updateOne.mock.calls[0]![1].$set.status).toBe('confirmed')
    mocks.user.emailVerified = false
    readBody.mockResolvedValueOnce({ email: false })
    await handler({} as never)
    expect(mocks.updateOne.mock.calls[1]![1].$set.status).toBe('unsubscribed')
  })
})
