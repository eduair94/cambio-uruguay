import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  rentalUnsubscribeHtml,
  rentalUnsubscribeInfo,
  unsubscribeRentalAlertEmail,
  validRentalUnsubscribeToken,
} from '../../server/utils/rentalAlertUnsubscribe'
const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  update: vi.fn(),
  lease: vi.fn(),
  guard: vi.fn(),
}))
vi.mock('../../server/models/RentalAlert', () => ({
  RentalAlertModel: { findOne: mocks.findOne, updateOne: mocks.update },
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../server/utils/rentalAlertLease', () => ({ withRentalAlertLease: mocks.lease }))

const token = 'abcdef'.repeat(10) + 'abcd'
const row = {
  _id: 'alert-id',
  uid: 'owner',
  locale: 'es',
  channels: { email: true, push: true },
  active: true,
  revision: 3,
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.findOne.mockReturnValue({ select: () => ({ lean: async () => row }) })
  mocks.lease.mockImplementation((_key, callback) => callback(mocks.guard))
  mocks.guard.mockResolvedValue(undefined)
  mocks.update.mockResolvedValue({ modifiedCount: 1 })
})

describe('email unsubscribe', () => {
  it('reading a confirmation link performs no mutation (including email scanners)', async () => {
    const result = await rentalUnsubscribeInfo(token)
    expect(result).toBe(row)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.lease).not.toHaveBeenCalled()
    expect(rentalUnsubscribeHtml('es', 'confirm', token)).toContain('method="post"')
  })
  it('cancels only email under the same owner lease as delivery', async () => {
    await unsubscribeRentalAlertEmail(token)
    expect(mocks.lease).toHaveBeenCalledWith('uid:owner', expect.any(Function))
    expect(mocks.update).toHaveBeenCalledWith(
      { _id: 'alert-id', uid: 'owner', unsubscribeToken: token },
      {
        $set: {
          'channels.email': false,
          emailAddress: null,
          active: true,
        },
      }
    )
  })
  it('pauses subscriptions whose only channel was email and invalidates pending delivery', async () => {
    mocks.findOne.mockReturnValue({
      select: () => ({ lean: async () => ({ ...row, channels: { email: true, push: false } }) }),
    })
    await unsubscribeRentalAlertEmail(token)
    expect(mocks.update).toHaveBeenCalledWith(expect.anything(), {
      $set: expect.objectContaining({ active: false, revision: 4 }),
    })
  })
  it('repeated or removed subscriptions do not cause additional mutations', async () => {
    mocks.findOne.mockReturnValueOnce({ select: () => ({ lean: async () => null }) })
    await unsubscribeRentalAlertEmail(token)
    expect(mocks.update).not.toHaveBeenCalled()
    mocks.findOne.mockReturnValue({
      select: () => ({ lean: async () => ({ ...row, channels: { push: true, email: false } }) }),
    })
    await unsubscribeRentalAlertEmail(token)
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it.each(['es', 'en', 'pt'])(
    'renders accessible, private, localized confirmation in %s',
    locale => {
      const html = rentalUnsubscribeHtml(locale, 'confirm', token)
      expect(html).toContain(`<html lang="${locale}">`)
      expect(html).toContain('name="robots" content="noindex,nofollow"')
      expect(html).toContain('<h1>')
      expect(html).toContain('/cuenta?tab=alerts')
      expect(html).not.toContain('owner')
      expect(html).not.toContain('@')
      expect(html).not.toContain('<script')
    }
  )
  it('never interpolates an unvalidated token into HTML', () => {
    expect(validRentalUnsubscribeToken(token)).toBe(true)
    expect(validRentalUnsubscribeToken('" onsubmit="alert(1)')).toBe(false)
    expect(rentalUnsubscribeHtml('es', 'confirm', '" onsubmit="alert(1)')).not.toContain('<form')
  })
})
