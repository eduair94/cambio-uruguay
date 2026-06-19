import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import { quotesForCurrency } from '../../utils/currencyPages'
import { isPublicRate, publicRates } from '../../utils/rateSource'

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
