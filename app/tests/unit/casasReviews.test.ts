import { describe, expect, it } from 'vitest'
import {
  CASAS_PLACE_IDS,
  CASAS_TRUSTPILOT_DOMAINS,
  parsePlaceDetails,
  parseTrustpilotFeedbacks,
  shouldAcceptReview,
  type FetchedReview,
  type StoredCasaReview,
} from '../../utils/casasReviews'
import { CASAS_REPUTATION } from '../../utils/casasDirectory'

const fetched = (rating: number, count: number): FetchedReview => ({
  placeId: 'pid',
  name: 'Cambio X',
  rating,
  count,
  url: 'https://maps.google.com/?cid=1',
})

const stored = (rating: number, count: number): StoredCasaReview => ({
  rating,
  count,
  placeId: 'pid',
  name: 'Cambio X',
  url: 'https://maps.google.com/?cid=1',
  checkedAt: '2026-07-04T00:00:00Z',
})

describe('shouldAcceptReview', () => {
  it('accepts a plausible first result', () => {
    expect(shouldAcceptReview(null, fetched(4.2, 37))).toBe(true)
  })

  it('rejects out-of-range ratings and empty counts', () => {
    expect(shouldAcceptReview(null, fetched(0.5, 10))).toBe(false)
    expect(shouldAcceptReview(null, fetched(5.5, 10))).toBe(false)
    expect(shouldAcceptReview(null, fetched(4.0, 0))).toBe(false)
  })

  it('rejects a review-count collapse (likely a different listing)', () => {
    expect(shouldAcceptReview(stored(4.1, 300), fetched(4.5, 12))).toBe(false)
  })

  it('rejects a wild rating jump vs the previous value', () => {
    expect(shouldAcceptReview(stored(2.0, 40), fetched(4.9, 45))).toBe(false)
  })

  it('accepts normal drift', () => {
    expect(shouldAcceptReview(stored(4.1, 300), fetched(4.0, 315))).toBe(true)
  })
})

describe('parsePlaceDetails', () => {
  it('extracts details result incl. maps url (real proxy shape)', () => {
    const out = parsePlaceDetails({
      status: 'OK',
      result: {
        place_id: 'ChIJAdv_XBmBn5URwc7y91u2H9E',
        name: 'GALES Servicios Financieros',
        rating: 4,
        user_ratings_total: 47,
        url: 'https://maps.google.com/?cid=15068963384323133121',
      },
    })
    expect(out).toEqual({
      placeId: 'ChIJAdv_XBmBn5URwc7y91u2H9E',
      name: 'GALES Servicios Financieros',
      rating: 4,
      count: 47,
      url: 'https://maps.google.com/?cid=15068963384323133121',
    })
  })

  it('returns null on non-OK status, missing result, or no rating', () => {
    expect(parsePlaceDetails({ status: 'NOT_FOUND' })).toBeNull()
    expect(parsePlaceDetails({})).toBeNull()
    expect(parsePlaceDetails({ status: 'OK', result: { name: 'X' } })).toBeNull()
  })
})

describe('parseTrustpilotFeedbacks', () => {
  // Real /trustpilot/feedbacks shape (verified live against the scraper for
  // prexcard.com): the numbers live under `businessUnit`.
  it('reads trustScore + numberOfReviews from businessUnit', () => {
    const out = parseTrustpilotFeedbacks({
      domain: 'prexcard.com',
      businessUnit: {
        displayName: 'Prex Uruguay',
        numberOfReviews: 70,
        trustScore: 1.9,
        stars: 2,
      },
    })
    expect(out).toEqual({ score: 1.9, count: 70 })
  })

  it('tolerates a flat payload as a fallback', () => {
    expect(parseTrustpilotFeedbacks({ trustScore: 4.2, numberOfReviews: 30 })).toEqual({
      score: 4.2,
      count: 30,
    })
  })

  it('rejects implausible or missing data', () => {
    expect(parseTrustpilotFeedbacks({ businessUnit: { numberOfReviews: 70 } })).toBeNull()
    expect(
      parseTrustpilotFeedbacks({ businessUnit: { trustScore: 0.4, numberOfReviews: 5 } })
    ).toBeNull()
    expect(
      parseTrustpilotFeedbacks({ businessUnit: { trustScore: 4, numberOfReviews: 0 } })
    ).toBeNull()
    expect(parseTrustpilotFeedbacks(null)).toBeNull()
  })
})

describe('refresh seed maps', () => {
  it('pins place_ids only for real reputation entries, as valid ids', () => {
    const codes = new Set(CASAS_REPUTATION.map(c => c.code))
    const ids = Object.entries(CASAS_PLACE_IDS)
    expect(ids.length).toBeGreaterThan(25)
    for (const [code, id] of ids) {
      expect(codes.has(code), `unknown casa code ${code}`).toBe(true)
      // Google place_ids look like ChIJ… (base64-ish, no spaces).
      expect(id).toMatch(/^[\w-]{20,}$/)
    }
  })

  it('excludes casas whose listing resolves to a different business', () => {
    // Cambio Argentino + Rynder both resolve to Cambio 18's listing; Openn to an
    // unrelated Redpagos. They must stay "sin datos" (no pinned id).
    for (const code of ['cambio_argentino', 'cambio_rynder', 'cambio_openn']) {
      expect(CASAS_PLACE_IDS[code]).toBeUndefined()
    }
  })

  it('trustpilot domains are bare hostnames', () => {
    for (const d of Object.values(CASAS_TRUSTPILOT_DOMAINS)) {
      expect(d).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/)
    }
  })
})
