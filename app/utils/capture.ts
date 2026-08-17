// Where the site is allowed to ask a reader for their email.
//
// WHY: GA4 for 2026-08-17 shows a single tweet delivering 483 new users onto one
// long ranking page, 96% of them on a phone, and not one thing on that page
// asked them to come back. The spike is now over and the site has nothing to
// show for it. A recirculation block ([[relatedPages]]) keeps a visit going; this
// is the other half — keeping the visitor.
//
// The placement rule reuses `adDensityForPath`, which already encodes exactly the
// distinction that matters here and was argued out once in `ads.ts`:
//
//   'normal' → a long read somebody arrived at from search or social. They are
//              done when they reach the bottom; an offer there is welcome.
//   'light'  → a rate table, a map, a calculator. The visit has a job to finish
//              in ten seconds and interrupting it is how you lose it.
//   'none'   → the page IS a conversion or is plumbing.
//
// Coupling the two is deliberate rather than lazy: they are the same judgement
// about what kind of page this is. If they ever need to diverge, this function is
// where the split goes.
//
// PURE (no Vue/Nuxt imports) so the layout and vitest share it.

import { adDensityForPath, normalizeAdPath } from './ads'

/**
 * Routes that already own the ask.
 *
 * `/newsletter` is the signup page and `/newsletter/<fecha>` renders
 * `<NewsletterSignup />` inline at the end of the issue, so a second card below
 * it would be the same form twice on one screen.
 */
const ALREADY_ASKS = ['/newsletter'] as const

/** True when `path` may render the end-of-article newsletter card. */
export function captureAllowedForPath(path: string): boolean {
  const clean = normalizeAdPath(path)
  if (ALREADY_ASKS.some(entry => clean === entry || clean.startsWith(`${entry}/`))) return false
  return adDensityForPath(path) === 'normal'
}

/** localStorage key: the reader closed the card. Respected for {@link DISMISS_DAYS}. */
export const CAPTURE_DISMISS_KEY = 'cu_nl_dismissed'

/** localStorage key: the reader subscribed. Never ask again. */
export const CAPTURE_DONE_KEY = 'cu_nl_done'

/** A dismissal is a "not now", not a "never" — but 60 days is long enough to mean it. */
export const DISMISS_DAYS = 60

/**
 * Whether the card should render, given what the browser remembers.
 *
 * Pure so the decision is testable without a DOM: the component passes in what it
 * read from localStorage and the clock.
 */
export function shouldAskForEmail(opts: {
  allowed: boolean
  done: boolean
  dismissedAt: number | null
  now: number
}): boolean {
  if (!opts.allowed || opts.done) return false
  if (opts.dismissedAt === null) return true
  const elapsed = opts.now - opts.dismissedAt
  if (!Number.isFinite(elapsed) || elapsed < 0) return true // a clock change is not a decision
  return elapsed > DISMISS_DAYS * 24 * 60 * 60 * 1000
}
