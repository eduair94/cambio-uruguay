import { describe, expect, it } from 'vitest'
import { courierImport, generalImport } from '../../utils/importTax'

describe('courierImport', () => {
  it('charges nothing when the value is fully covered by the franchise', () => {
    const r = courierImport({ value: 150, useFranchise: true, franchiseAvailable: 800 })
    expect(r.taxableBase).toBe(0)
    expect(r.totalTax).toBe(0)
    expect(r.landedCost).toBe(150)
  })

  it('applies the 60% simplified rate to the portion above the franchise', () => {
    // declared 1000, franchise 800 -> taxable 200 -> 60% = 120
    const r = courierImport({ value: 1000, useFranchise: true, franchiseAvailable: 800 })
    expect(r.taxableBase).toBe(200)
    expect(r.totalTax).toBe(120)
    expect(r.landedCost).toBe(1120)
  })

  it('taxes the full declared value when the franchise is not used', () => {
    const r = courierImport({ value: 100, useFranchise: false })
    expect(r.taxableBase).toBe(100)
    expect(r.totalTax).toBe(60)
  })

  it('applies the minimum tax when the computed tax is below it', () => {
    const r = courierImport({ value: 10, useFranchise: false, minTax: 10 })
    // 60% of 10 = 6, below the 10 minimum -> 10
    expect(r.totalTax).toBe(10)
  })

  it('includes shipping and insurance in the declared value', () => {
    const r = courierImport({ value: 100, shipping: 20, insurance: 5, useFranchise: false })
    expect(r.taxableBase).toBe(125)
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
