import { describe, expect, it } from 'vitest'
import { signState, verifyState, resolveDiscordUid } from '../../server/utils/discordAuth'

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
      { ...base, getUserByEmail: async () => ({ uid: 'existing-uid' }) }
    )
    expect(uid).toBe('existing-uid')
  })

  it('creates an email user when verified email has no account', async () => {
    const uid = await resolveDiscordUid({ id: '111', email: 'a@b.com', verified: true }, base)
    expect(uid).toBe('new-uid')
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
})
