import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  registerPushToken,
  unregisterPushToken,
  hasRentalAlertPushRegistration,
  pushTokenHash,
} from '../../server/utils/pushRegistrations'
const h = vi.hoisted(() => ({
  rows: new Map<string, any>(),
  users: new Map<string, string[]>(),
  clock: 0,
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/PushRegistration', () => ({
  PushRegistrationModel: {
    updateOne: vi.fn(async (filter, update) => {
      h.rows.set(filter._id, { _id: filter._id, ...update.$set, updatedAt: ++h.clock })
    }),
    find: (filter: any) => {
      let limit = Infinity
      const query = {
        sort: () => query,
        limit: (value: number) => {
          limit = value
          return query
        },
        lean: async () =>
          [...h.rows.values()]
            .filter(row => row.uid === filter.uid)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, limit),
      }
      return query
    },
    exists: async (filter: any) => [...h.rows.values()].some(row => row.uid === filter.uid),
    deleteMany: async (filter: any) => {
      for (const key of filter._id.$in) {
        if (h.rows.get(key)?.uid === filter.uid) h.rows.delete(key)
      }
    },
    deleteOne: async (filter: any) => {
      if (h.rows.get(filter._id)?.uid === filter.uid) h.rows.delete(filter._id)
    },
  },
}))
vi.mock('../../server/models/User', () => ({
  UserModel: {
    updateMany: vi.fn(async (filter, update) => {
      for (const [uid, tokens] of h.users)
        if (uid !== filter._id.$ne)
          h.users.set(
            uid,
            tokens.filter(token => token !== update.$pull.fcmTokens)
          )
    }),
    updateOne: vi.fn(async (filter, update) => {
      h.users.set(
        filter._id,
        update.$set?.fcmTokens ??
          (h.users.get(filter._id) || []).filter(token => token !== update.$pull?.fcmTokens)
      )
    }),
  },
}))

beforeEach(() => {
  h.rows.clear()
  h.users.clear()
  h.clock = 0
})
describe('authoritative push device ownership', () => {
  it('keeps exactly one owner when concurrent accounts register the same token', async () => {
    await Promise.all([
      registerPushToken('u1', 'a'.repeat(32)),
      registerPushToken('u2', 'a'.repeat(32)),
    ])
    expect(h.rows.size).toBe(1)
    const owner = h.rows.get(pushTokenHash('a'.repeat(32))).uid
    expect(await hasRentalAlertPushRegistration(owner)).toBe(true)
    expect(await hasRentalAlertPushRegistration(owner === 'u1' ? 'u2' : 'u1')).toBe(false)
  })
  it('caps concurrent device registration to eight and creates a missing user mirror', async () => {
    await Promise.all(
      Array.from({ length: 15 }, (_, i) => registerPushToken('u1', `device-${i}-${'a'.repeat(32)}`))
    )
    expect(h.rows.size).toBe(8)
    expect(h.users.get('u1')).toHaveLength(8)
  })
  it('does not let another account revoke the owner, and revocation is idempotent', async () => {
    const token = 'a'.repeat(32)
    await registerPushToken('u1', token)
    await unregisterPushToken('other', token)
    expect(await hasRentalAlertPushRegistration('u1')).toBe(true)
    await unregisterPushToken('u1', token)
    await unregisterPushToken('u1', token)
    expect(await hasRentalAlertPushRegistration('u1')).toBe(false)
  })
})
