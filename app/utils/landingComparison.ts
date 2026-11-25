// A tab that STARTS on a comparison with a listing already picked.
//
// A person reaches `/autos-usados-uruguay/comparar?autos=<listing>` by tapping "Comparar este
// auto" on a card, inside the site: the tab started on another page, and since #415 that button
// has no href at all. A tab that starts there is a shared link (rare) or the farm that walked one
// such URL per listing and per locale. Clarity, 23–25/11/2026: 342 of 1.196 sessions without bot
// flag, one page, zero taps, 100 % bounce, each after solving Cloudflare's managed challenge. GA4
// had the same farm at 39 % of the site's views on 22/11.
//
// Two consumers, one rule:
//   - Clarity does not record the tab (utils/clarityPolicy.ts → clarityLandingAllowed), so the
//     frustration signals are about people;
//   - AdSense does not load while the tab is still on that comparator (composables/useAds.ts):
//     an impression served to the farm is invalid traffic on the site's own account, and the
//     page carries a unit. Once the tab moves to another page the usual table applies.
//
// PURE except `tabLandingUrl`, which reads the browser and answers '' on the server.

import { normalizeAdPath } from './ads'

/** The comparators that take a listing in the query, with the parameter that carries it. */
export const PRESELECTED_COMPARISONS: ReadonlyArray<readonly [path: string, param: string]> =
  Object.freeze([
    ['/autos-usados-uruguay/comparar', 'autos'],
    ['/motos-usadas-uruguay/comparar', 'motos'],
  ])

/**
 * The comparator (without locale prefix) that `url` opens with a listing already picked, or null.
 * An empty comparator, an empty parameter, a listing and every other page are null.
 */
export function landedComparisonPath(url: unknown): string | null {
  if (typeof url !== 'string' || !url) return null
  let parsed: URL
  try {
    parsed = new URL(url, 'https://cambio-uruguay.com')
  } catch {
    return null
  }
  const clean = normalizeAdPath(parsed.pathname)
  const hit = PRESELECTED_COMPARISONS.find(
    ([path, param]) => clean === path && (parsed.searchParams.get(param) ?? '').trim() !== ''
  )
  return hit ? hit[0] : null
}

/**
 * Whether the ads wait: the tab landed on a picked comparison (`landedPath`, from
 * `landedComparisonPath`) and is still on that comparator, in any locale and with any listing.
 * Anywhere else the route table decides as usual.
 */
export function adsHeldByLanding(
  landedPath: string | null | undefined,
  currentPath: string
): boolean {
  if (!landedPath) return false
  return normalizeAdPath(currentPath) === landedPath
}

/**
 * The URL this document was loaded at, not the current one: whoever asks may run after hydration,
 * when the visitor may already have moved on inside the app.
 */
export function tabLandingUrl(): string {
  if (typeof window === 'undefined') return ''
  try {
    const entry = performance.getEntriesByType('navigation')[0]
    if (entry && typeof entry.name === 'string' && entry.name) return entry.name
  } catch {
    // No Navigation Timing: the current address is the best guess.
  }
  return window.location.href
}
