import { describe, expect, it } from 'vitest'
import { courierImport } from '../../utils/importTax'
import {
  ABANDONMENT_DAYS,
  HANDLING_AFTER_ARRIVAL_USD,
  HANDLING_BEFORE_ARRIVAL_USD,
  HANDLING_TAX_PCT,
  POSTAL_HANDLING_UNPUBLISHED,
  postalHandling,
} from '../../utils/postalHandling'

// Correo Uruguayo, "Gestiones administrativas para envíos del exterior" (01/04/2026).
const TODAY = new Date('2026-08-12T00:00:00Z')

describe('postalHandling', () => {
  it('charges 1,5 USD + 5% of the tax when declared before arrival', () => {
    const r = postalHandling({ taxUsd: 20, timing: 'before-arrival' })
    expect(r.baseUsd).toBe(HANDLING_BEFORE_ARRIVAL_USD)
    expect(r.pctUsd).toBe(1)
    expect(r.totalUsd).toBe(2.5)
  })

  it('charges 5 USD + 5% once the parcel already arrived', () => {
    const r = postalHandling({ taxUsd: 20, timing: 'after-arrival' })
    expect(r.baseUsd).toBe(HANDLING_AFTER_ARRIVAL_USD)
    expect(r.totalUsd).toBe(6)
  })

  it('waives the 5% under franquicia but keeps the base charge', () => {
    const r = postalHandling({ taxUsd: 4.21, timing: 'before-arrival', useFranchise: true })
    expect(r.pctUsd).toBe(0)
    expect(r.totalUsd).toBe(1.5)
    expect(r.label).toContain('sin el 5%')
  })

  it('defaults to the cheap path and never returns a negative fee', () => {
    expect(postalHandling({ taxUsd: 0 }).totalUsd).toBe(HANDLING_BEFORE_ARRIVAL_USD)
    expect(postalHandling({ taxUsd: -50 }).pctUsd).toBe(0)
  })

  it('keeps the unpublished day 11-30 gap as prose, not as an invented number', () => {
    expect(HANDLING_TAX_PCT).toBe(5)
    expect(ABANDONMENT_DAYS).toBe(30)
    expect(POSTAL_HANDLING_UNPUBLISHED).toContain('no está publicado')
  })
})

describe('courierImport with Correo handling', () => {
  // The r/Burises case (2026-08-11): AliExpress parcel declared at US$ 19,15, already retained,
  // Ahíva showing "Pendiente U$S 26,00". 19,15 × 60% = 11,49 → mínimo US$ 20; + US$ 5 por
  // declarar con el paquete ya retenido; + US$ 1 (5% de 20) = 26,00 exactos.
  it('reproduces the US$ 19,15 parcel that owed US$ 26', () => {
    const r = courierImport({
      value: 19.15,
      origin: 'other',
      channel: 'postal-simple',
      useFranchise: false,
      declarationTiming: 'after-arrival',
      today: TODAY,
    })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(20)
    expect(r.handlingFee).toBe(6)
    expect(round2(r.totalTax + (r.handlingFee ?? 0))).toBe(26)
    expect(r.breakdown.some(l => l.label.includes('Gestión del Correo'))).toBe(true)
  })

  it('would have cost US$ 22,50 had the same parcel been declared before it landed', () => {
    const r = courierImport({
      value: 19.15,
      origin: 'other',
      channel: 'postal-simple',
      useFranchise: false,
      declarationTiming: 'before-arrival',
      today: TODAY,
    })
    expect(round2(r.totalTax + (r.handlingFee ?? 0))).toBe(22.5)
  })

  // OJO con la tentación de creer que la franquicia lo arregla: el IVA de un envío postal tiene
  // piso legal de US$ 20 (Título 10 art. 13 lit. B, inciso agregado por la Ley 20.446 art. 660),
  // así que 22% de 19,15 = 4,21 sube igual a 20. Antes de esa corrección esta prueba fijaba 4,21
  // y publicaba un ahorro que no existía.
  it('applies the statutory IVA floor to the franquicia alternative for the same parcel', () => {
    const r = courierImport({
      value: 19.15,
      origin: 'other',
      channel: 'postal-simple',
      useFranchise: true,
      declarationTiming: 'before-arrival',
      today: TODAY,
    })
    expect(r.regime).toBe('franquicia')
    expect(r.totalTax).toBe(20)
    expect(r.handlingFee).toBe(1.5)
    expect(round2(r.totalTax + (r.handlingFee ?? 0))).toBe(21.5)
  })

  // El arreglo que seguíamos publicando —declarar la franquicia sobre el envío ya retenido—
  // ahorra un dólar, no dieciséis: 25 contra 26.
  it('prices the franquicia fix on the already-retained parcel at US$ 25', () => {
    const fixed = courierImport({
      value: 19.15,
      origin: 'other',
      channel: 'postal-simple',
      useFranchise: true,
      declarationTiming: 'after-arrival',
      today: TODAY,
    })
    expect(fixed.regime).toBe('franquicia')
    expect(fixed.ivaExempt).toBe(false) // China: la exoneración TIFA es sólo para EE.UU.
    expect(fixed.totalTax).toBe(20) // piso legal del IVA, no 22% de 19,15
    expect(fixed.handlingFee).toBe(HANDLING_AFTER_ARRIVAL_USD) // sin el 5% por franquicia
    expect(round2(fixed.totalTax + (fixed.handlingFee ?? 0))).toBe(25)
  })

  // Y un envío de puros libros sí queda en cero: el piso no corre "cuando el envío esté
  // integrado exclusivamente por bienes cuya importación se encuentra exonerada".
  it('leaves a books-only parcel at zero tax, floor included', () => {
    const books = courierImport({
      value: 19.15,
      origin: 'other',
      channel: 'postal-simple',
      useFranchise: true,
      exemption: 'todo-tributo',
      franchiseCapExempt: true,
      ivaPct: 0,
      declarationTiming: 'after-arrival',
      today: TODAY,
    })
    expect(books.regime).toBe('exonerado')
    expect(books.totalTax).toBe(0)
  })

  it('leaves the fee out for private couriers and when the timing is unknown', () => {
    const courier = courierImport({
      value: 19.15,
      origin: 'other',
      channel: 'courier',
      declarationTiming: 'after-arrival',
      today: TODAY,
    })
    expect(courier.handlingFee).toBeUndefined()

    const unknownTiming = courierImport({
      value: 19.15,
      origin: 'other',
      channel: 'postal-simple',
      today: TODAY,
    })
    expect(unknownTiming.handlingFee).toBeUndefined()
    expect(unknownTiming.landedCost).toBe(39.15)
  })

  it('adds the fee to the landed cost but never to the tax or the effective rate', () => {
    const r = courierImport({
      value: 100,
      origin: 'other',
      channel: 'postal-ems',
      useFranchise: false,
      declarationTiming: 'before-arrival',
      today: TODAY,
    })
    expect(r.totalTax).toBe(60)
    expect(r.effectiveRatePct).toBe(60)
    expect(r.handlingFee).toBe(4.5)
    expect(r.landedCost).toBe(164.5)
  })
})

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
