import { createError, type H3Event } from 'h3'
import { requireUser, type AuthedUser } from './auth'

/**
 * Owner-only gate, on top of the ordinary Firebase bearer check.
 *
 * FAILS CLOSED. With `NUXT_ADMIN_EMAILS` unset the answer is 503, never "let everyone through":
 * the one route behind this gate serves the search queries visitors typed, and the failure mode of
 * an open default is that a forgotten env var publishes them. The allowlist is baked from .env at
 * build time via runtimeConfig — pm2's runtime env reads empty in this app, so a `process.env` check
 * here would be undefined in production (the same trap documented on driversIngestToken).
 */
export async function requireAdmin(event: H3Event): Promise<AuthedUser> {
  const user = await requireUser(event)
  const raw = String(useRuntimeConfig().adminEmails || '')
  const allow = raw
    .split(/[\s,;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  if (!allow.length) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Admin allowlist not configured (NUXT_ADMIN_EMAILS)',
    })
  }
  if (!user.email || !allow.includes(user.email.toLowerCase())) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}
