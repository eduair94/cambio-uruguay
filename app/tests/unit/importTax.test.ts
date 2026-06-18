import { describe, expect, it } from 'vitest'
import { courierImport, generalImport } from '../../utils/importTax'
import { shippingCostUsd, getCourier } from '../../utils/courierShipping'

describe('courierImport', () => {
  it('charges IVA (22%) on the franchised value for a non-US shipment', () => {
    // declared 150, franchise covers it -> arancel exempt but IVA 22% = 33
    const r = courierImport({ value: 150, origin: 'other', useFranchise: true })
    expect(r.totalTax).toBe(33)
    expect(r.landedCost).toBe(183)
  })

  it('exonerates IVA for a US shipment up to USD 200 (TIFA)', () => {
    const r = courierImport({ value: 150, origin: 'usa', useFranchise: true })
    expect(r.totalTax).toBe(0)
    expect(r.landedCost).toBe(150)
  })

  it('charges IVA for a US shipment above USD 200', () => {
    // declared 250 > 200 -> no TIFA exemption -> IVA 22% of 250 = 55
    const r = courierImport({ value: 250, origin: 'usa', useFranchise: true })
    expect(r.totalTax).toBe(55)
  })

  it('IVA on franchise + 60% on the excess above the franchise', () => {
    // declared 1000, franchise 800 -> IVA 800*22%=176, excess 200*60%=120 -> 296
    const r = courierImport({ value: 1000, origin: 'other', useFranchise: true, franchiseAvailable: 800 })
    expect(r.totalTax).toBe(296)
    expect(r.landedCost).toBe(1296)
  })

  it('applies only the 60% simplified rate when the franchise is not used', () => {
    const r = courierImport({ value: 100, useFranchise: false })
    expect(r.taxableBase).toBe(100)
    expect(r.totalTax).toBe(60)
  })

  it('applies the minimum tax when the computed tax is below it', () => {
    const r = courierImport({ value: 10, useFranchise: false, minTax: 10 })
    expect(r.totalTax).toBe(10)
  })

  it('includes shipping and insurance in the declared value', () => {
    const r = courierImport({ value: 100, shipping: 20, insurance: 5, useFranchise: false })
    expect(r.taxableBase).toBe(125)
  })
})

describe('courierShipping', () => {
  it('cost = base fee + per-kg rate × weight', () => {
    expect(shippingCostUsd(22, 5, 2)).toBe(49) // 5 + 22*2
  })

  it('clamps negative weight to zero', () => {
    expect(shippingCostUsd(22, 5, -3)).toBe(5)
  })

  it('falls back to the first courier for an unknown id', () => {
    expect(getCourier('nope').id).toBe('usxcargo')
  })
})

describe('generalImport', () => {
  it('computes CIF, arancel, tasa consular and IVA over the right base', () => {
    // CIF = 1000; arancel 0; tasa consular 5% = 50; IVA base = 1050; IVA 22% = 231
    const r = generalImport({ value: 1000, arancelPct: 0, tasaConsularPct: 5, ivaPct: 22 })
    expect(r.taxableBase).toBe(1050)
    expect(r.totalTax).toBe(281) // 50 + 231
    expect(r.landedCost).toBe(1281)
  })

  it('adds arancel and IMESI into the IVA base', () => {
    const r = generalImport({
      value: 1000,
      arancelPct: 10,
      tasaConsularPct: 0,
      imesiPct: 0,
      ivaPct: 22,
    })
    // arancel 100, IVA base 1100, IVA 242, total 342
    expect(r.taxableBase).toBe(1100)
    expect(r.totalTax).toBe(342)
  })

  it('reports an effective rate over the goods value', () => {
    const r = generalImport({ value: 1000, tasaConsularPct: 5, ivaPct: 22 })
    expect(r.effectiveRatePct).toBeCloseTo(28.1, 1)
  })
})
