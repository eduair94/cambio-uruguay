import { describe, expect, it } from 'vitest'
import {
  GIFT_METHODS,
  getGiftMethod,
  giftTaxOutlook,
  recommendGiftMethods,
} from '../../utils/giftShipping'

describe('gift methods catalogue', () => {
  it('has unique ids and required fields', () => {
    const ids = GIFT_METHODS.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const m of GIFT_METHODS) {
      expect(m.name.trim()).not.toBe('')
      expect(m.icon.startsWith('mdi-')).toBe(true)
      expect(m.taxNote.trim()).not.toBe('')
      expect(m.steps.length).toBeGreaterThan(0)
      expect(['none', 'regime']).toContain(m.customs)
    }
  })

  it('lists the two tax-free (no-customs) methods', () => {
    const noCustoms = GIFT_METHODS.filter(m => m.customs === 'none').map(m => m.id)
    expect(noCustoms).toContain('digital')
    expect(noCustoms).toContain('money')
  })

  it('getGiftMethod falls back to the first method for an unknown id', () => {
    expect(getGiftMethod('digital').id).toBe('digital')
    // @ts-expect-error deliberately invalid id
    expect(getGiftMethod('nope').id).toBe(GIFT_METHODS[0]!.id)
  })
})

describe('recommendGiftMethods', () => {
  it('steers a flexible gift to the tax-free routes first', () => {
    const advice = recommendGiftMethods({ mustBePhysical: false, valueUsd: 300 })
    expect(advice.map(a => a.methodId)).toEqual(['digital', 'money'])
  })

  it('leads a physical gift with courier and always includes postal', () => {
    const advice = recommendGiftMethods({ mustBePhysical: true, valueUsd: 120 })
    expect(advice[0]!.methodId).toBe('courier')
    expect(advice.map(a => a.methodId)).toContain('postal')
  })

  it('flags a physical gift over the annual franchise as the general regime', () => {
    const advice = recommendGiftMethods({ mustBePhysical: true, valueUsd: 1200 })
    expect(advice[0]!.methodId).toBe('courier')
    expect(advice[0]!.reason).toMatch(/general/i)
  })
})

describe('giftTaxOutlook', () => {
  const today = new Date('2026-08-09T12:00:00Z') // before the seller-registry enforcement date

  it('is tax-free for a small US gift inside the recipient franchise', () => {
    const out = giftTaxOutlook({
      valueUsd: 150,
      origin: 'usa',
      useRecipientFranchise: true,
      recipientFranchiseAvailableUsd: 800,
      recipientShipmentsUsed: 0,
      today,
    })
    expect(out.taxFree).toBe(true)
    expect(out.estimatedTaxUsd).toBe(0)
    expect(out.regime).toBe('franquicia')
  })

  it('charges the 60% prestación única when the franchise is not used', () => {
    const out = giftTaxOutlook({
      valueUsd: 100,
      origin: 'other',
      useRecipientFranchise: false,
      recipientFranchiseAvailableUsd: 800,
      recipientShipmentsUsed: 0,
      today,
    })
    expect(out.regime).toBe('simplificado')
    expect(out.estimatedTaxUsd).toBe(60)
    expect(out.taxFree).toBe(false)
  })

  it('routes a gift over USD 800 to the general regime', () => {
    const out = giftTaxOutlook({
      valueUsd: 1000,
      origin: 'usa',
      useRecipientFranchise: true,
      recipientFranchiseAvailableUsd: 800,
      recipientShipmentsUsed: 0,
      today,
    })
    expect(out.regime).toBe('general')
    expect(out.taxFree).toBe(false)
  })
})
