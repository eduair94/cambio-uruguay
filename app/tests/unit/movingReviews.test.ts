import { describe, expect, it } from 'vitest'
import {
  isLiveMovingReviewProfile,
  parseMovingGoogleReview,
  safeMovingGoogleProfileUrl,
  type MovingReviewProfile,
} from '../../utils/movingReviews'

const profile: MovingReviewProfile = {
  key: 'furniture-home-montevideo',
  providerId: 'furniture-home',
  platform: 'google',
  status: 'verified',
  placeId: 'ChIJeYROI42Bn5URoe_mE46JM0c',
  profileUrl: 'https://g.page/r/CaHv5hOOiTNHEBM/review',
  label: 'Montevideo',
  expectedNames: ['Furniture Home', 'Furniture Home S.T.'],
  expectedCountryCode: 'UY',
  expectedPhoneNumbers: ['+59895123456'],
}
const checkedAt = '2026-09-14T12:00:00.000Z'
const payload = (values: Record<string, unknown> = {}) => ({
  status: 'OK',
  html_attributions: [],
  result: {
    place_id: profile.placeId,
    name: 'Furniture Home — Armado de Muebles Montevideo',
    address_components: [{ short_name: 'UY', types: ['country', 'political'] }],
    international_phone_number: '+598 95 123 456',
    rating: 4.6,
    user_ratings_total: 30,
    ...values,
  },
})

