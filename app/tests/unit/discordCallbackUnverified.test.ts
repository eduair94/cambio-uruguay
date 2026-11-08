import { beforeEach, describe, expect, it, vi } from 'vitest'

// A Discord login whose verified address matches an account nobody verified is refused (see
// resolveDiscordUid): the callback says so with its own code, so the dialog can tell the visitor
// what to do, and it never ties that account to the Discord identity.
const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  updateOne: vi.fn(),
  createCustomToken: vi.fn(async () => 'custom-token'),
  discordVerified: true,
}))
vi.mock('../../server/utils/discordAuth', async () => {
  const actual = await vi.importActual<typeof import('../../server/utils/discordAuth')>(
    '../../server/utils/discordAuth'
  )
  return { ...actual, verifyState: () => true, resolveDiscordUid: mocks.resolve }
})
vi.mock('../../server/utils/firebaseAdmin', () => ({
  adminAuth: () => ({ createCustomToken: mocks.createCustomToken }),
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/User', () => ({ UserModel: { updateOne: mocks.updateOne } }))

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => ({
  discord: { clientId: 'id', clientSecret: 'secret', redirectUri: 'https://example.com/cb' },
}))
vi.stubGlobal('getQuery', () => ({ code: 'oauth-code', state: 'state' }))
vi.stubGlobal('getCookie', () => 'state')
vi.stubGlobal('deleteCookie', vi.fn())
vi.stubGlobal('sendRedirect', (_event: unknown, location: string) => location)
vi.stubGlobal(
  'fetch',
  vi.fn(async (url: string) => ({
    json: async () =>
      url.includes('/oauth2/token')
        ? { access_token: 'discord-access' }
        : { id: '444', email: 'a@b.com', verified: mocks.discordVerified, username: 'someone' },
  }))
)

const { DiscordUnverifiedAccountError } = await import('../../server/utils/discordAuth')
const { default: handler } = await import('../../server/api/auth/discord/callback.get')
const run = () => (handler as (event: unknown) => Promise<string>)({})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.discordVerified = true
})

describe('Discord callback', () => {
  it('sends a refused, unverified account to its own message, without linking it', async () => {
    mocks.resolve.mockRejectedValue(new DiscordUnverifiedAccountError())
    expect(await run()).toBe('/cuenta?authError=discord-unverified')
    expect(mocks.updateOne).not.toHaveBeenCalled()
    expect(mocks.createCustomToken).not.toHaveBeenCalled()
  })

  it('keeps the generic error for anything else', async () => {
    mocks.resolve.mockRejectedValue(new Error('auth/internal-error'))
    expect(await run()).toBe('/cuenta?authError=discord')
  })

  it('signs in a resolved account as before', async () => {
    mocks.resolve.mockResolvedValue('uid-1')
    expect(await run()).toBe('/cuenta?ct=custom-token')
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: 'uid-1' },
      expect.objectContaining({ $set: { discordId: '444' } }),
      { upsert: true }
    )
  })

  // Review, 2026-11-08: the users row kept Discord's address even when Discord had not verified
  // it, and the account switches fall back to that row (newsletter.put.ts).
  it('does not store an address Discord did not verify', async () => {
    mocks.discordVerified = false
    mocks.resolve.mockResolvedValue('discord:444')
    await run()
    expect(mocks.updateOne.mock.calls[0]![1].$setOnInsert.email).toBeNull()
  })

  it('stores a verified one', async () => {
    mocks.resolve.mockResolvedValue('uid-1')
    await run()
    expect(mocks.updateOne.mock.calls[0]![1].$setOnInsert.email).toBe('a@b.com')
  })
})
