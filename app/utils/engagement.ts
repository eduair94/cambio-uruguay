import { normalizeAdPath } from './ads'
import { captureAllowedForPath } from './capture'

export const ENGAGEMENT_SESSION_KEY = 'cu_followup_seen'
export const ENGAGEMENT_DISMISS_KEY = 'cu_followup_dismissed'
export const ENGAGEMENT_DISMISS_DAYS = 60

export type FollowUpKind = 'account' | 'newsletter'

// Offer rate alerts where they answer the reader's current task. Other tools and
// directories already have their own save/search-alert actions.
const RATE_ROUTES = ['/', '/dolar-hoy', '/cotizacion', '/historico', '/dolar', '/casa']
const NO_ASK = ['/privacidad', '/terminos', '/acerca', '/newsletter', '/contacto']

export function followUpForPath(path: string): FollowUpKind | null {
  const clean = normalizeAdPath(path)
  if (NO_ASK.some(p => clean === p || clean.startsWith(`${p}/`))) return null
  if (RATE_ROUTES.some(p => clean === p || (p !== '/' && clean.startsWith(`${p}/`))))
    return 'account'
  return captureAllowedForPath(clean) ? 'newsletter' : null
}

export function mayShowFollowUp(opts: {
  seen: boolean
  dismissedAt: string | null
  now: number
}): boolean {
  if (opts.seen) return false
  if (!opts.dismissedAt) return true
  const dismissedAt = Number(opts.dismissedAt)
  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) return true
  // A clock moving backwards must not turn a refusal into a new invitation.
  return opts.now - dismissedAt >= ENGAGEMENT_DISMISS_DAYS * 86_400_000
}
