import { describe, expect, it } from 'vitest'
import {
  DiscordUnverifiedAccountError,
  resolveDiscordUid,
  signState,
  verifyState,
} from '../../server/utils/discordAuth'

describe('discord state', () => {
  it('verifies a freshly signed state against the same secret', () => {
    const s = signState('secret1')
    expect(verifyState(s, s, 'secret1')).toBe(true)
  })
  it('rejects when cookie mismatches or secret differs', () => {
    const s = signState('secret1')
    expect(verifyState(s, signState('secret1'), 'secret1')).toBe(false) // different nonce
    expect(verifyState(s, s, 'secret2')).toBe(false) // wrong secret
    expect(verifyState('garbage', 'garbage', 'secret1')).toBe(false)
    expect(verifyState('', '', 'secret1')).toBe(false)
  })
})

describe('resolveDiscordUid', () => {
  const base = {
    getUserByEmail: async () => {
      throw { code: 'auth/user-not-found' }
    },
    createUser: async (p: any) => ({ uid: p.uid || 'new-uid' }),
    getUser: async (uid: string) => ({ uid }),
  }

  it('links to existing Firebase user when verified email matches', async () => {
    const uid = await resolveDiscordUid(
      { id: '111', email: 'a@b.com', verified: true },
      { ...base, getUserByEmail: async () => ({ uid: 'existing-uid', emailVerified: true }) }
    )
    expect(uid).toBe('existing-uid')
  })

  it('creates an email user when verified email has no account', async () => {
    const created: any[] = []
    const uid = await resolveDiscordUid(
      { id: '111', email: 'a@b.com', verified: true },
      { ...base, createUser: async (p: any) => (created.push(p), { uid: 'new-uid' }) }
    )
    expect(uid).toBe('new-uid')
    // Discord verified it: the account must say so, or verified-only email never reaches it.
    expect(created).toEqual([{ email: 'a@b.com', emailVerified: true }])
  })

  it('uses discord:<id> uid when email is missing/unverified', async () => {
    const uid = await resolveDiscordUid({ id: '222', email: null, verified: false }, base)
    expect(uid).toBe('discord:222')
  })

  it('does not trust an unverified email for linking', async () => {
    let linked = false
    const uid = await resolveDiscordUid(
      { id: '333', email: 'a@b.com', verified: false },
      {
        ...base,
        getUserByEmail: async () => {
          linked = true
          return { uid: 'x' }
        },
      }
    )
    expect(linked).toBe(false)
    expect(uid).toBe('discord:333')
  })

  // Privacy audit, 2026-11-08: an email/password account can be opened with anyone's address, and
  // its creator keeps the password. Linking a Discord login to it by email handed the real owner
  // an account somebody else could still enter (and read its alerts, favorites and devices).
  it.each([false, undefined])(
    'refuses to hand over an existing account whose address is not verified (%s)',
    async emailVerified => {
      const created: unknown[] = []
      await expect(
        resolveDiscordUid(
          { id: '444', email: 'a@b.com', verified: true },
          {
            ...base,
            getUserByEmail: async () => ({ uid: 'opened-by-someone', emailVerified }),
            createUser: async (p: any) => (created.push(p), { uid: 'new-uid' }),
          }
        )
      ).rejects.toBeInstanceOf(DiscordUnverifiedAccountError)
      // Nor a second account: the address belongs to the existing one.
      expect(created).toEqual([])
    }
  )

  it('still fails on any other lookup error', async () => {
    await expect(
      resolveDiscordUid(
        { id: '555', email: 'a@b.com', verified: true },
        {
          ...base,
          getUserByEmail: async () => {
            throw { code: 'auth/internal-error' }
          },
        }
      )
    ).rejects.toEqual({ code: 'auth/internal-error' })
  })
})
