import { describe, expect, it } from 'vitest'

import {
  CAJ_CADUCIDAD_DIAS,
  CAJ_CASES,
  CAJ_FAQS,
  CAJ_FEES,
  CAJ_LEY_19791,
  CAJ_SOURCES,
  CAJ_UNPUBLISHED,
  expiresOn,
  pesosForUi,
} from '../../utils/criminalRecord'

describe('los precios salen de la ficha y viven en UI', () => {
  // La regla del módulo: acá no puede haber un importe en pesos escrito a mano,
  // porque la UI se mueve todos los días y el número sería viejo mañana.
  it('publica las dos modalidades con el precio en UI de la ficha', () => {
    expect(CAJ_FEES.map(f => [f.key, f.ui])).toEqual([
      ['comun', 26.5],
      ['urgente', 53.1],
    ])
  })

  it('cobra el urgente exactamente al doble que el común, como la ficha', () => {
    const comun = CAJ_FEES.find(f => f.key === 'comun')!
    const urgente = CAJ_FEES.find(f => f.key === 'urgente')!
    // 53,10 / 26,50 = 2,004: la ficha no lo llama «el doble», así que el test
    // fija la relación medida y no una redonda que no está publicada.
    expect(urgente.ui / comun.ui).toBeCloseTo(2.004, 3)
    expect(urgente.urgente).toBe(true)
    expect(comun.urgente).toBe(false)
  })

  it('el certificado de la Ley 19.791 cuesta lo mismo que el común', () => {
    expect(CAJ_LEY_19791.ui).toBe(CAJ_FEES.find(f => f.key === 'comun')!.ui)
  })
})

describe('pesosForUi convierte sólo cuando puede', () => {
  it('convierte con el valor de la UI del día y redondea a peso entero', () => {
    // 26,5 UI x 6,58 = 174,37 -> 174
    expect(pesosForUi(26.5, 6.58)).toBe(174)
    // 53,1 UI x 6,58 = 349,398 -> 349
    expect(pesosForUi(53.1, 6.58)).toBe(349)
  })

  it('devuelve null en vez de inventar una conversión', () => {
    // El caso que importa: sin valor de UI la página tiene que mostrar el precio
    // en UI, no un peso fabricado ni un 0 que parece un precio real.
    expect(pesosForUi(26.5, null)).toBeNull()
    expect(pesosForUi(26.5, undefined)).toBeNull()
    expect(pesosForUi(26.5, 0)).toBeNull()
    expect(pesosForUi(26.5, -3)).toBeNull()
    expect(pesosForUi(26.5, Number.NaN)).toBeNull()
    expect(pesosForUi(26.5, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('rechaza un precio en UI que no es un precio', () => {
    expect(pesosForUi(0, 6.58)).toBeNull()
    expect(pesosForUi(Number.NaN, 6.58)).toBeNull()
  })
})

describe('la caducidad se cuenta desde que se expide', () => {
  it('vence a los 90 días', () => {
    expect(CAJ_CADUCIDAD_DIAS).toBe(90)
    expect(expiresOn(new Date('2026-09-13T00:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2026-12-12'
    )
  })

  it('cruza el fin de año sin romperse', () => {
    expect(expiresOn(new Date('2026-11-15T00:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2027-02-13'
    )
  })

  it('no muta la fecha que recibe', () => {
    const issued = new Date('2026-09-13T00:00:00Z')
    expiresOn(issued)
    expect(issued.toISOString().slice(0, 10)).toBe('2026-09-13')
  })
})

describe('la página sostiene lo que afirma', () => {
  it('cada fuente es un organismo oficial uruguayo', () => {
    expect(CAJ_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const source of CAJ_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?(gub\.uy|impo\.com\.uy)\//)
      // La etiqueta es la cita textual: sin ella la URL sola no prueba nada.
      expect(source.label.length).toBeGreaterThan(40)
    }
  })

  it('distingue los dos certificados y manda el pasaporte a su propio trámite', () => {
    const keys = CAJ_CASES.map(c => c.key)
    expect(keys).toContain('ley-19791')
    expect(keys).toContain('pasaporte')
    expect(new Set(keys).size).toBe(CAJ_CASES.length)
  })

  it('declara lo que NO contesta en vez de inventarlo', () => {
    // El contrapeso: si esta lista se vacía, alguien contestó de memoria una de
    // las tres preguntas que la ficha oficial no trae.
    expect(CAJ_UNPUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of CAJ_UNPUBLISHED) {
      expect(item.question.length).toBeGreaterThan(10)
      expect(item.answer.length).toBeGreaterThan(40)
    }
  })

  it('no deja ningún importe en pesos escrito a mano en las FAQ salvo el del pasaporte', () => {
    // Los únicos pesos citables son los de la ficha del pasaporte, que SÍ los
    // publica en pesos y con fecha de vigencia.
    const pesos = CAJ_FAQS.flatMap(f => [...f.answer.matchAll(/\$\s?[\d.]+/g)].map(m => m[0]))
    expect(pesos).toEqual(['$175', '$1.402'])
  })
})
