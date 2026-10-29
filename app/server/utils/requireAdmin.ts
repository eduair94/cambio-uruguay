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

/**
 * The same check, for a PUBLIC route that shows more to the owner: the admin, or `null`.
 *
 * Never throws. No token, an expired token, a non-admin account and an unset allowlist are all the
 * same answer to a public route — the public view — so the route keeps fail-closed semantics
 * without turning a visitor's stale session into an error page.
 */
export async function adminOrNull(event: H3Event): Promise<AuthedUser | null> {
  if (!event.node.req.headers.authorization) return null
  try {
    return await requireAdmin(event)
  } catch {
    return null
  }
}
