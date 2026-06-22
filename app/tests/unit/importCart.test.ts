import { describe, expect, it } from 'vitest'
import { computeCart, type CartItem, type CartSettings } from '../../utils/importCart'

const item = (
  over: Partial<CartItem> & Pick<CartItem, 'id' | 'priceUsd' | 'categoryId'>
): CartItem => ({
  name: over.name ?? `item-${over.id}`,
  qty: over.qty ?? 1,
  ...over,
})

describe('computeCart — courier regime', () => {
  it('applies the 60% simplified rate without franchise (single general item)', () => {
    const items = [item({ id: 'a', priceUsd: 100, categoryId: 'general' })]
    const settings: CartSettings = { regime: 'courier', useFranchise: false }
    const r = computeCart(items, settings)
    expect(r.taxableSubtotalUsd).toBe(100)
    expect(r.totalTaxUsd).toBe(60)
    expect(r.landedCostUsd).toBe(160)
    expect(r.lines[0]!.tax?.totalTax).toBe(60)
    expect(r.lines[0]!.blocked).toBe(false)
  })

  it('multiplies price by quantity for the line value', () => {
    const items = [item({ id: 'a', priceUsd: 50, qty: 2, categoryId: 'general' })]
    const r = computeCart(items, { regime: 'courier', useFranchise: false })
    expect(r.lines[0]!.lineValueUsd).toBe(100)
    expect(r.totalTaxUsd).toBe(60)
  })

  it('allocates a shared franchise proportionally across mixed-category items', () => {
    // A: general $600 (IVA 22%), B: books $400 (IVA 0%); franchise 800 over goods 1000.
    // franchise_A = 480, franchise_B = 320.
    // A: IVA 480*22% = 105.6 + excess 120*60% = 72 -> 177.6
    // B: IVA 320*0% = 0    + excess 80*60%  = 48 -> 48
    const items = [
      item({ id: 'a', priceUsd: 600, categoryId: 'general' }),
      item({ id: 'b', priceUsd: 400, categoryId: 'libros' }),
    ]
    const settings: CartSettings = {
      regime: 'courier',
      origin: 'other',
      useFranchise: true,
      franchiseAvailableUsd: 800,
    }
    const r = computeCart(items, settings)
    expect(r.lines[0]!.tax?.totalTax).toBeCloseTo(177.6, 2)
    expect(r.lines[1]!.tax?.totalTax).toBeCloseTo(48, 2)
    expect(r.totalTaxUsd).toBeCloseTo(225.6, 2)
    expect(r.taxableSubtotalUsd).toBe(1000)
  })

  it('excludes courier-prohibited items from tax and surfaces a warning', () => {
    const items = [
      item({ id: 'a', priceUsd: 100, categoryId: 'general' }),
      item({ id: 'b', name: 'Whisky', priceUsd: 50, categoryId: 'alcohol_tabaco' }),
    ]
    const r = computeCart(items, { regime: 'courier', useFranchise: false })
    expect(r.lines[1]!.blocked).toBe(true)
    expect(r.lines[1]!.tax).toBeNull()
    expect(r.taxableSubtotalUsd).toBe(100) // blocked goods excluded from taxable base
    expect(r.subtotalUsd).toBe(150) // but counted in the raw subtotal
    expect(r.totalTaxUsd).toBe(60)
    expect(r.warnings.some(w => w.includes('Whisky'))).toBe(true)
  })

  it('adds cart-level shipping to the landed cost untaxed', () => {
    const items = [item({ id: 'a', priceUsd: 100, categoryId: 'general' })]
    const r = computeCart(items, { regime: 'courier', useFranchise: false, shippingUsd: 40 })
    expect(r.totalTaxUsd).toBe(60) // shipping never taxed
    expect(r.shippingUsd).toBe(40)
    expect(r.landedCostUsd).toBe(200) // 100 + 60 + 40
  })

  it('converts the landed cost to UYU when a rate is supplied', () => {
    const items = [item({ id: 'a', priceUsd: 100, categoryId: 'general' })]
    const r = computeCart(items, { regime: 'courier', useFranchise: false, usdToUyu: 40 })
    expect(r.landedCostUsd).toBe(160)
    expect(r.landedCostUyu).toBe(6400)
  })

  it('sums total weight across quantities', () => {
    const items = [
      item({ id: 'a', priceUsd: 10, categoryId: 'general', weightKg: 1.5, qty: 2 }),
      item({ id: 'b', priceUsd: 10, categoryId: 'general', weightKg: 0.5, qty: 1 }),
    ]
    const r = computeCart(items, { regime: 'courier', useFranchise: false })
    expect(r.totalWeightKg).toBe(3.5)
  })
})

