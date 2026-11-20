// El catálogo de /reclamar-sin-abogado-uruguay.
//
// Lo que se vigila acá no es la aritmética (es un 1 % y una multiplicación) sino las dos cosas que
// hacen publicable la página: que ningún monto en pesos se escape sin UR viva —el modo de fallar
// del repo es publicar una cifra que nadie fijó— y que cada fila siga nombrando su artículo. Un
// dato sin artículo al lado es exactamente lo que esta página existe para no hacer.
import { describe, expect, it } from 'vitest'

import {
  ABSENCE_OUTCOMES,
  CLAIM_CONTENT,
  CONCILIATION_EXCEPTIONS,
  CONSUMER_CLAIM_CAP_UR,
  CONSUMER_CLAIM_MAX_WITNESSES,
  CONSUMER_CLAIM_STAMP_PCT,
  CONSUMER_CLAIM_STEPS,
  GENERAL_NO_LAWYER_UR,
  SMALL_CLAIMS_FAQ,
  SMALL_CLAIMS_SOURCES,
  SMALL_CLAIMS_VERIFIED_AT,
  SMALL_CLAIM_ROUTES,
  consumerClaimStamp,
  smallClaimPesos,
} from '../../utils/smallClaims'

describe('los topes', () => {
  it('son los de la Ley 18.507 art. 1 y del CGP art. 37.2', () => {
    expect(CONSUMER_CLAIM_CAP_UR).toBe(100)
    expect(GENERAL_NO_LAWYER_UR).toBe(20)
    expect(CONSUMER_CLAIM_STAMP_PCT).toBe(1)
    expect(CONSUMER_CLAIM_MAX_WITNESSES).toBe(3)
  })

  it('la vía de consumo admite más que la general: si se invirtiera, la página mentiría', () => {
    expect(CONSUMER_CLAIM_CAP_UR).toBeGreaterThan(GENERAL_NO_LAWYER_UR)
  })
})

describe('smallClaimPesos', () => {
  it('multiplica el tope por la UR y redondea', () => {
    expect(smallClaimPesos(100, 1921.36)).toBe(192136)
    expect(smallClaimPesos(20, 1921.36)).toBe(38427)
  })

  it('devuelve null sin UR viva en vez de inventar un monto', () => {
    for (const bad of [null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(smallClaimPesos(100, bad as number)).toBeNull()
  })

  it('devuelve null ante un tope que no es un número positivo', () => {
    for (const bad of [0, -5, Number.NaN]) expect(smallClaimPesos(bad, 1921.36)).toBeNull()
  })
})

describe('consumerClaimStamp', () => {
  it('es el 1 % del monto reclamado, redondeado', () => {
    expect(consumerClaimStamp(20000)).toBe(200)
    expect(consumerClaimStamp(192136)).toBe(1921)
    expect(consumerClaimStamp(1250)).toBe(13)
  })

  it('no devuelve un timbre para un monto que no se declaró', () => {
    for (const bad of [0, -100, Number.NaN]) expect(consumerClaimStamp(bad)).toBeNull()
  })
})

describe('las filas citan su norma', () => {
  it('cada vía nombra su artículo y su tribunal', () => {
    expect(SMALL_CLAIM_ROUTES).toHaveLength(2)
    for (const route of SMALL_CLAIM_ROUTES) {
      expect(route.articulo).toMatch(/art/i)
      expect(route.court.length).toBeGreaterThan(5)
      expect(route.capUr).toBeGreaterThan(0)
    }
  })

  it('sólo la vía general exige conciliación previa (CGP art. 294 num. 6 exceptúa el consumo)', () => {
    const consumo = SMALL_CLAIM_ROUTES.find(r => r.id === 'consumo')!
    const general = SMALL_CLAIM_ROUTES.find(r => r.id === 'general')!
    expect(consumo.conciliacionPrevia).toBe(false)
    expect(general.conciliacionPrevia).toBe(true)
  })

  it('cada paso del proceso nombra su artículo', () => {
    expect(CONSUMER_CLAIM_STEPS.length).toBeGreaterThanOrEqual(6)
    for (const step of CONSUMER_CLAIM_STEPS) {
      expect(step.articulo).toMatch(/art/i)
      expect(step.detail.length).toBeGreaterThan(20)
    }
    expect(new Set(CONSUMER_CLAIM_STEPS.map(s => s.id)).size).toBe(CONSUMER_CLAIM_STEPS.length)
  })

  it('cada inasistencia nombra su artículo del CGP', () => {
    expect(ABSENCE_OUTCOMES).toHaveLength(2)
    for (const row of ABSENCE_OUTCOMES) expect(row.articulo).toMatch(/CGP art\. 340/)
  })

  it('cada respuesta de las preguntas frecuentes cita una norma', () => {
    expect(SMALL_CLAIMS_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const item of SMALL_CLAIMS_FAQ) {
      expect(item.answer).toMatch(/art\.|artículo|Ley/)
      expect(item.question.endsWith('?')).toBe(true)
    }
    expect(new Set(SMALL_CLAIMS_FAQ.map(f => f.id)).size).toBe(SMALL_CLAIMS_FAQ.length)
  })

  it('el contenido del escrito son los siete requisitos del CGP art. 117', () => {
    expect(CLAIM_CONTENT).toHaveLength(7)
    expect(CONCILIATION_EXCEPTIONS.length).toBeGreaterThanOrEqual(7)
  })
})

describe('las fuentes', () => {
  it('son todas de impo.com.uy y traen la fecha en que se leyeron', () => {
    expect(SMALL_CLAIMS_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const source of SMALL_CLAIMS_SOURCES) {
      expect(source.url.startsWith('https://www.impo.com.uy/')).toBe(true)
      expect(source.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('ninguna fuente se repite', () => {
    expect(new Set(SMALL_CLAIMS_SOURCES.map(s => s.url)).size).toBe(SMALL_CLAIMS_SOURCES.length)
  })

  it('la fecha de verificación es una fecha ISO', () => {
    expect(SMALL_CLAIMS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
