import { describe, expect, it, vi } from 'vitest'

// Rate alerts used to mail users.email, copied from the session whether Firebase verified it or
// not (privacy audit, 2026-11-08). The task now asks Firebase before handing out an address.
const mocks = vi.hoisted(() => ({
  deps: null as null | { getUserContacts: (uid: string) => Promise<{ email: string | null }> },
  firebaseUsers: {} as Record<string, { emailVerified: boolean; disabled: boolean } | undefined>,
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/Alert', () => ({ AlertModel: {} }))
vi.mock('../../server/models/User', () => ({
  UserModel: {
    findById: (uid: string) => ({
      lean: () => ({
        exec: async () => ({ _id: uid, email: `${uid}@example.com`, fcmTokens: [] }),
      }),
    }),
  },
}))
vi.mock('../../server/utils/rates', () => ({ fetchCurrentRates: vi.fn(), bestRateFor: vi.fn() }))
vi.mock('../../server/utils/push', () => ({ sendPush: vi.fn() }))
vi.mock('../../server/utils/mailer', () => ({ sendMail: vi.fn() }))
vi.mock('../../server/utils/telegram', () => ({ sendTelegram: vi.fn() }))
vi.mock('../../server/utils/alertRunner', () => ({
  runAlertsCheck: async (deps: typeof mocks.deps) => {
    mocks.deps = deps
    return {}
  },
}))
vi.mock('../../server/utils/firebaseAdmin', () => ({
  adminAuth: () => ({
    getUser: async (uid: string) => {
      const user = mocks.firebaseUsers[uid]
      if (!user) throw new Error('auth/user-not-found')
      return user
    },
  }),
}))
vi.stubGlobal('defineTask', (task: unknown) => task)

describe('alerts:check mails only a verified address', () => {
  it('drops the email of an unverified, disabled or unknown account, keeps a verified one', async () => {
    const { default: task } = await import('../../server/tasks/alerts/check')
    await (task as { run: () => Promise<unknown> }).run()
    const contacts = mocks.deps!.getUserContacts
    mocks.firebaseUsers = {
      verified: { emailVerified: true, disabled: false },
      unverified: { emailVerified: false, disabled: false },
      disabled: { emailVerified: true, disabled: true },
    }
    expect((await contacts('verified')).email).toBe('verified@example.com')
    expect((await contacts('unverified')).email).toBeNull()
    expect((await contacts('disabled')).email).toBeNull()
    expect((await contacts('missing')).email).toBeNull()
  })
})
