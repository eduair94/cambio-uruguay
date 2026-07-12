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

  it('taxes each line by its own IVA rate when the franchise covers the shipment', () => {
    // A: general $300 (IVA 22% = 66), B: books $100 (IVA 0%). The USD 800 franchise covers the
    // whole USD 400 shipment: exempt from aranceles, IVA still due per product type.
    const items = [
      item({ id: 'a', priceUsd: 300, categoryId: 'general' }),
      item({ id: 'b', priceUsd: 100, categoryId: 'libros' }),
    ]
    const settings: CartSettings = {
      regime: 'courier',
      origin: 'other',
      useFranchise: true,
      franchiseAvailableUsd: 800,
    }
    const r = computeCart(items, settings)
    expect(r.lines[0]!.tax?.regime).toBe('franquicia')
    expect(r.lines[0]!.tax?.totalTax).toBeCloseTo(66, 2)
    expect(r.lines[1]!.tax?.totalTax).toBeCloseTo(0, 2)
    expect(r.totalTaxUsd).toBeCloseTo(66, 2)
    expect(r.taxableSubtotalUsd).toBe(400)
  })

  it('sends the WHOLE basket to the 60% regime when the franchise cannot cover it', () => {
    // Decreto 50/026 art. 15: a shipment is never split. The old model franchised USD 800 of a
    // USD 1.000 basket and charged 60% on the remaining 200 — a regime that does not exist.
    const items = [
      item({ id: 'a', priceUsd: 600, categoryId: 'general' }),
      item({ id: 'b', priceUsd: 400, categoryId: 'libros' }),
    ]
    const r = computeCart(items, {
      regime: 'courier',
      origin: 'other',
      useFranchise: true,
      franchiseAvailableUsd: 800,
    })
    // Basket is USD 1.000 > USD 800: it fits neither regime and goes to the general one.
    expect(r.lines[0]!.tax?.regime).toBe('general')
    expect(r.totalTaxUsd).toBe(0)
    expect(r.warnings.join(' ')).toMatch(/US\$ 800/)
  })

  it('charges 60% of the whole basket when the remaining franchise is too small', () => {
    // USD 500 basket, only USD 100 of franchise left -> the entire shipment pays 60%.
    const items = [item({ id: 'a', priceUsd: 500, categoryId: 'general' })]
    const r = computeCart(items, {
      regime: 'courier',
      origin: 'other',
      useFranchise: true,
      franchiseAvailableUsd: 100,
    })
    expect(r.lines[0]!.tax?.regime).toBe('simplificado')
    expect(r.totalTaxUsd).toBe(300)
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
  it('applies the simplified minimum ONCE per shipment, not per line', () => {
    // 12 items of USD 5 = USD 60 basket -> 60% = 36, already over the USD 20 floor.
    // Flooring per line would have charged 12 × 20 = 240.
    const items = Array.from({ length: 12 }, (_, i) =>
      item({ id: `x${i}`, priceUsd: 5, categoryId: 'general' })
    )
    const r = computeCart(items, { regime: 'courier', useFranchise: false })
    expect(r.totalTaxUsd).toBe(36)
  })

  it('floors the shipment at USD 20 — the statutory minimum, not the repealed USD 10', () => {
    // 3 items of USD 5 = USD 15 -> 60% = 9, floored once to the USD 20 minimum.
    const items = Array.from({ length: 3 }, (_, i) =>
      item({ id: `y${i}`, priceUsd: 5, categoryId: 'general' })
    )
    const r = computeCart(items, { regime: 'courier', useFranchise: false })
    expect(r.totalTaxUsd).toBe(20)
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
