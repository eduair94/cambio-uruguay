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
    const r = courierImport({
      value: 1000,
      origin: 'other',
      useFranchise: true,
      franchiseAvailable: 800,
    })
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

  it('does not tax freight: IVA is on merchandise only, freight added to landed cost', () => {
    // value 150 (franchise covers it) -> IVA 22% = 33; freight 40 untaxed -> landed 150+33+40
    const r = courierImport({ value: 150, shipping: 40, origin: 'other', useFranchise: true })
    expect(r.totalTax).toBe(33)
    expect(r.landedCost).toBe(223)
  })

  it('keeps freight out of the franchise and the 60% excess base', () => {
    // value 1000, franchise 800 -> IVA 176 + 60% of 200 = 120 => 296; freight 100 untaxed
    const r = courierImport({
      value: 1000,
      shipping: 100,
      origin: 'other',
      useFranchise: true,
      franchiseAvailable: 800,
    })
    expect(r.totalTax).toBe(296)
    expect(r.landedCost).toBe(1396)
  })

  it('keeps freight out of the 60% base when the franchise is not used', () => {
    // 60% of merchandise 100 = 60; freight 20 untaxed -> landed 180
    const r = courierImport({ value: 100, shipping: 20, useFranchise: false })
    expect(r.taxableBase).toBe(100)
    expect(r.totalTax).toBe(60)
    expect(r.landedCost).toBe(180)
  })

  it('shows the merchandise and freight as explicit, separate breakdown lines', () => {
    const r = courierImport({ value: 100, shipping: 20, useFranchise: false })
    expect(r.breakdown[0]).toEqual({ label: 'Mercadería', amount: 100 })
    const freightLine = r.breakdown.find(l => /flete|env[ií]o/i.test(l.label))
    expect(freightLine?.amount).toBe(20)
  })

  it('omits the freight line when there is no shipping', () => {
    const r = courierImport({ value: 100, useFranchise: false })
    expect(r.breakdown.some(l => /flete|env[ií]o/i.test(l.label))).toBe(false)
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
    expect(getCourier('nope').id).toBe('gripper')
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