describe('computeCart — basket-level shipment rules', () => {
  it('applies the USD 10 simplified minimum ONCE per basket, not per line', () => {
    // 6 cheap items, no franchise: each line excess 5 -> 60% = 3 (< 10).
    // Per-line flooring would give 6×10 = 60; basket-level floors the total once.
    const items = Array.from({ length: 6 }, (_, i) =>
      item({ id: `x${i}`, priceUsd: 5, categoryId: 'general' })
    )
    const r = computeCart(items, { regime: 'courier', useFranchise: false })
    // total excess 30 × 60% = 18, already above the 10 minimum -> no floor, 18.
    expect(r.totalTaxUsd).toBe(18)
  })

  it('floors the basket simplified tax to USD 10 when the whole basket is below it', () => {
    // 3 items of $5 -> total excess 15 × 60% = 9 (< 10) -> floored once to 10.
    const items = Array.from({ length: 3 }, (_, i) =>
      item({ id: `y${i}`, priceUsd: 5, categoryId: 'general' })
    )
    const r = computeCart(items, { regime: 'courier', useFranchise: false })
    expect(r.totalTaxUsd).toBe(10)
  })

  it('evaluates the USA TIFA IVA exemption on the basket total, not per line', () => {
    // Two USA lines of $150 each (each ≤ 200) but basket $300 > 200 -> NOT exempt.
    // franchise 800 covers all 300 -> IVA 22% on 300 = 66, no excess.
    const items = [
      item({ id: 'a', priceUsd: 150, categoryId: 'general' }),
      item({ id: 'b', priceUsd: 150, categoryId: 'general' }),
    ]
    const r = computeCart(items, {
      regime: 'courier',
      origin: 'usa',
      useFranchise: true,
      franchiseAvailableUsd: 800,
    })
    expect(r.totalTaxUsd).toBe(66)
  })

  it('keeps the TIFA exemption when the whole USA basket is ≤ USD 200', () => {
    const items = [
      item({ id: 'a', priceUsd: 100, categoryId: 'general' }),
      item({ id: 'b', priceUsd: 80, categoryId: 'general' }),
    ]
    const r = computeCart(items, {
      regime: 'courier',
      origin: 'usa',
      useFranchise: true,
      franchiseAvailableUsd: 800,
    })
    expect(r.totalTaxUsd).toBe(0)
  })
})

describe('computeCart — general regime', () => {
  it('applies CIF + tasa consular + IVA per the general import math', () => {
    const items = [item({ id: 'a', priceUsd: 1000, categoryId: 'general' })]
    const settings: CartSettings = {
      regime: 'general',
      arancelPct: 0,
      tasaConsularPct: 5,
    }
    const r = computeCart(items, settings)
    expect(r.totalTaxUsd).toBe(281) // 50 tasa consular + 231 IVA
    expect(r.landedCostUsd).toBe(1281)
  })
})

describe('computeCart — edge cases', () => {
  it('returns zeroed totals for an empty cart', () => {
    const r = computeCart([], { regime: 'courier', useFranchise: false })
    expect(r.subtotalUsd).toBe(0)
    expect(r.totalTaxUsd).toBe(0)
    expect(r.landedCostUsd).toBe(0)
    expect(r.effectiveRatePct).toBeNull()
    expect(r.landedCostUyu).toBeNull()
    expect(r.lines).toHaveLength(0)
  })
})
