// Shared review/reputation primitives used by both the loan directory and the courier comparison.
// PURE (no Vue/Nuxt) so callers in utils/ and tests can import them freely.

/** A citation backing a reputation rating (Reddit thread, Trustpilot, Google, press, ...). */
export interface ReviewSource {
  label: string
  url: string
}

/**
 * Break a 0–5 rating into renderable star slots. A fractional part of 0.5 or more becomes a half
 * star; the row always totals 5 slots. `null` (too few reviews to rate) renders as five empty stars.
 */
export function starParts(rating: number | null): { full: number; half: boolean; empty: number } {
  if (rating == null || Number.isNaN(rating)) return { full: 0, half: false, empty: 5 }
  const r = Math.max(0, Math.min(5, rating))
  const full = Math.floor(r)
  const half = r - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return { full, half, empty }
}
