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

/**
 * A verified Discord address matched an account whose own address was never verified. Whoever
 * opened it (an email/password sign-up can use anyone's address, and its creator keeps the
 * password) may still have a way in, so a Discord login never takes it over: its owner verifies
 * the address first (or takes the account with "forgot password"), then Discord links to it.
 */
export class DiscordUnverifiedAccountError extends Error {
  constructor() {
    super('discord-unverified-account')
    this.name = 'DiscordUnverifiedAccountError'
  }
}

export interface UidDeps {
  getUserByEmail: (email: string) => Promise<{ uid: string; emailVerified?: boolean }>
  createUser: (props: {
    uid?: string
    email?: string
    emailVerified?: boolean
    displayName?: string
    photoURL?: string
  }) => Promise<{ uid: string }>
  getUser: (uid: string) => Promise<{ uid: string }>
}

/**
 * Resolve the Firebase uid for a Discord identity.
 * - Verified email matching an existing user whose address is verified → link to that account.
 * - Verified email matching an account with an unverified address → DiscordUnverifiedAccountError.
 * - Verified email with no account → create an email-based user.
 * - No/unverified email → a stable `discord:<id>` user (created on first login).
 */
export async function resolveDiscordUid(p: DiscordProfile, deps: UidDeps): Promise<string> {
  if (p.email && p.verified) {
    let existing: { uid: string; emailVerified?: boolean } | null = null
    try {
      existing = await deps.getUserByEmail(p.email)
    } catch (e: any) {
      if (e?.code !== 'auth/user-not-found') throw e
    }
    if (existing) {
      if (existing.emailVerified !== true) throw new DiscordUnverifiedAccountError()
      return existing.uid
    }
    // Discord verified this address: the new account carries it as verified, or the newsletter and
    // the alert emails (which require a verified address) would never reach it.
    const created = await deps.createUser({ email: p.email, emailVerified: true })
    return created.uid
  }
  const uid = `discord:${p.id}`
  try {
    await deps.getUser(uid)
  } catch {
    await deps.createUser({ uid })
  }
  return uid
}
