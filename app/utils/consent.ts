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
 * re-applied on every boot (plugins/consent.client.ts).
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

export function parseConsent(raw: string | null | undefined): ConsentDecision | null {
  return raw === 'granted' || raw === 'denied' ? raw : null
}

export function serializeConsent(decision: ConsentDecision): string {
  return decision
}

export function consentSignals(
  decision: ConsentDecision
): Record<ConsentSignalKey, 'granted' | 'denied'> {
  return {
    ad_storage: decision,
    analytics_storage: decision,
    ad_user_data: decision,
    ad_personalization: decision,
  }
}
