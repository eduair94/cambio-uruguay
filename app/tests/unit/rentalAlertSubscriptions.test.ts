import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createRentalAlertSubscription,
  updateRentalAlertSubscription,
  deleteRentalAlertSubscription,
  publicRentalAlert,
  rentalAlertPublicProjection,
} from '../../server/utils/rentalAlertSubscriptions'
import type { RentalAlertDoc } from '../../server/models/RentalAlert'
import type { RentalAlertUser } from '../../server/utils/rentalAlertAuth'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  removeOutbox: vi.fn(),
  quota: vi.fn(),
  baseline: vi.fn(),
  lease: vi.fn(),
  guard: vi.fn(),
}))
vi.mock('../../server/models/RentalAlert', () => ({
  RentalAlertModel: {
    find: mocks.find,
    findOne: mocks.findOne,
    countDocuments: mocks.count,
    create: mocks.create,
    findOneAndUpdate: mocks.update,
    deleteOne: mocks.remove,
  },
}))
vi.mock('../../server/models/RentalAlertQuota', () => ({
  RentalAlertQuotaModel: { findOneAndUpdate: mocks.quota },
}))
vi.mock('../../server/models/RentalAlertOutbox', () => ({
  RentalAlertOutboxModel: { deleteMany: mocks.removeOutbox },
}))
vi.mock('../../server/utils/rentalAlertIndex', () => ({
  prepareRentalAlertBaseline: mocks.baseline,
}))
vi.mock('../../server/utils/rentalAlertLease', () => ({ withRentalAlertLease: mocks.lease }))
vi.mock('../../server/utils/rentalAlertAuth', () => ({
  rentalAlertError: (code: string, statusCode = 400) =>
    Object.assign(new Error(code), { statusCode, data: { code } }),
}))

const at = new Date('2026-09-06T13:10:00Z')
const id = '123456789012345678901234'
const user: RentalAlertUser = {
  uid: 'firebase-user-1',
  capabilities: {
    accountEligible: true,
    emailAvailable: true,
    emailVerified: true,
    email: 'verified@example.invalid',
    pushAvailable: true,
    pushRegistered: true,
  },
}
const request = {
  kind: 'rental-search',
  filters: { department: 'Montevideo', priceMax: '30000' },
  channels: { email: true, push: false },
  frequency: 'hourly',
  locale: 'es',
}
const row = (patch: Record<string, unknown> = {}) =>
  ({
    _id: id,
    uid: user.uid,
    kind: 'rental-search',
    name: 'Alquiler con patio',
    filters: request.filters,
    channels: request.channels,
    frequency: 'hourly',
    active: true,
    locale: 'es',
    startsAt: at,
    revision: 1,
    createdAt: at,
    updatedAt: at,
    lastNotifiedAt: null,
    emailAddress: 'verified@example.invalid',
    unsubscribeToken: 'secret'.repeat(10),
    fingerprint: 'private-fingerprint',
    cursorId: 'private-cursor',
    ...patch,
  }) as unknown as RentalAlertDoc

beforeEach(() => {
  vi.clearAllMocks()
  mocks.lease.mockImplementation((_key, callback) => callback(mocks.guard))
  mocks.guard.mockResolvedValue(undefined)
  mocks.findOne.mockReturnValue({ lean: async () => null })
  mocks.count.mockResolvedValue(0)
  mocks.quota.mockReturnValue({ lean: async () => ({ attempts: 1 }) })
  mocks.baseline.mockResolvedValue(at)
  mocks.create.mockImplementation(async value => row(value))
  mocks.remove.mockResolvedValue({ deletedCount: 1 })
})

