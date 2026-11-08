import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  rateAlertUnsubscribeInfo,
  rateAlertUnsubscribeToken,
  unsubscribeRateAlertEmail,
  validRateAlertUnsubscribeToken,
} from '../../server/utils/rateAlertUnsubscribe'
import { rentalUnsubscribeHtml } from '../../server/utils/rentalAlertUnsubscribe'

// Privacy audit, 2026-11-08: the rate-alert emails had no way out but logging in. They now carry
// the same one-click unsubscribe as the rental alerts (RFC 8058): a random token per alert, a GET
// that only asks, and a POST that turns off that alert's email channel and nothing else.
const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
}))
vi.mock('../../server/models/Alert', () => ({
  AlertModel: { findOne: mocks.findOne, findById: mocks.findById, updateOne: mocks.update },
}))
vi.mock('../../server/models/RentalAlert', () => ({ RentalAlertModel: {} }))
vi.mock('../../server/utils/rentalAlertLease', () => ({ withRentalAlertLease: vi.fn() }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }))

const token = 'abcdef'.repeat(10) + 'abcd'
const row = {
  _id: 'alert-id',
  uid: 'owner',
  channels: { push: true, email: true, telegram: false },
  active: true,
}
const found = (value: unknown) => ({ select: () => ({ lean: async () => value }) })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findOne.mockReturnValue(found(row))
  mocks.update.mockResolvedValue({ modifiedCount: 1 })
})

describe('rate alert unsubscribe token', () => {
  it('is minted once, atomically, and never replaced', async () => {
    mocks.findById.mockReturnValue(found({ _id: 'alert-id', unsubscribeToken: token }))
    expect(await rateAlertUnsubscribeToken('alert-id')).toBe(token)
    const [filter, update] = mocks.update.mock.calls[0]!
    // Only an alert without one gets a token: two instances sending at once agree on it.
    expect(filter).toEqual({ _id: 'alert-id', unsubscribeToken: { $exists: false } })
    expect(validRateAlertUnsubscribeToken(update.$set.unsubscribeToken)).toBe(true)
  })

  it('is absent for a deleted alert', async () => {
    mocks.findById.mockReturnValue(found(null))
    expect(await rateAlertUnsubscribeToken('gone')).toBeNull()
  })

  it('accepts only the 64-hex shape', () => {
    expect(validRateAlertUnsubscribeToken(token)).toBe(true)
    for (const bad of [undefined, '', 'abc', token.toUpperCase(), `${token}0`, [token], { token }])
      expect(validRateAlertUnsubscribeToken(bad)).toBe(false)
  })
})

describe('rate alert email unsubscribe', () => {
  it('reading the link changes nothing (mail scanners open links)', async () => {
    expect(await rateAlertUnsubscribeInfo(token)).toBe(row)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('turns off the email channel of that alert only, keeping it active with push', async () => {
    await unsubscribeRateAlertEmail(token)
    expect(mocks.update).toHaveBeenCalledWith(
      { _id: 'alert-id', uid: 'owner', unsubscribeToken: token },
      { $set: { 'channels.email': false, active: true } }
    )
  })

  it('keeps Telegram as a channel that keeps the alert active', async () => {
    mocks.findOne.mockReturnValue(
      found({ ...row, channels: { push: false, email: true, telegram: true } })
    )
    await unsubscribeRateAlertEmail(token)
    expect(mocks.update.mock.calls[0]![1]).toEqual({
      $set: { 'channels.email': false, active: true },
    })
  })

  it('pauses an alert whose only channel was email', async () => {
    mocks.findOne.mockReturnValue(
      found({ ...row, channels: { push: false, email: true, telegram: false } })
    )
    await unsubscribeRateAlertEmail(token)
    expect(mocks.update.mock.calls[0]![1]).toEqual({
      $set: { 'channels.email': false, active: false },
    })
  })

  it('does nothing for a removed alert or one already without email', async () => {
    mocks.findOne.mockReturnValueOnce(found(null))
    await unsubscribeRateAlertEmail(token)
    mocks.findOne.mockReturnValueOnce(found({ ...row, channels: { push: true, email: false } }))
    await unsubscribeRateAlertEmail(token)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('the confirmation form posts back to the rate-alert endpoint', () => {
    const page = rentalUnsubscribeHtml('es', 'confirm', token, '/api/alerts/unsubscribe')
    expect(page).toContain(`action="/api/alerts/unsubscribe?token=${token}"`)
    expect(page).toContain('method="post"')
    // The rental endpoint keeps its own action.
    expect(rentalUnsubscribeHtml('es', 'confirm', token)).toContain(
      `action="/api/rental-alerts/unsubscribe?token=${token}"`
    )
  })
})
