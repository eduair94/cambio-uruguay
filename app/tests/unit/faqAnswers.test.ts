import { describe, expect, it } from 'vitest'
import { buildFaqItems, currencyFaqIds, HOME_FAQ_IDS } from '../../utils/faqAnswers'
import type { ExchangeRate } from '../../types/api'

const today = new Date('2026-06-16T12:00:00Z')

// Plain (type='') USD quotes from 3 houses + one bcu/interbank row that must be ignored.
const rates: ExchangeRate[] = [
  {
    origin: 'houseA',
    date: '2026-06-16',
    type: '',
    code: 'USD',
    name: 'House A',
    buy: 40,
    sell: 42,
  },
  {
    origin: 'houseB',
    date: '2026-06-16',
    type: '',
    code: 'USD',
    name: 'House B',
    buy: 41,
    sell: 43,
  },
  {
    origin: 'houseC',
    date: '2026-06-16',
    type: '',
    code: 'USD',
    name: 'House C',
    buy: 39,
    sell: 41,
  },
  {
    origin: 'bcu',
    date: '2026-06-16',
    type: 'INTERBANCARIO',
    code: 'USD',
    name: 'BCU',
    buy: 41,
    sell: 41.2,
  },
  {
    origin: 'houseA',
    date: '2026-06-16',
    type: '',
    code: 'EUR',
    name: 'House A',
    buy: 44,
    sell: 46,
  },
]

describe('buildFaqItems', () => {
  it('builds a USD "today" answer from min sell / max buy of plain quotes only', () => {
    const items = buildFaqItems(rates, 'es', { today })
    const rate = items.find(i => i.id === 'rate-USD')!
    expect(rate).toBeTruthy()
    // min sell 41 (houseC), max buy 41 (houseB); bcu/interbank excluded
    expect(rate.answer).toContain('41.00')
    expect(rate.answer).not.toContain('41.20') // interbank sell must not leak
    expect(rate.question.toLowerCase()).toContain('dólar')
  })

  it('recommends the cheapest house to BUY USD (lowest sell)', () => {
    const items = buildFaqItems(rates, 'es', { today })
    const buy = items.find(i => i.id === 'buy-USD')!
    expect(buy.answer).toContain('House C') // lowest sell 41
    expect(buy.answer).toContain('41.00')
  })

  it('recommends the house that pays most to SELL USD (highest buy)', () => {
    const items = buildFaqItems(rates, 'es', { today })
    const sell = items.find(i => i.id === 'sell-USD')!
    expect(sell.answer).toContain('House B') // highest buy 41
  })

  it('always includes evergreen items even with empty rates', () => {
    const items = buildFaqItems([], 'es', { today })
    const ids = items.map(i => i.id)
    expect(ids).toContain('types')
    expect(ids).toContain('update-freq')
    expect(ids).toContain('data-source')
    expect(ids).toContain('how-choose')
    // No live items when there is no data (fail-graceful)
    expect(ids).not.toContain('rate-USD')
  })

  it('emits one item per locale with non-empty question and answer', () => {
    for (const lang of ['es', 'en', 'pt'] as const) {
      const items = buildFaqItems(rates, lang, { today })
      expect(items.length).toBeGreaterThan(0)
      for (const it of items) {
        expect(it.question.length).toBeGreaterThan(3)
        expect(it.answer.length).toBeGreaterThan(3)
      }
    }
  })

  it('exposes stable id helpers', () => {
    expect(HOME_FAQ_IDS).toEqual(['rate-USD', 'buy-USD', 'sell-USD'])
    expect(currencyFaqIds('EUR')).toEqual(['rate-EUR', 'buy-EUR', 'sell-EUR'])
  })
})
