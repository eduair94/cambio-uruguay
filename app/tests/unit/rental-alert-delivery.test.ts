import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentalAlertDoc } from '../../server/models/RentalAlert'
import type { RentalAlertCandidate } from '../../utils/rentalAlerts'
import {
  deliverRentalAlertChannel,
  rentalAlertEmail,
  smtpFailureStatus,
} from '../../server/utils/rentalAlertDelivery'

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  sendMail: vi.fn(),
  configured: vi.fn(),
  active: vi.fn(),
  devices: vi.fn(),
  owned: vi.fn(),
  sendPush: vi.fn(),
  revoke: vi.fn(),
}))
vi.mock('../../server/utils/firebaseAdmin', () => ({ adminAuth: () => ({ getUser: h.getUser }) }))
vi.mock('../../server/utils/mailer', () => ({
  sendMail: h.sendMail,
  isMailerConfigured: h.configured,
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/RentalAlert', () => ({ RentalAlertModel: { exists: h.active } }))
vi.mock('../../server/models/PushRegistration', () => ({
  PushRegistrationModel: {
    exists: h.owned,
    find: () => ({ sort: () => ({ limit: () => ({ lean: h.devices }) }) }),
  },
}))
vi.mock('../../server/utils/push', () => ({ sendPushNotification: h.sendPush }))
vi.mock('../../server/utils/pushRegistrations', () => ({ unregisterPushToken: h.revoke }))

const alert = {
  _id: 'alert1',
  uid: 'u1',
  active: true,
  revision: 2,
  kind: 'rental-search',
  filters: { department: 'Montevideo' },
  channels: { email: true, push: true },
  locale: 'es',
  emailAddress: 'me@example.com',
  unsubscribeToken: 'a'.repeat(64),
} as unknown as RentalAlertDoc
const candidate = {
  id: 'infocasas:1',
  propertyKey: 'montevideo-cordon-1',
  title: '<script>alert(1)</script> Casa',
  department: 'Montevideo',
  neighborhood: 'Cordón',
  price: { amount: 25000, currency: 'UYU' },
  expenses: null,
  url: 'https://evil.example',
  bedrooms: 1,
  image: null,
} as RentalAlertCandidate
const input = (channel: 'push' | 'email' = 'email') => ({
  channel,
  alert,
  candidates: [candidate],
  deliveryId: 'digest1',
})

beforeEach(() => {
  vi.resetAllMocks()
  h.active.mockResolvedValue(true)
  h.getUser.mockResolvedValue({
    email: 'me@example.com',
    emailVerified: true,
    disabled: false,
    providerData: [{ providerId: 'password' }],
  })
  h.configured.mockReturnValue(true)
  h.devices.mockResolvedValue([{ _id: 'hash1', uid: 'u1', token: 'token1' }])
  h.owned.mockResolvedValue(true)
  h.sendPush.mockResolvedValue({ status: 'sent' })
})

describe('rental alert transport without network sends', () => {
  it('supports authenticated custom-provider accounts with no linked Firebase provider for push', async () => {
    h.getUser.mockResolvedValue({
      disabled: false,
      providerData: [],
      email: null,
      emailVerified: false,
    })
    expect(await deliverRentalAlertChannel(input('push'))).toEqual({ status: 'sent' })
    expect(h.sendPush).toHaveBeenCalledOnce()
  })
  it.each([
    { email: 'me@example.com', emailVerified: false, providerData: [{}] },
    { email: 'someone@example.com', emailVerified: true, providerData: [{}] },
    { email: 'me@example.com', emailVerified: true, providerData: [{}], disabled: true },
    { providerData: [], emailVerified: false },
  ])('rejects unverified, changed, disabled or anonymous destinations', async account => {
    h.getUser.mockResolvedValue(account)
    expect((await deliverRentalAlertChannel(input())).status).toBe('unavailable')
    expect(h.sendMail).not.toHaveBeenCalled()
  })
  it('checks current subscription status/revision before contacting providers', async () => {
    h.active.mockResolvedValue(false)
    expect(await deliverRentalAlertChannel(input())).toMatchObject({
      status: 'unavailable',
      reason: 'subscription_changed',
    })
    expect(h.getUser).not.toHaveBeenCalled()
    expect(h.sendMail).not.toHaveBeenCalled()
  })
  it('escapes HTML, limits cards to ten, keeps full count, localizes internal links and unsubscribe', () => {
    const result = rentalAlertEmail(
      { ...alert, locale: 'en', kind: 'rental-opportunity' },
      Array.from({ length: 12 }, () => candidate),
      'id\r\nevil'
    )
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
    expect(result.html.match(/<li>/g)).toHaveLength(10)
    expect(result.html).toContain('12 new listings')
    expect(result.html).toContain('/en/alquileres/montevideo-cordon-1')
    expect(result.html).toContain('operation=rent')
    expect(result.html).not.toContain('evil.example')
    expect(result.html).toContain('not guaranteed savings')
    expect(result.listUnsubscribeUrl).toContain('/api/rental-alerts/unsubscribe?token=')
    expect(result.messageId).toMatch(/^<rental-[a-f0-9]{64}@cambio-uruguay.com>$/)
  })
  it('uses the verified current address and stable Message-ID', async () => {
    expect(await deliverRentalAlertChannel(input())).toEqual({ status: 'sent' })
    expect(h.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'me@example.com',
        messageId: rentalAlertEmail(alert, [candidate], 'digest1').messageId,
      })
    )
  })
  it.each([
    [{ code: 'ETIMEDOUT', command: 'DATA' }, 'uncertain'],
    [{ code: 'ESOCKET' }, 'uncertain'],
    [{ responseCode: 451, command: 'DATA' }, 'failed'],
    [{ code: 'EAUTH' }, 'failed'],
    [{ code: 'ETIMEDOUT', command: 'CONN' }, 'failed'],
  ])('classifies SMTP ambiguity without claiming exactly once', async (error, status) => {
    expect(smtpFailureStatus(error)).toBe(status)
    h.sendMail.mockRejectedValue(error)
    expect((await deliverRentalAlertChannel(input())).status).toBe(status)
  })
  it('does not deliver to a device reassigned after the initial batch read', async () => {
    h.owned.mockResolvedValue(false)
    expect((await deliverRentalAlertChannel(input('push'))).status).toBe('unavailable')
    expect(h.sendPush).not.toHaveBeenCalled()
  })
  it('uses a generic lock-screen message and one data-only display path', async () => {
    await deliverRentalAlertChannel(input('push'))
    expect(h.sendPush).toHaveBeenCalledWith(
      'token1',
      expect.any(String),
      expect.not.stringContaining('Cordón'),
      expect.objectContaining({ dataOnly: true, url: '/alquileres-uruguay?department=Montevideo' })
    )
  })
  it('does not repeat accepted devices when another fails or cleanup fails', async () => {
    h.devices.mockResolvedValue([
      { _id: '1', token: 'token1' },
      { _id: '2', token: 'token2' },
    ])
    h.sendPush
      .mockResolvedValueOnce({ status: 'sent' })
      .mockResolvedValueOnce({ status: 'invalid' })
    h.revoke.mockRejectedValue(new Error('db unavailable'))
    expect(await deliverRentalAlertChannel(input('push'))).toEqual({
      status: 'sent',
      reason: 'partial_push',
    })
  })
})