describe('moving review identity and minimal projection', () => {
  it('returns only aggregate data for the exact reviewed profile', () => {
    const result = parseMovingGoogleReview(
      payload({
        reviews: [{ author_name: 'Private reviewer', text: 'Do not republish' }],
        url: 'https://attacker.invalid/redirect',
        website: 'https://private.invalid/',
      }),
      profile,
      checkedAt
    )
    expect(result).toEqual({
      providerId: 'furniture-home',
      profileKey: profile.key,
      platform: 'google',
      status: 'ok',
      rating: 4.6,
      count: 30,
      profileUrl: profile.profileUrl,
      profileLabel: 'Montevideo',
      checkedAt,
      attributions: [],
    })
    expect(JSON.stringify(result)).not.toMatch(/Private reviewer|Do not republish|attacker|private/)
  })

  it.each(['ChIJ_another_business_12345', undefined])(
    'vetoes a different or missing ID: %s',
    place_id => {
      expect(parseMovingGoogleReview(payload({ place_id }), profile, checkedAt).status).toBe(
        'identity_mismatch'
      )
    }
  )

  it('vetoes the wrong business even with an exact pin and phone', () => {
    const result = parseMovingGoogleReview(payload({ name: 'Joy of Cleaning' }), profile, checkedAt)
    expect(result.status).toBe('identity_mismatch')
    expect(result.rating).toBeNull()
  })

  it('matches configured brand aliases and punctuation without fuzzy word overlap', () => {
    expect(
      parseMovingGoogleReview(payload({ name: 'FÚRNITURE HOME S.T.' }), profile, checkedAt).status
    ).toBe('ok')
    expect(
      parseMovingGoogleReview(
        payload({ name: 'Furniture Services for your Home' }),
        profile,
        checkedAt
      ).status
    ).toBe('identity_mismatch')
  })

  it('vetoes a country contradiction despite the same name and contact', () => {
    const result = parseMovingGoogleReview(
      payload({ address_components: [{ short_name: 'US', types: ['country'] }] }),
      profile,
      checkedAt
    )
    expect(result.status).toBe('identity_mismatch')
  })

  it('accepts a distinctive single-word brand with a branch label, not a generic service word', () => {
    expect(
      parseMovingGoogleReview(
        payload({ name: 'SelfBox Aguada' }),
        { ...profile, expectedNames: ['SelfBox'] },
        checkedAt
      ).status
    ).toBe('ok')
    expect(
      parseMovingGoogleReview(
        payload({ name: 'Naterial La Barra' }),
        { ...profile, expectedNames: ['Naterial'] },
        checkedAt
      ).status
    ).toBe('ok')
    expect(
      parseMovingGoogleReview(
        payload({ name: 'Fletes Otra Empresa' }),
        { ...profile, expectedNames: ['Fletes'] },
        checkedAt
      ).status
    ).toBe('identity_mismatch')
  })

  it('vetoes a contradictory contact and normalizes Uruguayan local numbers', () => {
    expect(
      parseMovingGoogleReview(
        payload({ international_phone_number: '+59899999999' }),
        profile,
        checkedAt
      ).status
    ).toBe('identity_mismatch')
    expect(
      parseMovingGoogleReview(
        payload({ international_phone_number: undefined, formatted_phone_number: '095 123 456' }),
        profile,
        checkedAt
      ).status
    ).toBe('ok')
    expect(
      parseMovingGoogleReview(
        payload({ international_phone_number: undefined, formatted_phone_number: '2400 0000' }),
        { ...profile, expectedPhoneNumbers: ['+59824000000'] },
        checkedAt
      ).status
    ).toBe('ok')
  })

  it('uses the pinned identity and name when optional country/contact fields are absent', () => {
    expect(
      parseMovingGoogleReview(
        payload({ address_components: undefined, international_phone_number: undefined }),
        profile,
        checkedAt
      ).status
    ).toBe('ok')
  })

  it.each(['ambiguous', 'rejected'] as const)('never uses a %s profile', status => {
    expect(isLiveMovingReviewProfile({ ...profile, status })).toBe(false)
    expect(parseMovingGoogleReview(payload(), { ...profile, status }, checkedAt).status).toBe(
      'unknown_profile'
    )
  })

  it('treats zero reviews as no reviews, not a zero-star score', () => {
    const result = parseMovingGoogleReview(
      payload({ rating: undefined, user_ratings_total: 0 }),
      profile,
      checkedAt
    )
    expect(result).toMatchObject({ status: 'no_reviews', rating: null, count: 0 })
  })

  it.each([
    { rating: NaN },
    { rating: Infinity },
    { rating: 0 },
    { rating: 5.1 },
    { rating: '4.6' },
    { rating: undefined },
    { user_ratings_total: 2.5 },
    { user_ratings_total: -1 },
    { user_ratings_total: Infinity },
    { user_ratings_total: Number.MAX_SAFE_INTEGER + 1 },
    { user_ratings_total: '30' },
  ])('rejects invalid metrics %j without exposing a rating', values => {
    expect(parseMovingGoogleReview(payload(values), profile, checkedAt)).toMatchObject({
      status: 'unavailable',
      rating: null,
      count: null,
    })
  })

  it.each([null, {}, [], { status: 'REQUEST_DENIED', error_message: 'private-key' }])(
    'sanitizes unavailable payload %j',
    value => {
      const result = parseMovingGoogleReview(value, profile, checkedAt)
      expect(result.status).toBe('unavailable')
      expect(JSON.stringify(result)).not.toContain('private-key')
    }
  )

  it('preserves attribution text and safe links without exposing HTML', () => {
    const value = payload()
    value.html_attributions = [
      'Copyright <a href="https://example.org/source?a=1&amp;b=2">A &amp; B</a>',
      '<a href="javascript:alert(1)">Unsafe link</a><script>runBadCode()</script>',
      '<img src=x onerror=runBadCode()>Plain provider',
    ] as never[]
    const result = parseMovingGoogleReview(value, profile, checkedAt)
    expect(result.attributions).toEqual([
      { displayName: 'Copyright A & B', uri: 'https://example.org/source?a=1&b=2' },
      { displayName: 'Unsafe link', uri: null },
      { displayName: 'Plain provider', uri: null },
    ])
    expect(JSON.stringify(result.attributions)).not.toMatch(/javascript:|<a|onerror|runBadCode/)
  })

  it('rejects unsafe and unrelated profile URLs', () => {
    for (const url of [
      'javascript:alert(1)',
      'https://google.com.attacker.invalid/maps/x',
      'https://www.google.com/accounts',
      'https://user:password@maps.google.com/',
      'http://maps.google.com/',
    ])
      expect(safeMovingGoogleProfileUrl(url)).toBeNull()
    expect(safeMovingGoogleProfileUrl(profile.profileUrl)).toBe(profile.profileUrl)
  })
})
