// Framework-agnostic consent logic. No Nuxt auto-imports here so it stays
// unit-testable under Vitest's node environment.

export const CONSENT_COOKIE_NAME = 'cu_consent'
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365 // 1 year, in seconds

export type ConsentDecision = 'granted' | 'denied'

/**
 * Where the strict, deny-by-default consent regime applies: the EEA, the United Kingdom and
 * Switzerland. Google's EU user consent policy makes prior consent mandatory for these visitors, and
 * `gtag('consent','default',{ region: [...] })` is the mechanism it provides to scope it.
 *
 * WHY THIS LIST EXISTS AT ALL. Denying by default everywhere sounds like the safe choice and is not
 * a free one. Measured 2026-09-01 over the same 28 days: Search Console counted 2.475 organic
 * clicks, GA4's Organic Search channel counted 621 sessions. GA4 was seeing a quarter of the site,
 * because a visitor who never touches the banner is never recorded, and Google's behavioural
 * modelling — which is what fills that hole for big properties — needs thousands of daily events in
 * each consent state for seven consecutive days, a bar this site does not come close to. The same
 * default also served non-personalised ads to ~90 % of visitors, at non-personalised rates.
 *
 * So the regime is scoped to where it is legally required. 96 % of this site's traffic is Uruguayan
 * (490.537 of 542.854 impressions), and Uruguay's Ley 18.331 does not impose the European
 * prior-opt-in model; the banner still offers a real, immediate opt-out, and a stored rejection is
 * re-applied on every boot, ahead of the first hit (plugins/consent.client.ts, insertStoredConsent).
 */
export const CONSENT_STRICT_REGIONS: readonly string[] = Object.freeze([
  // EU 27
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  // Rest of the EEA
  'IS',
  'LI',
  'NO',
  // United Kingdom and Switzerland
  'GB',
  'CH',
])

type ConsentSignalKey = 'ad_storage' | 'analytics_storage' | 'ad_user_data' | 'ad_personalization'
export type ConsentSignals = Record<ConsentSignalKey, 'granted' | 'denied'>

export function parseConsent(raw: string | null | undefined): ConsentDecision | null {
  return raw === 'granted' || raw === 'denied' ? raw : null
}

export function serializeConsent(decision: ConsentDecision): string {
  return decision
}

export function consentSignals(decision: ConsentDecision): ConsentSignals {
  return {
    ad_storage: decision,
    analytics_storage: decision,
    ad_user_data: decision,
    ad_personalization: decision,
  }
}

/**
 * A gtag command exactly as `gtag()` queues it: the call's own `arguments` object. gtag.js only
 * executes queue entries that ARE an Arguments object (it checks `[object Arguments]`); a plain
 * array in the data layer is a different, Tag Manager command and would be ignored as consent.
 */
function gtagCommand(..._command: unknown[]): IArguments {
  // eslint-disable-next-line prefer-rest-params -- the Arguments object itself is the contract
  return arguments
}

/** A queued gtag call named `name`; Tag Manager objects and arrays in the same queue are not. */
const isCommand = (entry: unknown, name: string): boolean =>
  Object.prototype.toString.call(entry) === '[object Arguments]' &&
  (entry as ArrayLike<unknown>)[0] === name

/**
 * Puts a STORED decision into gtag's queue ahead of the first hit, or says it can't.
 *
 * nuxt-gtag queues `consent default` ×2, `js` and the two `config` commands at boot, and gtag.js
 * runs that queue in order when it arrives. `gtag('consent','update')` called at boot lands AFTER
 * the `config` commands, so the first page_view went out with the region default: measured
 * 2026-11-08 with `cu_consent=denied`, the first analytics.google.com/g/collect carried
 * gcs=G111 (both granted) on every page load and `_ga` was written again each time. The update
 * belongs right before `js` — after the defaults it overrides, before anything that measures.
 *
 * Only while gtag.js has not taken the queue over: once loaded it replaces `dataLayer.push` with
 * its own processor, and splicing into an array it has already read would do nothing. Then this
 * returns false and the caller must fall back to `gtag('consent','update', …)`. Without a `js`
 * entry (nuxt-gtag has not queued its commands yet) the update is appended: it still wins, since
 * gtag.js lets an update outrank a default whatever order they arrive in.
 */
export function insertStoredConsent(dataLayer: unknown, signals: ConsentSignals): boolean {
  if (!Array.isArray(dataLayer) || dataLayer.push !== Array.prototype.push) return false
  const command = gtagCommand('consent', 'update', { ...signals })
  const js = dataLayer.findIndex(entry => isCommand(entry, 'js'))
  if (js === -1) dataLayer.push(command)
  else dataLayer.splice(js, 0, command)
  return true
}
