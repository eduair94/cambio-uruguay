import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import { quotesForCurrency } from '../../utils/currencyPages'
import {
  isPublicRate,
  originHeadlineRates,
  pickOriginRate,
  publicRates,
} from '../../utils/rateSource'

// Helper to build a minimal valid quote row.
const row = (over: Partial<ExchangeRate>): ExchangeRate => ({
  origin: 'itau',
  date: '2026-06-18',
  type: '',
  code: 'USD',
  name: 'Dólar',
  buy: 40,
  sell: 41,
  ...over,
})

describe('isPublicRate', () => {
  it('keeps a plain casa de cambio quote', () => {
    expect(isPublicRate(row({ origin: 'itau', type: '' }))).toBe(true)
  })

  it('keeps BILLETE (cash) quotes', () => {
    expect(isPublicRate(row({ origin: 'brou', type: 'BILLETE' }))).toBe(true)
  })

  it('keeps eBROU (public electronic) quotes', () => {
    expect(isPublicRate(row({ origin: 'brou', type: 'EBROU' }))).toBe(true)
  })

  it('drops the BCU official reference regardless of type', () => {
    expect(isPublicRate(row({ origin: 'bcu', type: '' }))).toBe(false)
    expect(isPublicRate(row({ origin: 'bcu', type: 'BILLETE' }))).toBe(false)
  })

  it('drops the interbancario wholesale quote', () => {
    expect(isPublicRate(row({ origin: 'itau', type: 'INTERBANCARIO' }))).toBe(false)
  })

  it('drops the fondo (PROMED.FONDO) and cable wholesale quotes', () => {
    expect(isPublicRate(row({ type: 'PROMED.FONDO' }))).toBe(false)
    expect(isPublicRate(row({ type: 'CABLE' }))).toBe(false)
  })
})

describe('publicRates', () => {
  it('filters a mixed list down to public-obtainable quotes', () => {
    const rows = [
      row({ origin: 'itau', type: '' }),
      row({ origin: 'bcu', type: '' }),
      row({ origin: 'itau', type: 'INTERBANCARIO' }),
      row({ origin: 'brou', type: 'BILLETE' }),
      row({ origin: 'someone', type: 'CABLE' }),
    ]
    const out = publicRates(rows)
    expect(out.map(r => r.origin)).toEqual(['itau', 'brou'])
  })
})

