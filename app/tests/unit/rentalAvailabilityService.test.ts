import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentalOffer } from '../../utils/rentals'
import { availabilityEvidence } from '../../server/utils/rentalAvailabilityIdentity'
import {
  getRentalAvailabilityOwnState,
  reportRentalAvailability,
  rentalAvailabilityReportId,
  withdrawRentalAvailability,
} from '../../server/utils/rentalAvailabilityService'

const mocks = vi.hoisted(() => ({
  rows: new Map<string, any>(),
  quotas: new Map<string, number>(),
  owners: new Map<string, any>(),
  create: vi.fn(),
  update: vi.fn(),
  quota: vi.fn(),
  lease: vi.fn(),
  assertOwned: vi.fn(),
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/utils/rentalAlertLease', () => ({
  withRentalAlertLease: (key: string, fn: (guard: () => Promise<void>) => Promise<unknown>) => {
    mocks.lease(key)
    return fn(mocks.assertOwned)
  },
}))
vi.mock('../../server/models/RentalAvailabilityReport', () => ({
  RentalAvailabilityReportModel: {
    findOne: (filter: any) => ({
      select: () => ({
        lean: async () => {
          const row = mocks.rows.get(filter._id)
          return row?.uid === filter.uid ? structuredClone(row) : null
        },
      }),
    }),
    create: (row: any) => mocks.create(row),
    updateOne: (filter: any, patch: any) => mocks.update(filter, patch),
  },
  RentalAvailabilityQuotaModel: {
    findOneAndUpdate: (filter: any) => ({ lean: () => mocks.quota(filter) }),
  },
}))
vi.mock('../../server/utils/rentalAvailabilityIndex', () => ({
  invalidateRentalAvailabilityIndex: vi.fn(),
  loadAvailabilityOwners: async () => mocks.owners,
  loadRentalAvailabilityIndex: async () => ({
    summaryForOffers: () => ({ count: 0, lastReportedAt: null, status: 'unconfirmed' }),
  }),
}))

const user = { uid: 'actual-authenticated-uid' }
const advert = { source: 'infocasas', listingId: '123' }
const id = 'rent:infocasas:123'
const now = new Date('2026-09-06T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  vi.clearAllMocks()
  mocks.rows.clear()
  mocks.quotas.clear()
  mocks.owners.clear()
  const offer = {
    ...advert,
    title: 'Apartamento unidad 101',
    lastSeen: now.toISOString(),
    priceUyu: 20000,
  } as RentalOffer
  mocks.owners.set(id, { key: 'group-current', offer, evidence: availabilityEvidence(offer) })
  mocks.create.mockImplementation(async row => {
    if (mocks.rows.has(row._id)) throw { code: 11000 }
    mocks.rows.set(row._id, structuredClone(row))
    return row
  })
  mocks.update.mockImplementation(async (filter, patch) => {
    const row = mocks.rows.get(filter._id)
    if (!row || row.uid !== filter.uid || row.revision !== filter.revision)
      return { matchedCount: 0 }
    mocks.rows.set(filter._id, { ...row, ...structuredClone(patch.$set) })
    return { matchedCount: 1 }
  })
  mocks.quota.mockImplementation(async filter => {
    const attempts = (mocks.quotas.get(filter._id) || 0) + 1
    mocks.quotas.set(filter._id, attempts)
    return { attempts }
  })
  mocks.assertOwned.mockResolvedValue(undefined)
})

