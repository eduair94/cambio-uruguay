import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireRentalAlertUser } from '../../server/utils/rentalAlertAuth'
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  user: vi.fn(),
  registration: vi.fn(),
  mailer: vi.fn(),
}))
vi.mock('../../server/utils/firebaseAdmin', () => ({
  adminAuth: () => ({ verifyIdToken: mocks.verify, getUser: mocks.user }),
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../server/utils/mailer', () => ({ isMailerConfigured: mocks.mailer }))
vi.mock('../../server/models/PushRegistration', () => ({
  PushRegistrationModel: { exists: mocks.registration },
}))

const event = (authorization?: string) => ({ node: { req: { headers: { authorization } } } }) as any
beforeEach(() => {
  vi.clearAllMocks()
  mocks.verify.mockResolvedValue({
    uid: 'verified-uid',
    email: 'old@example.invalid',
    email_verified: true,
    firebase: { sign_in_provider: 'google.com' },
  })
  mocks.user.mockResolvedValue({
    uid: 'verified-uid',
    email: 'current@example.invalid',
    emailVerified: true,
    disabled: false,
  })
  mocks.registration.mockResolvedValue({ _id: 'private-token-hash' })
  mocks.mailer.mockReturnValue(true)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { fcmVapidKey: 'public-key' } }))
})

describe('rental subscription authentication', () => {
  it('verifies revocation and reads the current verified address from Firebase', async () => {
    const result = await requireRentalAlertUser(event('Bearer signed-token'))
    expect(mocks.verify).toHaveBeenCalledWith('signed-token', true)
    expect(mocks.user).toHaveBeenCalledWith('verified-uid')
    expect(result.uid).toBe('verified-uid')
    expect(result.capabilities.email).toBe('current@example.invalid')
    expect(result.capabilities.pushRegistered).toBe(true)
    expect(JSON.stringify(result)).not.toContain('private-token-hash')
  })
  it('does not inherit old verified-email claims', async () => {
    mocks.user.mockResolvedValue({
      email: 'changed@example.invalid',
      emailVerified: false,
      disabled: false,
    })
    expect((await requireRentalAlertUser(event('Bearer token'))).capabilities.emailVerified).toBe(
      false
    )
  })
  it('requires a recoverable account and respects disabled accounts', async () => {
    mocks.verify.mockResolvedValueOnce({
      uid: 'anonymous-uid',
      firebase: { sign_in_provider: 'anonymous' },
    })
    expect((await requireRentalAlertUser(event('Bearer token'))).capabilities.accountEligible).toBe(
      false
    )
    mocks.user.mockResolvedValueOnce({ disabled: true })
    expect((await requireRentalAlertUser(event('Bearer token'))).capabilities.accountEligible).toBe(
      false
    )
  })
  it('reports configuration and actual registered device availability independently', async () => {
    mocks.mailer.mockReturnValue(false)
    mocks.registration.mockResolvedValue(null)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: {} }))
    const { capabilities } = await requireRentalAlertUser(event('Bearer token'))
    expect(capabilities).toMatchObject({
      emailAvailable: false,
      emailVerified: true,
      pushAvailable: false,
      pushRegistered: false,
    })
  })
  it.each([undefined, '', 'Basic secret', `Bearer ${'x'.repeat(8200)}`])(
    'rejects invalid authorization headers',
    async header => {
      await expect(requireRentalAlertUser(event(header))).rejects.toMatchObject({
        statusCode: 401,
        data: { code: 'auth_required' },
      })
      expect(mocks.verify).not.toHaveBeenCalled()
    }
  )
  it('distinguishes expired sessions from a service outage without exposing provider details', async () => {
    mocks.verify.mockRejectedValueOnce({ code: 'auth/id-token-revoked' })
    await expect(requireRentalAlertUser(event('Bearer token'))).rejects.toMatchObject({
      statusCode: 401,
    })
    mocks.verify.mockRejectedValueOnce(new Error('private configuration failure'))
    await expect(requireRentalAlertUser(event('Bearer token'))).rejects.toMatchObject({
      statusCode: 503,
      message: 'temporarily_unavailable',
    })
  })
})
