import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const h = vi.hoisted(() => ({
  requireUser: vi.fn(),
  connectDb: vi.fn(),
  findById: vi.fn(),
  exists: vi.fn(),
  subscriberResult: vi.fn(),
}))

vi.mock('../../server/utils/auth', () => ({ requireUser: h.requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: h.connectDb }))
vi.mock('../../server/models/User', () => ({ UserModel: { findById: h.findById } }))
vi.mock('../../server/models/NewsletterSubscriber', () => ({
  NewsletterSubscriberModel: { exists: h.exists },
}))

installNitroGlobals()
const handler = (await import('../../server/api/me/newsletter.get')).default

beforeEach(() => {
  vi.resetAllMocks()
  h.requireUser.mockResolvedValue({
    uid: 'user-1',
    email: ' Reader@Example.com ',
    emailVerified: true,
    anonymous: false,
  })
  h.findById.mockReturnValue({
    lean: () => ({
      exec: async () => ({
        email: 'untrusted-profile@example.com',
        newsletter: { email: false, telegram: true },
        telegramChatId: 'private-chat-id',
      }),
    }),
  })
  h.exists.mockReturnValue({ exec: h.subscriberResult })
  h.subscriberResult.mockResolvedValue(null)
})

describe('newsletter account preferences', () => {
  it('recognizes a confirmed public signup without changing the account switch', async () => {
    h.subscriberResult.mockResolvedValue({ _id: 'subscriber-id' })
    const result = await handler({} as any)

    expect(h.findById).toHaveBeenCalledWith('user-1')
    expect(h.exists).toHaveBeenCalledWith({
      email: 'reader@example.com',
      status: 'confirmed',
    })
    expect(result).toEqual({
      email: false,
      telegram: true,
      telegramLinked: true,
      publicEmailSubscribed: true,
    })
  })

  it('returns false when there is no confirmed public subscription', async () => {
    const result = await handler({} as any)
    expect(result.publicEmailSubscribed).toBe(false)
    expect(h.exists).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }))
  })

  it.each([
    { email: 'reader@example.com', emailVerified: false, anonymous: false },
    { email: 'reader@example.com', emailVerified: true, anonymous: true },
    { email: null, emailVerified: true, anonymous: false },
    { email: '  ', emailVerified: true, anonymous: false },
  ])('does not look up a public mailbox for an ineligible identity: %j', async identity => {
    h.requireUser.mockResolvedValue({ uid: 'user-1', ...identity })
    const result = await handler({} as any)
    expect(result.publicEmailSubscribed).toBe(false)
    expect(h.exists).not.toHaveBeenCalled()
  })

  it('returns only preference booleans even if database records contain private fields', async () => {
    h.subscriberResult.mockResolvedValue({
      _id: 'subscriber-id',
      email: 'reader@example.com',
      confirmToken: 'secret-confirmation-token',
      unsubToken: 'secret-unsubscribe-token',
    })
    const result = await handler({ context: { email: 'victim@example.com' } } as any)
    expect(result).toEqual({
      email: false,
      telegram: true,
      telegramLinked: true,
      publicEmailSubscribed: true,
    })
    expect(h.exists).toHaveBeenCalledWith({ email: 'reader@example.com', status: 'confirmed' })
  })

  it('rejects unauthenticated requests before reading any database record', async () => {
    h.requireUser.mockRejectedValue({ statusCode: 401 })
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
    expect(h.connectDb).not.toHaveBeenCalled()
    expect(h.findById).not.toHaveBeenCalled()
    expect(h.exists).not.toHaveBeenCalled()
  })
})
