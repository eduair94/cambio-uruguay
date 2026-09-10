// app/tests/unit/mercadoPagoPromos.test.ts
import { describe, expect, it } from 'vitest'

import {
  MERCADO_PAGO_PROMOS,
  MERCADO_PAGO_PROMOS_REVIEWED,
  MERCADO_PAGO_UNAVAILABLE,
  mercadoPagoDaysLeft,
  mercadoPagoPromoFor,
  mercadoPagoSaturation,
  mercadoPagoSavings,
  mercadoPagoStatus,
} from '../../utils/mercadoPagoPromos'

const AHORA = new Date('2026-09-10T12:00:00Z')

describe('el dataset', () => {
  it('lleva fecha de lectura y cada fila enlaza sus términos oficiales', () => {
    expect(MERCADO_PAGO_PROMOS_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const p of MERCADO_PAGO_PROMOS) {
      expect(p.termsUrl).toContain(`/campaign/${p.campaignId}/terms/html`)
      expect(p.campaignId).toMatch(/^\d+$/)
    }
  })

  it('no repite campañas ni atribuye una marca a dos campañas', () => {
    const ids = MERCADO_PAGO_PROMOS.map(p => p.campaignId)
    expect(new Set(ids).size).toBe(ids.length)
    const brands = MERCADO_PAGO_PROMOS.flatMap(p => p.bankosBrandIds)
    expect(new Set(brands).size).toBe(brands.length)
  })

  it('declara la campaña que la página enlaza y Mercado Pago ya no sirve', () => {
    expect(MERCADO_PAGO_UNAVAILABLE).toContain('12445280')
    expect(MERCADO_PAGO_PROMOS.some(p => p.campaignId === '12445280')).toBe(false)
  })

  it('toda campaña topeada dice sobre qué período topea', () => {
    for (const p of MERCADO_PAGO_PROMOS) {
      if (p.capUyu !== null) expect(p.capPeriod).not.toBeNull()
    }
  })

  it('toda discrepancia declarada viene explicada, no sólo marcada', () => {
    for (const p of MERCADO_PAGO_PROMOS) {
      if (p.disagreement) expect(p.disagreement.length).toBeGreaterThan(40)
    }
  })

  it('la campaña que no se pudo atribuir no se le cuelga a ninguna marca', () => {
    const suelta = MERCADO_PAGO_PROMOS.find(p => p.campaignId === '13535609')!
    expect(suelta.bankosBrandIds).toEqual([])
    expect(suelta.disagreement).toBeTruthy()
  })
})

describe('mercadoPagoPromoFor', () => {
  it('encuentra la campaña de una marca del mapa de Bankos', () => {
    expect(mercadoPagoPromoFor('mcdonalds')?.campaignId).toBe('14063740')
    expect(mercadoPagoPromoFor('guapa!')?.campaignId).toBe('13317324')
  })

  it('devuelve null para una marca sin campaña atribuida', () => {
    // La Espumería aparece en el mapa de Bankos, pero su tarjeta enlaza una campaña genérica.
    expect(mercadoPagoPromoFor('laespumeria')).toBeNull()
    expect(mercadoPagoPromoFor('')).toBeNull()
    expect(mercadoPagoPromoFor(null)).toBeNull()
  })
})

describe('el tope, que es el dato que falta', () => {
  it('un 20 % con tope de $ 300 se agota a los $ 1.500 de consumo', () => {
    const mcdonalds = mercadoPagoPromoFor('mcdonalds')!
    expect(mcdonalds.capUyu).toBe(300)
    expect(mercadoPagoSaturation(mcdonalds)).toBe(1_500)
  })

  it('con el mismo tope, un 20 % y un 10 % devuelven lo mismo a fin de mes', () => {
    const veinte = mercadoPagoPromoFor('mcdonalds')! // 20 %, tope 300
    const diez = mercadoPagoPromoFor('tata')! // 10 %, tope 300
    expect(mercadoPagoSavings(veinte, 10_000)).toBe(300)
    expect(mercadoPagoSavings(diez, 10_000)).toBe(300)
  })

  it('por debajo de la saturación el porcentaje sí manda', () => {
    const veinte = mercadoPagoPromoFor('mcdonalds')!
    const diez = mercadoPagoPromoFor('tata')!
    expect(mercadoPagoSavings(veinte, 1_000)).toBe(200)
    expect(mercadoPagoSavings(diez, 1_000)).toBe(100)
  })

  it('un consumo negativo no genera ahorro', () => {
    expect(mercadoPagoSavings(mercadoPagoPromoFor('tata')!, -500)).toBe(0)
  })

  it('sin porcentaje no hay cuenta que hacer', () => {
    expect(mercadoPagoSavings({ percent: null, capUyu: 300 }, 1_000)).toBeNull()
    expect(mercadoPagoSaturation({ percent: null, capUyu: 300 })).toBeNull()
  })

  it('el tope por campaña no se confunde con uno mensual', () => {
    const campania = MERCADO_PAGO_PROMOS.find(p => p.campaignId === '13535609')!
    expect(campania.capPeriod).toBe('campania')
    expect(campania.capUyu).toBe(10_000)
  })
})

describe('mercadoPagoStatus', () => {
  it('reconoce una campaña vigente', () => {
    expect(mercadoPagoStatus(mercadoPagoPromoFor('mcdonalds')!, AHORA)).toBe('vigente')
  })

  it('no declara vigente ni vencida la campaña que termina antes de empezar', () => {
    const alem = mercadoPagoPromoFor('veterinariaalem')!
    expect(alem.datesInconsistent).toBe(true)
    expect(mercadoPagoStatus(alem, AHORA)).toBe('indeterminado')
    expect(mercadoPagoDaysLeft(alem, AHORA)).toBeNull()
  })

  it('cuenta los días que faltan cuando las fechas son coherentes', () => {
    expect(mercadoPagoDaysLeft(mercadoPagoPromoFor('mcdonalds')!, AHORA)).toBe(21)
  })

  it('reconoce vencida y futura', () => {
    const base = { datesInconsistent: false }
    expect(
      mercadoPagoStatus(
        { ...base, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2026-02-01T00:00:00.000Z' },
        AHORA
      )
    ).toBe('vencida')
    expect(
      mercadoPagoStatus(
        { ...base, startsAt: '2026-12-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' },
        AHORA
      )
    ).toBe('futura')
  })
})