describe('pickOriginRate', () => {
  // The rows below mirror the real /api payload on 2026-07-10: the array is not
  // grouped by origin, so a filter that forgets `origin` silently returns the
  // first USD row in the whole market (baluma_cambio, 37,15/39,55) — the number
  // that was being stamped onto all ~40 casa meta descriptions.
  const market = [
    row({ origin: 'baluma_cambio', type: '', buy: 37.15, sell: 39.55 }),
    row({ origin: 'la_favorita', type: 'INTERBANCARIO', buy: 39.741, sell: 39.741 }),
    row({ origin: 'la_favorita', type: '', buy: 38.55, sell: 40.95 }),
    row({ origin: 'brou', type: 'EBROU', buy: 39.5, sell: 40.9 }),
    row({ origin: 'brou', type: '', buy: 39, sell: 41.4 }),
    row({ origin: 'itau', type: '', buy: 38.9, sell: 41.5 }),
    row({ origin: 'bcu', code: 'UI', type: '', buy: 6.6126, sell: 6.6126 }),
  ]

  it('returns the requested origin, not the first row in the market', () => {
    expect(pickOriginRate(market, 'itau')).toMatchObject({ buy: 38.9, sell: 41.5 })
    expect(pickOriginRate(market, 'brou')?.buy).not.toBe(37.15)
  })

  it('gives each origin a distinct quote', () => {
    const seen = ['baluma_cambio', 'la_favorita', 'brou', 'itau'].map(
      o => `${pickOriginRate(market, o)?.buy}/${pickOriginRate(market, o)?.sell}`
    )
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('prefers the plain cash quote over a conditional one (BROU: plain, not EBROU)', () => {
    expect(pickOriginRate(market, 'brou')).toMatchObject({ type: '', buy: 39, sell: 41.4 })
  })

  it('never quotes a wholesale INTERBANCARIO row as the public price', () => {
    // la_favorita lists INTERBANCARIO *before* its plain row in the payload.
    expect(pickOriginRate(market, 'la_favorita')).toMatchObject({ type: '', buy: 38.55 })
  })

  it('returns null when the origin publishes no quote for the currency (BCU has no USD)', () => {
    expect(pickOriginRate(market, 'bcu')).toBeNull()
  })

  it('returns null for an unknown origin and skips non-positive rates', () => {
    expect(pickOriginRate(market, 'no_such_casa')).toBeNull()
    expect(pickOriginRate([row({ origin: 'x', buy: 0, sell: 41 })], 'x')).toBeNull()
  })

  it('supports currencies other than the USD default', () => {
    expect(pickOriginRate(market, 'bcu', 'UI')).toMatchObject({ buy: 6.6126 })
  })
})

describe('best public rate (integration with quotesForCurrency)', () => {
  // BCU shows a tighter, "better looking" sell than every casa — it must never
  // win the headline / converter price because nobody can transact at it.
  it('never picks the BCU row as the best sell on the home price', () => {
    const rows = [
      row({ origin: 'bcu', type: '', buy: 40.9, sell: 40.95 }), // best-looking, must be excluded
      row({ origin: 'itau', type: '', buy: 39.5, sell: 41.5 }),
      row({ origin: 'brou', type: '', buy: 40.0, sell: 41.0 }), // real best sell
    ]
    const quotes = quotesForCurrency(publicRates(rows), 'USD')
    const best = quotes.find(q => q.bestSell)
    expect(best?.origin).toBe('brou')
    expect(quotes.some(q => q.origin === 'bcu')).toBe(false)
  })
})

describe('originHeadlineRates', () => {
  // What an origin's SERP snippet may lead with. The rule that matters: it must
  // describe THAT origin with real numbers, or return nothing at all.
  it('leads with the dollar when the origin quotes one', () => {
    const rows = [
      row({ origin: 'brou', code: 'USD', buy: 39.1, sell: 41.6 }),
      row({ origin: 'brou', code: 'EUR', buy: 44, sell: 48 }),
    ]
    const out = originHeadlineRates(rows, 'brou')
    expect(out[0]).toMatchObject({ code: 'USD' })
  })

  it('falls back to what the origin DOES publish (BCU: UI/UR, no USD)', () => {
    // The whole point: /historico/bcu had no number in its description because
    // BCU quotes no dollar, and it is the biggest page of its kind on the site.
    const rows = [
      row({ origin: 'bcu', code: 'UI', buy: 6.6347, sell: 6.6347 }),
      row({ origin: 'bcu', code: 'UR', buy: 1923.44, sell: 1923.44 }),
      row({ origin: 'bcu', code: 'UP', buy: 1.79349, sell: 1.79349 }),
    ]
    const out = originHeadlineRates(rows, 'bcu')
    expect(out).toHaveLength(2)
    expect(out.map(r => r.code)).toEqual(['UI', 'UR'])
  })

  it("never quotes another origin's rate", () => {
    const rows = [
      row({ origin: 'brou', code: 'USD', buy: 39.1, sell: 41.6 }),
      row({ origin: 'bcu', code: 'UI', buy: 6.6347, sell: 6.6347 }),
    ]
    expect(originHeadlineRates(rows, 'bcu').every(r => r.origin === 'bcu')).toBe(true)
  })

  it('returns nothing when the origin publishes nothing usable, so prose stays', () => {
    expect(originHeadlineRates([], 'bcu')).toEqual([])
    expect(originHeadlineRates([row({ origin: 'x', code: 'USD', buy: 0, sell: 0 })], 'x')).toEqual(
      []
    )
  })

  it('honours the limit', () => {
    const rows = [
      row({ origin: 'bcu', code: 'UI', buy: 6.6, sell: 6.6 }),
      row({ origin: 'bcu', code: 'UR', buy: 1923, sell: 1923 }),
    ]
    expect(originHeadlineRates(rows, 'bcu', 1)).toHaveLength(1)
  })

  it('skips wholesale types nobody can transact at', () => {
    const rows = [
      row({ origin: 'itau', code: 'USD', type: 'INTERBANCARIO', buy: 40, sell: 40.1 }),
      row({ origin: 'itau', code: 'EUR', buy: 44, sell: 48 }),
    ]
    expect(originHeadlineRates(rows, 'itau').map(r => r.code)).toEqual(['EUR'])
  })
})