describe('authenticated rental subscription lifecycle', () => {
  it('binds to the verified owner, observes existing inventory before creating, and redacts private fields', async () => {
    const result = await createRentalAlertSubscription(user, request)
    expect(mocks.lease).toHaveBeenCalledWith(`uid:${user.uid}`, expect.any(Function))
    expect(mocks.baseline).toHaveBeenCalledWith('rental-search')
    expect(mocks.baseline.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.create.mock.invocationCallOrder[0]!
    )
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: user.uid,
        startsAt: at,
        emailAddress: user.capabilities.email,
        unsubscribeToken: expect.stringMatching(/^[a-f\d]{64}$/),
      })
    )
    expect(result.alreadyExists).toBe(false)
    for (const key of [
      'uid',
      'emailAddress',
      'unsubscribeToken',
      'fingerprint',
      'cursorId',
      'revision',
    ])
      expect(result.item).not.toHaveProperty(key)
  })

  it.each([
    [{ uid: 'someone-else' }, 'invalid_alert'],
    [{ email: 'someone-else@example.invalid' }, 'invalid_alert'],
    [{ channels: { email: false, push: false } }, 'invalid_alert'],
    [{ channels: { email: 'true', push: false } }, 'invalid_alert'],
    [{ filters: { keys: 'fixed-property' } }, 'unsupported_filter'],
  ])('rejects unsafe body %j', async (patch, code) => {
    await expect(createRentalAlertSubscription(user, { ...request, ...patch })).rejects.toThrow(
      code
    )
    expect(mocks.baseline).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it.each([
    [{ emailVerified: false }, request.channels, 'email_unverified'],
    [{ accountEligible: false }, request.channels, 'account_required'],
    [{ emailAvailable: false }, request.channels, 'email_unavailable'],
    [{ pushRegistered: false }, { email: false, push: true }, 'push_not_registered'],
    [{ pushAvailable: false }, { email: false, push: true }, 'push_unavailable'],
  ])('enforces server channel readiness %j', async (caps, channels, code) => {
    await expect(
      createRentalAlertSubscription(
        { ...user, capabilities: { ...user.capabilities, ...caps } },
        { ...request, channels }
      )
    ).rejects.toThrow(code)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns a duplicate without reactivating or reseeding it', async () => {
    mocks.findOne.mockReturnValue({ lean: async () => row({ active: false }) })
    const result = await createRentalAlertSubscription(user, request)
    expect(result.alreadyExists).toBe(true)
    expect(result.item.active).toBe(false)
    expect(mocks.baseline).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('accepts the optional blank name from the dialog', async () => {
    const result = await createRentalAlertSubscription(user, { ...request, name: '' })
    expect(result.item.name).toBe('Nuevos alquileres')
  })

  it('allows opt-out when the remaining channel is unavailable without losing its pending work', async () => {
    mocks.findOne.mockReturnValue({
      lean: async () => row({ channels: { email: true, push: true } }),
    })
    mocks.update.mockReturnValue({
      lean: async () => row({ channels: { email: false, push: true } }),
    })
    await updateRentalAlertSubscription(
      { ...user, capabilities: { ...user.capabilities, pushRegistered: false } },
      id,
      { channels: { email: false, push: true } }
    )
    const patch = mocks.update.mock.calls[0][1].$set
    expect(patch).toMatchObject({
      active: true,
      channels: { email: false, push: true },
      emailAddress: null,
    })
    expect(patch).not.toHaveProperty('revision')
    expect(patch).not.toHaveProperty('unsubscribeToken')
    expect(mocks.baseline).not.toHaveBeenCalled()
  })

  it('enforces both the per-account limit and the creation rate before expensive indexing', async () => {
    mocks.count.mockResolvedValueOnce(10)
    await expect(createRentalAlertSubscription(user, request)).rejects.toThrow('limit_reached')
    mocks.quota.mockReturnValueOnce({ lean: async () => ({ attempts: 11 }) })
    await expect(createRentalAlertSubscription(user, request)).rejects.toThrow('too_many_requests')
    expect(mocks.baseline).not.toHaveBeenCalled()
  })

  it('pauses even when a delivery channel is no longer available', async () => {
    mocks.findOne.mockReturnValue({ lean: async () => row() })
    mocks.update.mockReturnValue({ lean: async () => row({ active: false, revision: 2 }) })
    const result = await updateRentalAlertSubscription(
      { ...user, capabilities: { ...user.capabilities, emailAvailable: false } },
      id,
      { active: false }
    )
    expect(result.item.active).toBe(false)
    expect(mocks.update).toHaveBeenCalledWith(
      { _id: id, uid: user.uid, revision: 1 },
      { $set: expect.objectContaining({ active: false, revision: 2 }) },
      { new: true }
    )
    expect(mocks.baseline).not.toHaveBeenCalled()
  })

  it('resumes with a fresh boundary and invalidates pending deliveries', async () => {
    mocks.findOne.mockReturnValue({ lean: async () => row({ active: false }) })
    mocks.update.mockReturnValue({ lean: async () => row({ active: true, revision: 2 }) })
    await updateRentalAlertSubscription(user, id, { active: true })
    expect(mocks.baseline).toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith(
      expect.anything(),
      {
        $set: expect.objectContaining({
          startsAt: at,
          cursorAt: null,
          cursorId: '',
          revision: 2,
        }),
      },
      expect.anything()
    )
  })

  it('never updates another owner and keeps deletion idempotent', async () => {
    await expect(updateRentalAlertSubscription(user, id, { active: false })).rejects.toThrow(
      'not_found'
    )
    expect(mocks.findOne).toHaveBeenCalledWith({ _id: id, uid: user.uid })
    await deleteRentalAlertSubscription(user, id)
    expect(mocks.remove).toHaveBeenCalledWith({ _id: id, uid: user.uid })
    await expect(deleteRentalAlertSubscription(user, '../all')).rejects.toThrow('not_found')
  })

  it('public projections do not gain new private fields from the stored document', () => {
    const publicRow = publicRentalAlert(row({ surpriseSecret: 'hidden' }))
    expect(publicRow).not.toHaveProperty('surpriseSecret')
    expect(rentalAlertPublicProjection).not.toHaveProperty('uid')
    expect(rentalAlertPublicProjection).not.toHaveProperty('unsubscribeToken')
  })
})
