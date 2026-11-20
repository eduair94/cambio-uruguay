/**
 * Which dead-end searches the palette reports to GA4 (`search_no_results`).
 *
 * Until 2026-11-20 the event fired on every settled 400 ms typing pause, so deleting and retyping
 * the same words counted twice. Now each (palette opening, normalized query) is reported once, on
 * the first settled pause — not on close, so leaving by a link or closing the tab loses nothing.
 * The series counts distinct dead ends per opening from that date on.
 */
import { fold } from '~/utils/siteNav'

export interface DeadEndReporter {
  /** A new opening of the palette: every query may be reported again. */
  reset(): void
  /** True the first time `q` (folded, spaces collapsed) is seen since the last `reset`. */
  shouldReport(q: string): boolean
}

/** The key two spellings of the same dead end share: case, accents and spacing do not count. */
export const deadEndKey = (q: string): string => fold(q).replace(/\s+/g, ' ')

export function createDeadEndReporter(): DeadEndReporter {
  const seen = new Set<string>()
  return {
    reset: () => seen.clear(),
    shouldReport(q) {
      const key = deadEndKey(q)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    },
  }
}
