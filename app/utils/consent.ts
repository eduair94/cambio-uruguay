// Framework-agnostic consent logic. No Nuxt auto-imports here so it stays
// unit-testable under Vitest's node environment.

export const CONSENT_COOKIE_NAME = 'cu_consent'
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365 // 1 year, in seconds

export type ConsentDecision = 'granted' | 'denied'

type ConsentSignalKey =
  | 'ad_storage'
  | 'analytics_storage'
  | 'ad_user_data'
  | 'ad_personalization'

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
