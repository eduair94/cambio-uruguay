import { beforeEach, describe, expect, it, vi } from 'vitest'
import { withRentalAlertLease } from '../../server/utils/rentalAlertLease'
const state = vi.hoisted(() => ({
  row: null as null | { _id: string; owner: string; expiresAt: Date },
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/RentalAlertLease', () => ({
  RentalAlertLeaseModel: {
    findOneAndUpdate: (
      filter: { _id: string },
      update: { $set: { owner: string; expiresAt: Date } }
    ) => ({
      lean: async () => {
        if (state.row && state.row._id === filter._id && +state.row.expiresAt > Date.now())
          throw Object.assign(new Error('duplicate'), { code: 11000 })
        state.row = { _id: filter._id, ...update.$set }
        return { ...state.row }
      },
    }),
    updateOne: async (
      filter: { _id: string; owner: string },
      update: { $set: { expiresAt: Date } }
    ) => {
      if (
        !state.row ||
        state.row.owner !== filter.owner ||
        state.row._id !== filter._id ||
        +state.row.expiresAt <= Date.now()
      )
        return { matchedCount: 0 }
      state.row.expiresAt = update.$set.expiresAt
      return { matchedCount: 1 }
    },
    deleteOne: async (filter: { owner: string }) => {
      if (state.row?.owner === filter.owner) state.row = null
    },
  },
}))

describe('rental alert shared account and scheduler leases', () => {
  beforeEach(() => {
    state.row = null
  })

  it('allows only one simultaneous account operation, then releases for a retry', async () => {
    let release!: () => void
    let entered!: () => void
    const ready = new Promise<void>(resolve => {
      entered = resolve
    })
    const blocker = new Promise<void>(resolve => {
      release = resolve
    })
    const first = withRentalAlertLease('uid:one', async () => {
      entered()
      await blocker
      return 1
    })
    await ready
    const second = vi.fn()
    await expect(withRentalAlertLease('uid:one', second)).rejects.toMatchObject({ statusCode: 503 })
    expect(second).not.toHaveBeenCalled()
    release()
    expect(await first).toBe(1)
    expect(await withRentalAlertLease('uid:one', async () => 2)).toBe(2)
  })

  it('does not let an expired owner write or release the replacement worker lease', async () => {
    await expect(
      withRentalAlertLease('runner', async guard => {
        state.row = {
          _id: 'runner',
          owner: 'replacement',
          expiresAt: new Date(Date.now() + 120000),
        }
        await guard()
      })
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(state.row?.owner).toBe('replacement')
  })

  it('releases its own lease on callback failure', async () => {
    await expect(
      withRentalAlertLease('index', async () => {
        throw new Error('source failed')
      })
    ).rejects.toThrow('source failed')
    expect(state.row).toBeNull()
  })
})