describe('rental availability lifecycle and atomic writes', () => {
  it('creates one own report with server dates, durable identity and a 30-day expiry', async () => {
    expect(await getRentalAvailabilityOwnState(user, advert)).toEqual({
      revision: null,
      reported: false,
      expiresAt: null,
      canReport: true,
    })
    const result = await reportRentalAvailability(user, { ...advert, revision: null })
    expect(result).toMatchObject({ reported: true, expiresAt: '2026-10-06T12:00:00.000Z' })
    expect(result.revision).toMatch(/^[\da-f-]{36}$/)
    const row = mocks.rows.get(rentalAvailabilityReportId(user.uid, id))
    expect(row).toMatchObject({ uid: user.uid, advertId: id, reportedAt: now, withdrawnAt: null })
    expect(mocks.lease).toHaveBeenCalledWith(`rental-availability:uid:${user.uid}`)
    expect(mocks.assertOwned).toHaveBeenCalled()
    expect(Object.keys(result).sort()).toEqual(['expiresAt', 'reported', 'revision', 'summary'])
  })

  it('rejects a late initial retry and does not extend active reports with the current revision', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    vi.setSystemTime(new Date(now.getTime() + 60000))
    await expect(
      reportRentalAvailability(user, { ...advert, revision: null })
    ).rejects.toMatchObject({ statusCode: 409, data: { code: 'report_changed' } })
    const duplicate = await reportRentalAvailability(user, { ...advert, revision: first.revision })
    expect(duplicate).toEqual(first)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.quota).toHaveBeenCalledTimes(2)
  })

  it('withdraws only own report, with a new revision and without changing dates', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    const removed = await withdrawRentalAvailability(user, { ...advert, revision: first.revision })
    expect(removed.reported).toBe(false)
    expect(removed.revision).not.toBe(first.revision)
    expect(removed.expiresAt).toBe(first.expiresAt)
    expect(await getRentalAvailabilityOwnState(user, advert)).toMatchObject({
      canReport: true,
      reported: false,
    })
    await expect(
      reportRentalAvailability(user, { ...advert, revision: first.revision })
    ).rejects.toMatchObject({ data: { code: 'report_changed' } })
  })

  it('an explicit new observation can reactivate, and a stale withdrawal cannot remove it', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    const removed = await withdrawRentalAvailability(user, { ...advert, revision: first.revision })
    vi.setSystemTime(new Date(now.getTime() + 86_400_000))
    const next = await reportRentalAvailability(user, { ...advert, revision: removed.revision })
    expect(next.expiresAt).toBe('2026-10-07T12:00:00.000Z')
    await expect(
      withdrawRentalAvailability(user, { ...advert, revision: first.revision })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect((await getRentalAvailabilityOwnState(user, advert)).reported).toBe(true)
    expect(mocks.rows.size).toBe(1)
  })

  it('expiry is logical and only an explicit current-revision POST starts another period', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    vi.setSystemTime(new Date(first.expiresAt!))
    expect(await getRentalAvailabilityOwnState(user, advert)).toMatchObject({
      canReport: true,
      reported: false,
      revision: first.revision,
    })
    await expect(
      reportRentalAvailability(user, { ...advert, revision: null })
    ).rejects.toMatchObject({ statusCode: 409 })
    const renewed = await reportRentalAvailability(user, { ...advert, revision: first.revision })
    expect(renewed.expiresAt).toBe('2026-11-05T12:00:00.000Z')
  })

  it('keeps reports on their own ID when a property splits, never when own unit changes', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    mocks.owners.get(id).key = 'group-new-after-split'
    expect((await getRentalAvailabilityOwnState(user, advert)).reported).toBe(true)
    mocks.owners.get(id).evidence.units = ['102']
    // Private state still offers withdrawal; public compatibility is checked separately.
    expect((await getRentalAvailabilityOwnState(user, advert)).reported).toBe(true)
    expect(
      (await reportRentalAvailability(user, { ...advert, revision: first.revision })).expiresAt
    ).toBe(first.expiresAt)
    expect([...mocks.rows.values()][0].evidence.units).toEqual(['101'])
  })

  it('refuses an unavailable or ambiguous owner but permits withdrawing the old own report', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    mocks.owners.clear()
    expect((await getRentalAvailabilityOwnState(user, advert)).canReport).toBe(false)
    await expect(
      reportRentalAvailability({ uid: 'someone-else' }, { ...advert, revision: null })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(
      (await withdrawRentalAvailability(user, { ...advert, revision: first.revision })).reported
    ).toBe(false)
  })

  it('never reads or removes another user report with a guessed revision', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    expect(await getRentalAvailabilityOwnState({ uid: 'attacker' }, advert)).toMatchObject({
      revision: null,
      reported: false,
    })
    await expect(
      withdrawRentalAvailability({ uid: 'attacker' }, { ...advert, revision: first.revision })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect((await getRentalAvailabilityOwnState(user, advert)).reported).toBe(true)
  })

  it('the same source-prefixed ID does not create a second row', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    expect(
      (await getRentalAvailabilityOwnState(user, { ...advert, listingId: 'infocasas:123' }))
        .revision
    ).toBe(first.revision)
    expect(mocks.rows.size).toBe(1)
  })

  it.each([
    { ...advert },
    { ...advert, revision: 'bad' },
    { ...advert, revision: null, uid: 'forged' },
    { ...advert, revision: null, reportedAt: '1900-01-01' },
    { ...advert, revision: null, propertyKey: 'forged' },
    { ...advert, revision: null, listingId: { $ne: null } },
  ])('rejects untrusted mutation fields before writing (%j)', async input => {
    await expect(reportRentalAvailability(user, input)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('enforces a durable minute quota without charging active duplicate reports', async () => {
    for (let i = 0; i < 5; i++) {
      mocks.owners.set(`rent:infocasas:${i}`, mocks.owners.get(id))
      await reportRentalAvailability(user, { ...advert, listingId: String(i), revision: null })
    }
    await expect(
      reportRentalAvailability(user, { ...advert, revision: null })
    ).rejects.toMatchObject({ statusCode: 429 })
    expect(mocks.rows.size).toBe(5)
  })

  it('does not write after losing its lease', async () => {
    mocks.assertOwned.mockRejectedValue(Object.assign(new Error('lost'), { statusCode: 503 }))
    await expect(
      reportRentalAvailability(user, { ...advert, revision: null })
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('CAS protects against a concurrent row change even if a lease owner was stalled', async () => {
    const first = await reportRentalAvailability(user, { ...advert, revision: null })
    mocks.update.mockResolvedValue({ matchedCount: 0 })
    await expect(
      withdrawRentalAvailability(user, { ...advert, revision: first.revision })
    ).rejects.toMatchObject({ data: { code: 'report_changed' } })
  })
})
