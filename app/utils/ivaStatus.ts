// Deterministic resolver for Uruguay's tourist VAT/IVA benefits, used by the
// withdraw-cash page (live "as of today" status) and by the `withdraw:iva-check`
// scheduled task (re-verify watchdog). See [[withdraw-cash-page]].
//
// This module is PURE (no Vue/Nuxt runtime, no global state, relative imports
// only) so it can be unit-tested in plain Node via vitest and imported from both
// a page and a server task.
//
// The benefit is regulation-driven but follows a known calendar, so we encode the
// rules as effective-dated data and DERIVE the current status from the date
// rather than scraping tax law. When the calendar moves past what the encoded
// rules can vouch for (e.g. a new summer-season decree that hasn't been published
// yet), `getReverifyState` flags it so a human confirms the dates and updates
// {@link IVA_RULES} + LAST_RESEARCHED.

import { LAST_RESEARCHED } from './withdrawCash'

/** A confirmed full-exemption summer window (gastronomy + car rental). */
export interface SeasonalWindow {
  /** Inclusive start date, YYYY-MM-DD. */
  start: string
  /** Inclusive end date, YYYY-MM-DD. */
  end: string
  /** Decree that granted it (e.g. '220/025'), for provenance. */
  decree: string
}

/** An effective-dated segment of the year-round base IVA reduction. */
export interface BaseReductionSegment {
  /** Date this point value takes effect, YYYY-MM-DD. */
  from: string
  /** Percentage-point reduction in effect from {@link from}. */
  points: number
}

/**
 * Encoded tourist-IVA rules. UPDATE THIS (and LAST_RESEARCHED in withdrawCash.ts)
 * when a new summer decree is published or the base reduction changes — the
 * watchdog will tell you when.
 *
 * Sources: gub.uy/ministerio-turismo (beneficios-para-no-residentes), DGI
 * (reducción de 9 puntos), Decreto 220/025. As verified June 2026.
 */
export const IVA_RULES = {
  /** Lodging is 0% IVA for non-residents, permanent (year-round). */
  hotelPct: 0,
  /**
   * Year-round base reduction on gastronomy + car rental (electronic payment).
   * 9 points historically; drops to 5 points on 2026-10-01 (DGI). Order matters:
   * the resolver picks the last segment whose `from` is on/before today.
   */
  baseReductionSegments: [
    { from: '2005-01-01', points: 9 },
    { from: '2026-10-01', points: 5 },
  ] as BaseReductionSegment[],
  /**
   * Confirmed summer full-exemption (0%) windows. Add the next one once the
   * annual decree is published (historically ~late October, effective ~Nov 15).
   */
  seasonalWindows: [
    { start: '2025-11-15', end: '2026-04-30', decree: '220/025' },
  ] as SeasonalWindow[],
} as const

/** Resolved tourist-IVA status for a given day. */
export interface IvaStatus {
  /** ISO date the status was resolved for. */
  date: string
  /** Lodging IVA rate (always 0 for non-residents). */
  hotelPct: number
  /** Year-round base reduction in effect (percentage points). */
  baseReductionPoints: number
  /** Whether a summer full-exemption window is active today. */
  seasonalActive: boolean
  /** The active window, if any. */
  seasonalWindow: SeasonalWindow | null
}

/** Watchdog result: whether the encoded rules need human re-verification. */
export interface ReverifyState {
  needsReverify: boolean
  reasons: string[]
}

/** Months after which the facts are considered overdue for re-verification. */
export const STALE_MONTHS = 6

/** Format a Date as a UTC YYYY-MM-DD string (date-only, TZ-stable comparisons). */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Resolve the tourist-IVA status for `today` from {@link IVA_RULES}. Dates are
 * compared as YYYY-MM-DD strings, which order correctly lexicographically.
 */
export function resolveIvaStatus(today: Date): IvaStatus {
  const date = toISODate(today)

  let baseReductionPoints = IVA_RULES.baseReductionSegments[0]?.points ?? 0
  for (const seg of IVA_RULES.baseReductionSegments) {
    if (seg.from <= date) baseReductionPoints = seg.points
  }

  const seasonalWindow =
    IVA_RULES.seasonalWindows.find(w => w.start <= date && date <= w.end) ?? null

  return {
    date,
    hotelPct: IVA_RULES.hotelPct,
    baseReductionPoints,
    seasonalActive: seasonalWindow !== null,
    seasonalWindow,
  }
}

/**
 * The austral summer season is identified by its starting year Y (window runs
 * ~Nov 15 Y → Apr 30 Y+1). Returns the year of the season that should be
 * confirmed/active around `today`, or null in the off-season (May–Sep) when no
 * season is pending. The decree historically lands ~late October, so Oct counts
 * as "should be confirmed soon".
 */
export function pendingSeasonStartYear(today: Date): number | null {
  const month = today.getUTCMonth() + 1 // 1–12
  const year = today.getUTCFullYear()
  if (month >= 10) return year // Oct–Dec: this year's summer
  if (month <= 4) return year - 1 // Jan–Apr: last year's summer, still running
  return null // May–Sep: nothing pending
}

/** Whether a summer window starting in year Y is encoded in the rules. */
function seasonConfirmed(year: number): boolean {
  const prefix = `${year}-11`
  return IVA_RULES.seasonalWindows.some(w => w.start.startsWith(prefix))
}

/** Add whole months to a date (UTC), used for the staleness threshold. */
function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime())
  out.setUTCMonth(out.getUTCMonth() + months)
  return out
}

/**
 * Decide whether the encoded rules need human re-verification as of `today`:
 *  - the pending/active summer season has no confirmed window encoded, or
 *  - the facts are older than {@link STALE_MONTHS} since LAST_RESEARCHED.
 */
export function getReverifyState(today: Date, lastResearched = LAST_RESEARCHED): ReverifyState {
  const reasons: string[] = []

  const seasonYear = pendingSeasonStartYear(today)
  if (seasonYear !== null && !seasonConfirmed(seasonYear)) {
    reasons.push(
      `Summer ${seasonYear}/${seasonYear + 1} full-exemption decree not yet confirmed in IVA_RULES`
    )
  }

  const staleAfter = addMonths(new Date(`${lastResearched}T00:00:00Z`), STALE_MONTHS)
  if (today > staleAfter) {
    reasons.push(`Facts overdue: last verified ${lastResearched} (> ${STALE_MONTHS} months ago)`)
  }

  return { needsReverify: reasons.length > 0, reasons }
}
