import { describe, expect, it } from 'vitest'
import { courierImport, generalImport } from '../../utils/importTax'
import { shippingCostUsd, getCourier } from '../../utils/courierShipping'

// The courier regime as Ley 20.446 art. 627 + Decreto 50/026 actually define it. Several of
// these replace tests that encoded a regime which does not exist — see `importRules.ts`.
const TODAY = new Date('2026-07-11T00:00:00Z')

describe('courierImport', () => {
  it('charges IVA (22%) on a franchised non-US shipment', () => {
    // 150 fits the franchise: exempt from aranceles, but IVA 22% = 33.
    const r = courierImport({ value: 150, origin: 'other', useFranchise: true, today: TODAY })
    expect(r.regime).toBe('franquicia')
    expect(r.totalTax).toBe(33)
    expect(r.landedCost).toBe(183)
  })

  it('exonerates IVA for a US invoice up to USD 200', () => {
    const r = courierImport({ value: 150, origin: 'usa', useFranchise: true, today: TODAY })
    expect(r.ivaExempt).toBe(true)
    expect(r.totalTax).toBe(0)
  })

  it('taxes the WHOLE US shipment one dollar over the threshold', () => {
    // All-or-nothing: 250 -> IVA on the full 250 = 55, not on the excess.
    const r = courierImport({ value: 250, origin: 'usa', useFranchise: true, today: TODAY })
    expect(r.ivaExempt).toBe(false)
    expect(r.totalTax).toBe(55)
  })

  it('never splits a shipment between the franchise and the 60% rate', () => {
    // The old model franchised USD 100 and charged 60% on the remaining 400. Decreto art. 15:
    // a shipment the franchise cannot cover goes ENTIRELY to the prestación única.
    const r = courierImport({
      value: 500,
      origin: 'other',
      useFranchise: true,
      franchiseAvailable: 100,
      today: TODAY,
    })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(300) // 60% of 500 — not 22% of 100 + 60% of 400
  })

  it('applies the 60% rate when the franchise is not used', () => {
    const r = courierImport({ value: 100, useFranchise: false, today: TODAY })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(60)
  })

  it('floors the simplified regime at USD 20, not the repealed USD 10', () => {
    // 60% of 10 = 6 -> floored to the statutory minimum of 20.
    const r = courierImport({ value: 10, useFranchise: false, today: TODAY })
    expect(r.totalTax).toBe(20)
  })

  it('counts the seller shipping and US sales tax INSIDE the USD 200 threshold', () => {
    // Decreto art. 5: the threshold is the invoice TOTAL. 180 + 25 + 10 = 215 > 200, so this
    // pays IVA — the old model saw only the 180 and wrongly called it exempt.
    const r = courierImport({
      value: 180,
      sellerShipping: 25,
      salesTax: 10,
      origin: 'usa',
      useFranchise: true,
      today: TODAY,
    })
    expect(r.ivaExempt).toBe(false)
    expect(r.totalTax).toBe(47.3) // 22% of 215
  })

  it("keeps the courier's own freight out of the threshold and out of every tax base", () => {
    // The courier's separately-billed freight is not on the seller's invoice: 190 stays under
    // the 200 threshold and the freight is added to the landed cost untaxed.
    const r = courierImport({
      value: 190,
      shipping: 40,
      origin: 'usa',
      useFranchise: true,
      today: TODAY,
    })
    expect(r.ivaExempt).toBe(true)
    expect(r.totalTax).toBe(0)
    expect(r.landedCost).toBe(230)
  })

  it('refuses to price a shipment over USD 800 instead of inventing a number', () => {
    const r = courierImport({ value: 1000, origin: 'other', useFranchise: true, today: TODAY })
    expect(r.regime).toBe('general')
    expect(r.totalTax).toBe(0)
    expect(r.reasons?.join(' ')).toMatch(/supera/i)
  })

  it('sends the 4th shipment of the year to the simplified regime', () => {
    const r = courierImport({
      value: 100,
      origin: 'usa',
      useFranchise: true,
      shipmentsUsed: 3,
      today: TODAY,
    })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(60)
  })

  it('from 2026-10-01 an unregistered US seller loses the IVA exoneration', () => {
    const after = new Date('2026-10-01T00:00:00Z')
    const exempt = courierImport({
      value: 150,
      origin: 'usa',
      useFranchise: true,
      sellerRegistered: true,
      today: after,
    })
    const taxed = courierImport({
      value: 150,
      origin: 'usa',
      useFranchise: true,
      sellerRegistered: false,
      today: after,
    })
    expect(exempt.totalTax).toBe(0)
    expect(taxed.totalTax).toBe(33)
  })

  it('shows the merchandise and the courier freight as separate lines', () => {
    const r = courierImport({ value: 100, shipping: 20, useFranchise: false, today: TODAY })
    expect(r.breakdown[0]).toEqual({ label: 'Mercadería', amount: 100 })
    expect(r.breakdown.find(l => /flete/i.test(l.label))?.amount).toBe(20)
  })

  it('omits the freight line when there is no courier freight', () => {
    const r = courierImport({ value: 100, useFranchise: false, today: TODAY })
    expect(r.breakdown.some(l => /flete/i.test(l.label))).toBe(false)
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
