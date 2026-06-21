import { describe, it, expect } from 'vitest'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE,
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
