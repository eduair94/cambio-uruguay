import { describe, it, expect } from 'vitest'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE,
  CONSENT_STRICT_REGIONS,
  parseConsent,
  serializeConsent,
  consentSignals,
} from '../../utils/consent'

describe('consent core', () => {
  it('exposes the cookie name and a ~1y max-age', () => {
    expect(CONSENT_COOKIE_NAME).toBe('cu_consent')
    expect(CONSENT_MAX_AGE).toBe(60 * 60 * 24 * 365)
  })

  it('parses only the two valid decisions, else null', () => {
    expect(parseConsent('granted')).toBe('granted')
    expect(parseConsent('denied')).toBe('denied')
    expect(parseConsent('')).toBeNull()
    expect(parseConsent(undefined)).toBeNull()
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent('GRANTED')).toBeNull()
    expect(parseConsent('yes')).toBeNull()
  })

  it('round-trips serialize/parse', () => {
    expect(parseConsent(serializeConsent('granted'))).toBe('granted')
    expect(parseConsent(serializeConsent('denied'))).toBe('denied')
  })

  it('maps granted to all-granted signals', () => {
    expect(consentSignals('granted')).toEqual({
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
  })

  it('maps denied to all-denied signals', () => {
    expect(consentSignals('denied')).toEqual({
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  })
})

// The consent defaults are region-scoped (nuxt.config.ts): denied where Google's EU user consent
// policy requires it, granted elsewhere. Getting this list wrong is not a visible bug — it is
// either a compliance problem in Europe or three quarters of the traffic going unmeasured at home.
describe('strict consent regions', () => {
  it('covers the EEA, the UK and Switzerland', () => {
    for (const code of [
      'DE',
      'FR',
      'ES',
      'IT',
      'NL',
      'PL',
      'SE',
      'IE',
      'NO',
      'IS',
      'LI',
      'GB',
      'CH',
    ]) {
      expect(CONSENT_STRICT_REGIONS).toContain(code)
    }
    // 27 EU + 3 EEA + UK + CH.
    expect(CONSENT_STRICT_REGIONS).toHaveLength(32)
  })

  it('does not cover the markets this site actually serves', () => {
    // 96 % of impressions are Uruguayan; these are the ones the strict default was silently costing.
    for (const code of ['UY', 'AR', 'BR', 'US', 'CL', 'PY', 'BO', 'MX', 'CO']) {
      expect(CONSENT_STRICT_REGIONS).not.toContain(code)
    }
  })

  it('is uppercase ISO-3166 alpha-2 with no duplicates', () => {
    for (const code of CONSENT_STRICT_REGIONS) expect(code).toMatch(/^[A-Z]{2}$/)
    expect(new Set(CONSENT_STRICT_REGIONS).size).toBe(CONSENT_STRICT_REGIONS.length)
  })
})
