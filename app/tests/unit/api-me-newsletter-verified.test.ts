import { beforeEach, describe, expect, it, vi } from 'vitest'

// The account switch subscribes the account's address with no confirmation mail, so it must be an
// address Firebase verified: an email/password account can be opened with anyone's address
// (privacy audit, 2026-11-08). Verified according to the account record, not the ID token: a token
// minted before the address was verified keeps saying so for up to an hour (review, 2026-11-08).
const mocks = vi.hoisted(() => ({
  // The session's claim, possibly stale.
  user: { uid: 'u1', email: 'someone@example.com', emailVerified: false },
  // What Firebase says now.
  record: { email: 'someone@example.com', emailVerified: false, disabled: false } as
    { email: string; emailVerified: boolean; disabled: boolean } | Error,
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
vi.mock('../../server/utils/firebaseAdmin', () => ({
  adminAuth: () => ({
    getUser: async () => {
      if (mocks.record instanceof Error) throw mocks.record
      return mocks.record
    },
  }),
}))
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

const recordVerified = (emailVerified: boolean, disabled = false) => {
  mocks.record = { email: 'someone@example.com', emailVerified, disabled }
}

beforeEach(() => {
  mocks.updateOne.mockReset()
  mocks.account.values = {}
  mocks.user.emailVerified = false
  recordVerified(false)
})

describe('PUT /api/me/newsletter', () => {
  it('refuses to subscribe an unverified address', async () => {
    readBody.mockResolvedValueOnce({ email: true })
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'email-not-verified',
    })
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('subscribes and unsubscribes a verified address', async () => {
    recordVerified(true)
    readBody.mockResolvedValueOnce({ email: true })
    await handler({} as never)
    expect(mocks.updateOne.mock.calls[0]![1].$set.status).toBe('confirmed')
    readBody.mockResolvedValueOnce({ email: false })
    await handler({} as never)
    expect(mocks.updateOne.mock.calls[1]![1].$set.status).toBe('unsubscribed')
  })

  // Review, 2026-11-08: switching off unsubscribed whatever address the account carried, so an
  // account opened with someone else's address could take that person off the newsletter. An
  // unverified account turns off its own preference only; each newsletter email keeps its link.
  it('an unverified account switches off its preference, not the list', async () => {
    readBody.mockResolvedValueOnce({ email: false })
    expect(await handler({} as never)).toMatchObject({ email: false })
    expect(mocks.account.values['newsletter.email']).toBe(false)
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('a token minted before the address was verified still leaves the list', async () => {
    // Subscribed from another device after verifying; this one still holds the old token.
    mocks.user.emailVerified = false
    recordVerified(true)
    readBody.mockResolvedValueOnce({ email: false })
    await handler({} as never)
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { email: 'someone@example.com' },
      { $set: { status: 'unsubscribed' } }
    )
  })

  it('a stale "verified" claim does not subscribe an address the record does not vouch for', async () => {
    mocks.user.emailVerified = true
    recordVerified(false)
    readBody.mockResolvedValueOnce({ email: true })
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 409 })
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('treats a disabled or unreadable account as unverified', async () => {
    recordVerified(true, true)
    readBody.mockResolvedValueOnce({ email: true })
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 409 })
    mocks.record = new Error('auth/internal-error')
    readBody.mockResolvedValueOnce({ email: false })
    await handler({} as never)
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })
})
