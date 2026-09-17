// app/tests/unit/phoneImport.test.ts
//
// Pins `phoneImportEstimate` against the SITE'S OWN rule functions (courierImport,
// resolveBaggageTax, courierParcelQuote) rather than hand-recomputing tax law here — the whole
// point of Task 5 is that this module does not repeat any rule those functions already own.
//
// DISCREPANCY vs the task brief's worked examples (functions win, per controller ruling): the
// brief hand-computes the traveler tax as "excedente × 50 %" in exact decimal — e.g.
// 247,93 × 50 % = 123,97 for the iPhone 17e case — but `resolveBaggageTax`'s `excessUsd` is
// `invoiceUsd - FRANCHISE_AIR_SEA_USD` in IEEE-754 double precision: 747.93 - 500 is actually
// 247.92999999999995, not an exact 247.93, so ×50% lands at 123.96499999999997 — a hair BELOW
// the .965 midpoint — and `round()`'s `Number.EPSILON` nudge (2.22e-16) is far too small to pull
// a ~1.4e-14 relative error back over the rounding boundary. `resolveBaggageTax` and `round` are
// existing, already-shipped functions this task only consumes, so the fix (if any) belongs to a
// future task on `travelerBaggageRules.ts`/`calculators.ts`, not here. The two affected worked
// examples both actually resolve to .96, not .97; both are asserted below with actual results.
import { describe, expect, it } from 'vitest'
import { ADUANA_FAQS } from '../../utils/aduanaFaq'
import { round } from '../../utils/calculators'
import { ESTIMATOR_COURIERS, courierParcelQuote } from '../../utils/courierShipping'
import { phoneImportEstimate } from '../../utils/phoneImport'
import { PHONE_US_PRICES, PHONE_US_SALES_TAX } from '../../utils/phoneUsPrices'

describe('PHONE_US_PRICES', () => {
  it('tiene exactamente los precios de lista de apple.com leídos el 16/9/2026 (sin impuestos)', () => {
    expect(PHONE_US_PRICES).toEqual({
      'apple-iphone-18-pro-256gb': 1199,
      'apple-iphone-18-pro-512gb': 1399,
      'apple-iphone-18-pro-1tb': 1799,
      'apple-iphone-18-pro-2tb': 2399,
      'apple-iphone-18-pro-max-256gb': 1299,
      'apple-iphone-18-pro-max-512gb': 1499,
      'apple-iphone-18-pro-max-1tb': 1899,
      'apple-iphone-18-pro-max-2tb': 2499,
      'apple-iphone-air-256gb': 1099,
      'apple-iphone-air-512gb': 1299,
      'apple-iphone-air-1tb': 1699,
      'apple-iphone-17-256gb': 899,
      'apple-iphone-17-512gb': 1099,
      'apple-iphone-17e-256gb': 699,
      'apple-iphone-17e-512gb': 899,
      'apple-iphone-16-128gb': 799,
    })
  })
})

describe('PHONE_US_SALES_TAX', () => {
  it('ofrece Miami-Dade (7 %) y un estado sin impuesto (0 %), identificados por id (no key)', () => {
    expect(PHONE_US_SALES_TAX).toEqual([
      {
        id: 'miami-dade',
        label: 'Florida, Miami-Dade (7 %)',
        pct: 7,
        source: 'https://floridarevenue.com/taxes/taxesfees/Pages/discretionary.aspx',
      },
      { id: 'sin-impuesto', label: 'Estado sin impuesto de venta (0 %)', pct: 0, source: null },
    ])
  })
})

/** Cheapest ESTIMATOR_COURIERS quote at 0.5 kg, computed independently of phoneImport.ts. */
function expectedCheapestFreight(kg: number): { totalUsd: number; name: string } | null {
  let best: { totalUsd: number; name: string } | null = null
  for (const courier of ESTIMATOR_COURIERS) {
    const quote = courierParcelQuote(courier, kg)
    if (!quote) continue
    if (!best || quote.totalUsd < best.totalUsd)
      best = { totalUsd: round(quote.totalUsd), name: courier.name }
  }
  return best
}

