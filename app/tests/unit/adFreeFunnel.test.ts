import { describe, expect, it } from 'vitest'
import {
  AD_FREE_ITEM_ID,
  AD_FREE_PROMOTION,
  adFreeItems,
  monthlyEquivalent,
  nudgeVariant,
  promotionParams,
} from '../../utils/adFreeFunnel'

const DAY = 86_400_000
const now = Date.parse('2026-11-23T12:00:00Z')

describe('nudgeVariant', () => {
  const base = { pageViews: 5, dismissedAt: null, cardShownThisSession: false, now }

  it('shows the card to a reader who already saw ads on a few pages', () => {
    expect(nudgeVariant(base)).toBe('card')
    expect(nudgeVariant({ ...base, pageViews: 3 })).toBe('card')
  })

  it('keeps a first or second page to the quiet link', () => {
    expect(nudgeVariant({ ...base, pageViews: 1 })).toBe('link')
    expect(nudgeVariant({ ...base, pageViews: 2 })).toBe('link')
  })

  it('shows the card once per session', () => {
    expect(nudgeVariant({ ...base, cardShownThisSession: true })).toBe('link')
  })

  it('respects a dismissal for thirty days, then asks again', () => {
    expect(nudgeVariant({ ...base, dismissedAt: now - 29 * DAY })).toBe('link')
    expect(nudgeVariant({ ...base, dismissedAt: now - 31 * DAY })).toBe('card')
  })

  it('ignores an unreadable dismissal date', () => {
    expect(nudgeVariant({ ...base, dismissedAt: Number.NaN })).toBe('card')
  })
})

describe('monthlyEquivalent', () => {
  it('spreads the twelve months, rounding pesos to whole pesos', () => {
    expect(monthlyEquivalent(400, 'UYU')).toBe('$ 33')
    expect(monthlyEquivalent(200, 'UYU')).toBe('$ 17')
  })

  it('keeps cents for dollars', () => {
    expect(monthlyEquivalent(10, 'USD')).toBe('US$ 0,83')
    expect(monthlyEquivalent(12, 'USD')).toBe('US$ 1')
  })
})

describe('GA4 ecommerce payload', () => {
  it('describes the twelve months as one item with its price', () => {
    expect(adFreeItems(400, 'UYU')).toEqual([
      {
        item_id: AD_FREE_ITEM_ID,
        item_name: 'Navegá sin anuncios (12 meses)',
        item_category: 'aporte',
        price: 400,
        quantity: 1,
      },
    ])
  })

  it('names the promotion and where it was shown, never with campaign fields', () => {
    const params = promotionParams('content-end')
    expect(params).toEqual({
      promotion_id: AD_FREE_PROMOTION.id,
      promotion_name: AD_FREE_PROMOTION.name,
      creative_slot: 'content-end',
    })
    expect(Object.keys(params).some(k => /^(?:source|medium|campaign)/.test(k))).toBe(false)
  })
})
