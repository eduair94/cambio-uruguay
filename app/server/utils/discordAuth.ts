// Discord OAuth2 login helpers: CSRF state signing and Firebase uid resolution.
// Pure + dependency-injected so the resolution logic is unit-testable without
// Firebase Admin. Used by server/api/auth/discord/{start,callback}.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** Build a signed CSRF state token: `<nonce>.<hmac(nonce, secret)>`. */
export function signState(secret: string): string {
  const nonce = randomBytes(16).toString('hex')
  const mac = createHmac('sha256', secret).update(nonce).digest('hex')
  return `${nonce}.${mac}`
}

/** Verify the callback `state` equals the cookie and carries a valid HMAC. */
export function verifyState(value: string, cookie: string, secret: string): boolean {
  if (!value || !cookie || value !== cookie) return false
  const [nonce, mac] = value.split('.')
  if (!nonce || !mac) return false
  const expected = createHmac('sha256', secret).update(nonce).digest('hex')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export interface DiscordProfile {
  id: string
  email: string | null
  verified: boolean
}

export interface UidDeps {
  getUserByEmail: (email: string) => Promise<{ uid: string }>
  createUser: (props: {
    uid?: string
    email?: string
    displayName?: string
    photoURL?: string
  }) => Promise<{ uid: string }>
  getUser: (uid: string) => Promise<{ uid: string }>
}

/**
 * Resolve the Firebase uid for a Discord identity.
 * - Verified email matching an existing user → link to that account.
 * - Verified email with no account → create an email-based user.
 * - No/unverified email → a stable `discord:<id>` user (created on first login).
 */
export async function resolveDiscordUid(p: DiscordProfile, deps: UidDeps): Promise<string> {
  if (p.email && p.verified) {
    try {
      const u = await deps.getUserByEmail(p.email)
      return u.uid
    } catch (e: any) {
      if (e?.code !== 'auth/user-not-found') throw e
      const created = await deps.createUser({ email: p.email })
      return created.uid
    }
  }
  const uid = `discord:${p.id}`
  try {
    await deps.getUser(uid)
  } catch {
    await deps.createUser({ uid })
  }
  return uid
}
