import { createError, type H3Event } from 'h3'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/** Guards the bot-only internal API: requires the shared `x-telegram-secret`. */
export function requireBotSecret(event: H3Event): void {
  const expected = useRuntimeConfig().telegram?.secret
  const got = event.node.req.headers['x-telegram-secret']
  if (!expected || got !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'bad telegram secret' })
  }
}

export interface TelegramAuthData {
  id: number | string
  auth_date: number | string
  hash: string
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  [k: string]: unknown
}

/**
 * Verify a Telegram Login Widget payload.
 * Rebuilds the data-check-string (all fields except `hash`, non-null, sorted,
 * `key=value` joined by '\n'), derives `secret = SHA256(botToken)`, and
 * timing-safe-compares HMAC-SHA256(dcs, secret) to `data.hash`. Also enforces
 * that `auth_date` is no older than `maxAgeSeconds`.
 */
export function verifyTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
  maxAgeSeconds = 86400,
  now: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!botToken || !data || typeof data.hash !== 'string' || data.hash.length === 0) return false

  const authDate = Number(data.auth_date)
  if (!Number.isFinite(authDate) || now - authDate > maxAgeSeconds) return false

  const dcs = Object.keys(data)
    .filter(k => k !== 'hash' && data[k] != null)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n')

  const secret = createHash('sha256').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(dcs).digest('hex')

  const a = Buffer.from(data.hash, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
