import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  prepareRentalAlertBaseline,
  refreshRentalAlertIndex,
  rentalAlertFrontier,
} from '../../server/utils/rentalAlertIndex'
const mocks = vi.hoisted(() => ({
  inventory: vi.fn(),
  previous: vi.fn(),
  known: vi.fn(),
  write: vi.fn(),
  state: vi.fn(),
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/utils/rentalAlertLease', () => ({
  withRentalAlertLease: async (_key: string, fn: () => Promise<unknown>) => fn(),
}))
vi.mock('../../server/utils/rentalAlertMatching', () => ({
  readRentalAlertInventory: mocks.inventory,
}))
vi.mock('../../server/models/RentalAlertEvent', () => ({
  RentalAlertEventModel: {
    find: () => ({ select: () => ({ lean: mocks.known }) }),
    bulkWrite: mocks.write,
  },
  RentalAlertIndexModel: { findById: () => ({ lean: mocks.previous }), replaceOne: mocks.state },
}))

describe('persistent rental novelty index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.previous.mockResolvedValue(null)
    mocks.inventory.mockResolvedValue({
      ids: ['rent:infocasas:1'],
      algorithm: 'v1',
      sourceVersion: 'now',
    })
    mocks.known.mockResolvedValue([])
  })

  it('seeds every existing ID silently before returning an activation boundary', async () => {
    const boundary = await prepareRentalAlertBaseline('rental-search')
    const document = mocks.write.mock.calls[0][0][0].updateOne.update.$setOnInsert
    expect(document).toMatchObject({
      candidateId: 'rent:infocasas:1',
      baseline: true,
      discoveredAt: boundary,
    })
    expect(mocks.write.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.state.mock.invocationCallOrder[0]
    )
  })

  it('preserves old IDs on reread or group splits and creates only truly unobserved IDs', async () => {
    mocks.previous.mockResolvedValue({
      scannedAt: new Date('2026-01-01'),
      baselineAt: new Date('2026-01-01'),
      algorithm: 'v1',
    })
    mocks.inventory.mockResolvedValue({
      ids: ['rent:infocasas:1', 'rent:infocasas:2'],
      algorithm: 'v1',
      sourceVersion: 'later',
    })
    mocks.known.mockResolvedValue([{ _id: 'rental-search:rent:infocasas:1' }])
    const result = await refreshRentalAlertIndex('rental-search')
    expect(result.added.map(row => row.candidateId)).toEqual(['rent:infocasas:2'])
    expect(result.added[0].baseline).toBe(false)
    expect(mocks.write.mock.calls[0][0][0].updateOne.update).toHaveProperty('$setOnInsert')
    expect(mocks.write.mock.calls[0][0][0].updateOne.update).not.toHaveProperty('$set')
  })

  it('silently resets the opportunity boundary when the comparison algorithm changes', async () => {
    mocks.previous.mockResolvedValue({
      scannedAt: new Date('2026-01-01'),
      baselineAt: new Date('2026-01-01'),
      algorithm: 'older',
    })
    const result = await refreshRentalAlertIndex('rental-opportunity')
    expect(result.added[0].baseline).toBe(true)
    expect(result.state.baselineAt).toEqual(result.state.scannedAt)
  })

  it('does not mutate the ledger or index in dry run', async () => {
    await refreshRentalAlertIndex('rental-search', { dryRun: true })
    expect(mocks.write).not.toHaveBeenCalled()
    expect(mocks.state).not.toHaveBeenCalled()
  })

  it('does not seal the generation after an interrupted ledger write', async () => {
    mocks.write.mockRejectedValueOnce(new Error('database down'))
    await expect(refreshRentalAlertIndex('rental-search')).rejects.toThrow('database down')
    expect(mocks.state).not.toHaveBeenCalled()
  })

  it('indexes more than one batch without discarding later IDs', async () => {
    mocks.inventory.mockResolvedValue({
      ids: Array.from({ length: 1201 }, (_, i) => `rent:infocasas:${i}`),
      algorithm: 'v1',
      sourceVersion: 'now',
    })
    const result = await refreshRentalAlertIndex('rental-search')
    expect(result.added).toHaveLength(1201)
    expect(mocks.write).toHaveBeenCalledTimes(3)
  })

  it('makes the next boundary newer when the wall clock is identical or moved backwards', () => {
    const old = new Date('2026-01-01T00:00:00.000Z')
    expect(+rentalAlertFrontier(old, +old)).toBe(+old + 1)
    expect(+rentalAlertFrontier(old, +old - 10000)).toBe(+old + 1)
  })
})
