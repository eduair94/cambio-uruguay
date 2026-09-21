// El catálogo de `/impuesto-temu-uruguay` no puede tener una cifra propia: cada importe que la
// página publica tiene que seguir saliendo del motor que resuelve las normas fechadas. Si mañana
// cambia el mínimo de IVA o el tope anual, la página se mueve sola — y si alguien "arregla" un
// número a mano en el catálogo, este archivo se pone rojo.

import { describe, expect, it } from 'vitest'

import {
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  POSTAL_IVA_MIN_USD,
  SIMPLIFIED_RATE_PCT,
  USA_IVA_EXEMPTION_USD,
} from '../../utils/importRules'
import { courierImport } from '../../utils/importTax'
import {
  TEMU_EXAMPLES,
  TEMU_FAQ,
  TEMU_PLATFORMS,
  TEMU_SMALL_PARCEL,
  TEMU_SOURCES,
  TEMU_USA_CONTRAST,
  TEMU_VERIFIED_AT,
} from '../../utils/temuTax'

describe('los ejemplos del impuesto Temu salen del motor de importación', () => {
  it.each(TEMU_EXAMPLES.map(example => [example.id, example] as const))(
    '%s reproduce exactamente lo que devuelve courierImport',
    (_id, example) => {
      const engine = courierImport({
        value: example.valueUsd,
        origin: 'other',
        useFranchise: example.useFranchise,
        franchiseAvailable: FRANCHISE_ANNUAL_USD,
        shipmentsUsed: example.shipmentsUsed,
        ivaPct: 22,
        today: new Date(`${TEMU_VERIFIED_AT}T00:00:00Z`),
      })
      expect(example.taxUsd).toBe(engine.totalTax)
      expect(example.regime).toBe(engine.regime)
      expect(example.effectiveRatePct).toBe(engine.effectiveRatePct)
      expect(example.breakdown.map(line => line.amount)).toEqual(
        engine.breakdown.map(line => line.amount)
      )
    }
  )

  // El titular de la página. Si el mínimo legal dejara de morder, esto deja de ser cierto y la
  // página tiene que dejar de decirlo: por eso se afirma acá y no sólo en la prosa.
  it('el paquete chico paga más impuesto que su propio valor, por el mínimo legal de IVA', () => {
    expect(TEMU_SMALL_PARCEL.taxUsd).toBeGreaterThan(TEMU_SMALL_PARCEL.valueUsd)
    expect(TEMU_SMALL_PARCEL.taxUsd).toBe(POSTAL_IVA_MIN_USD)
    expect(TEMU_SMALL_PARCEL.regime).toBe('franquicia')
  })

  it('agotado el cupo, el mismo envío pasa a la prestación única', () => {
    const conCupo = TEMU_EXAMPLES.find(e => e.id === 'medio-con-cupo')!
    const sinCupo = TEMU_EXAMPLES.find(e => e.id === 'medio-sin-cupo')!
    expect(conCupo.valueUsd).toBe(sinCupo.valueUsd)
    expect(conCupo.regime).toBe('franquicia')
    expect(sinCupo.regime).toBe('simplificado')
    expect(sinCupo.shipmentsUsed).toBe(FRANCHISE_MAX_SHIPMENTS)
    expect(sinCupo.taxUsd).toBeGreaterThan(conCupo.taxUsd)
    expect(sinCupo.effectiveRatePct).toBe(SIMPLIFIED_RATE_PCT)
  })

  it('la misma compra facturada en EE.UU. no paga IVA', () => {
    expect(TEMU_USA_CONTRAST.ivaExempt).toBe(true)
    expect(TEMU_USA_CONTRAST.taxUsd).toBe(0)
    expect(TEMU_USA_CONTRAST.valueUsd).toBeLessThanOrEqual(USA_IVA_EXEMPTION_USD)
  })
})

describe('la página sostiene lo que afirma', () => {
  // La regla de oro del repo: ningún importe sin una URL oficial que lo respalde. Un catálogo de
  // fuentes que apunta a prensa o a un blog no sirve para sostener una cifra legal.
  const OFICIALES = /^https:\/\/(www\.)?(impo\.com\.uy|[a-z-]+\.gub\.uy|gub\.uy)\//

  it('cita solamente fuentes primarias uruguayas', () => {
    expect(TEMU_SOURCES.length).toBeGreaterThan(0)
    for (const source of TEMU_SOURCES) {
      expect(source.url, source.label).toMatch(OFICIALES)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('ninguna plataforma queda anunciada como exonerada', () => {
    expect(TEMU_PLATFORMS.length).toBeGreaterThan(0)
    for (const platform of TEMU_PLATFORMS) {
      expect(platform.invoicedFrom).toBe('Fuera de EE.UU.')
    }
  })

  it('el FAQ no repite preguntas ni deja una respuesta vacía', () => {
    const ids = TEMU_FAQ.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const item of TEMU_FAQ) {
      expect(item.question.endsWith('?')).toBe(true)
      expect(item.answer.length).toBeGreaterThan(40)
    }
  })

  it('declara cuándo se verificaron las normas', () => {
    expect(TEMU_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