describe('phoneImportEstimate', () => {
  it('iPhone 17e 256 GB (US$ 699, 7 %): factura 747,93, courier en franquicia con IVA 22 %', () => {
    const r = phoneImportEstimate({
      usPriceUsd: 699,
      salesTaxPct: 7,
      usdUyu: 40,
      localBestUyu: null,
    })

    expect(r.usPriceUsd).toBe(699)
    expect(r.salesTaxUsd).toBe(48.93)
    expect(r.invoiceUsd).toBe(747.93)

    // Courier: factura ≤ US$ 800 → franquicia; > US$ 200 de EE.UU. → paga IVA 22 % sobre el total.
    expect(r.courier.regime).toBe('franquicia')
    expect(r.courier.taxUsd).toBe(164.54)
    expect(r.courier.reasons.join(' ')).toMatch(/franquicia anual/i)
    expect(r.courier.reasons.join(' ')).toMatch(/200/)

    // Viajero: franquicia aérea US$ 500, excedente 247,93 × 50 %. Ver nota de discrepancia arriba:
    // el resultado real es 123,96, no el 123,97 que el brief calcula a mano en decimal exacto.
    expect(r.traveler.franchiseUsd).toBe(500)
    expect(r.traveler.taxUsd).toBe(123.96)
    expect(r.traveler.totalUsd).toBe(871.89)

    expect(r.ursecUyu).toBe(239)
  })

  it('freightUsd es el totalUsd más barato entre ESTIMATOR_COURIERS a 0,5 kg, con su nombre', () => {
    const r = phoneImportEstimate({
      usPriceUsd: 699,
      salesTaxPct: 7,
      usdUyu: 40,
      localBestUyu: null,
    })
    const expected = expectedCheapestFreight(0.5)
    expect(expected).not.toBeNull()
    expect(r.courier.freightUsd).toBe(expected!.totalUsd)
    expect(r.courier.courierName).toBe(expected!.name)
    expect(r.courier.totalUsd).toBe(round(r.invoiceUsd + r.courier.taxUsd! + r.courier.freightUsd!))
  })

  it('iPhone 17 256 GB (US$ 899, 7 %): factura 961,93 supera la franquicia anual → régimen general', () => {
    const r = phoneImportEstimate({
      usPriceUsd: 899,
      salesTaxPct: 7,
      usdUyu: 40,
      localBestUyu: null,
    })

    expect(r.invoiceUsd).toBe(961.93)

    // Régimen general: no se calcula (requiere despachante y DUA), nada de tributo por courier.
    expect(r.courier.regime).toBe('general')
    expect(r.courier.taxUsd).toBeNull()
    expect(r.courier.freightUsd).toBeNull()
    expect(r.courier.courierName).toBeNull()
    expect(r.courier.totalUsd).toBeNull()
    expect(r.courier.totalUyu).toBeNull()
    expect(r.courier.reasons.join(' ')).toMatch(/supera.*800/i)

    // Viajero SÍ se calcula siempre (no depende del régimen de courier): excedente 461,93 × 50 %.
    // Real: 230,96 (ver nota de discrepancia arriba; el brief calculaba 230,97 a mano).
    expect(r.traveler.taxUsd).toBe(230.96)
  })

  it('con 0 % de sales tax la factura (899) sigue superando los US$ 800: sigue en régimen general', () => {
    const r = phoneImportEstimate({
      usPriceUsd: 899,
      salesTaxPct: 0,
      usdUyu: 40,
      localBestUyu: null,
    })

    expect(r.salesTaxUsd).toBe(0)
    expect(r.invoiceUsd).toBe(899)
    expect(r.courier.regime).toBe('general')
    expect(r.courier.taxUsd).toBeNull()
  })

  it('ursecUyu se lee de la propia ficha de aduanaFaq.ts (no un literal duplicado)', () => {
    const faq = ADUANA_FAQS.find(f => f.id === 'celular-router-drone')
    expect(faq).toBeDefined()
    const match = faq!.answer.match(/costo de \$(\d+)/)
    expect(match).not.toBeNull()

    const r = phoneImportEstimate({
      usPriceUsd: 699,
      salesTaxPct: 7,
      usdUyu: 40,
      localBestUyu: null,
    })
    expect(r.ursecUyu).toBe(Number(match![1]))
  })

  it('ahorros: localBestUyu - total; positivo = conviene traerlo; null si falta un lado', () => {
    const withLocal = phoneImportEstimate({
      usPriceUsd: 699,
      salesTaxPct: 7,
      usdUyu: 40,
      localBestUyu: 40000,
    })
    expect(withLocal.savingTravelerUyu).toBe(round(40000 - withLocal.traveler.totalUyu))
    expect(withLocal.savingCourierUyu).toBe(round(40000 - withLocal.courier.totalUyu!))

    const withoutLocal = phoneImportEstimate({
      usPriceUsd: 699,
      salesTaxPct: 7,
      usdUyu: 40,
      localBestUyu: null,
    })
    expect(withoutLocal.savingTravelerUyu).toBeNull()
    expect(withoutLocal.savingCourierUyu).toBeNull()

    // El régimen general no cotiza courier.totalUyu: el ahorro por courier también queda null,
    // aunque haya un mejor precio local con el que comparar.
    const generalRegime = phoneImportEstimate({
      usPriceUsd: 899,
      salesTaxPct: 7,
      usdUyu: 40,
      localBestUyu: 50000,
    })
    expect(generalRegime.courier.totalUyu).toBeNull()
    expect(generalRegime.savingCourierUyu).toBeNull()
    expect(generalRegime.savingTravelerUyu).toBe(round(50000 - generalRegime.traveler.totalUyu))
  })

  it('today llega hasta courierImport: cruza SELLER_REGISTRY_ENFORCED_FROM (2026-10-01) y cambia el IVA', () => {
    // Factura de US$ 180 (≤ US$ 200 de EE.UU., TIFA): antes del 1/10/2026 la exoneración de IVA no
    // exige vendedor registrado y el envío no paga IVA; desde esa fecha sí lo exige, y como esta
    // llamada nunca declara `sellerRegistered`, pasa a pagar 22 % sobre la factura. Si `today` no
    // llegara hasta `resolveRegime` (importRules.ts) esto no cambiaría entre las dos fechas.
    const before = phoneImportEstimate({
      usPriceUsd: 180,
      salesTaxPct: 0,
      usdUyu: 40,
      localBestUyu: null,
      today: new Date('2026-09-01T00:00:00.000Z'),
    })
    const after = phoneImportEstimate({
      usPriceUsd: 180,
      salesTaxPct: 0,
      usdUyu: 40,
      localBestUyu: null,
      today: new Date('2026-10-02T00:00:00.000Z'),
    })

    expect(before.courier.regime).toBe('franquicia')
    expect(before.courier.taxUsd).toBe(0)

    expect(after.courier.regime).toBe('franquicia')
    expect(after.courier.taxUsd).toBe(39.6)
  })
})
