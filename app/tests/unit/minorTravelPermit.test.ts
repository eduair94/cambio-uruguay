import { describe, expect, it } from 'vitest'
import {
  PERMIT_APPEARANCES,
  PERMIT_DOCUMENTS,
  PERMIT_FEE_UI,
  PERMIT_POWERS,
  PERMIT_SOURCES,
  PERMIT_TRIP_STEPS,
  PERMIT_UNPUBLISHED,
  PERMIT_VARIANTS,
  PERMIT_WAIVERS,
  permitFaq,
  permitFeeInPesos,
} from '../../utils/minorTravelPermit'

describe('permitFeeInPesos', () => {
  it('convierte el arancel con el valor de la UI del día', () => {
    // 55,70 UI × 6,6792 = 372,0314… → la página publica dos decimales.
    expect(permitFeeInPesos(6.6792)).toBe(372.03)
  })

  it('multiplica por la cantidad de salidas, porque el arancel es por salida', () => {
    const una = permitFeeInPesos(6.6792, 1)!
    expect(permitFeeInPesos(6.6792, 3)).toBeCloseTo(una * 3, 1)
  })

  // El modo de fallar de una conversión así es publicar «$0» o «$NaN» cuando la API no contestó, y
  // un cero en el lugar de un arancel se lee como «es gratis», que es lo contrario del dato.
  it.each([null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'se abstiene con un valor de UI inservible (%s)',
    value => {
      expect(permitFeeInPesos(value as number | null | undefined)).toBeNull()
    }
  )

  it.each([0, -2, 1.5])('se abstiene con una cantidad de salidas imposible (%s)', trips => {
    expect(permitFeeInPesos(6.6792, trips)).toBeNull()
  })
})

describe('el catálogo del permiso de menor', () => {
  it('mantiene el arancel en UI y no en pesos', () => {
    // Si alguien lo pasa a pesos, el número queda viejo al día siguiente: la UI se ajusta a diario.
    expect(PERMIT_FEE_UI).toBe(55.7)
  })

  it('declara los doce tipos de permiso de la ficha, sin repetidos', () => {
    expect(PERMIT_VARIANTS).toHaveLength(12)
    expect(new Set(PERMIT_VARIANTS).size).toBe(12)
  })

  it('pone adelante los dos casos que resuelven la mayoría de los viajes', () => {
    expect(PERMIT_WAIVERS[0]!.id).toBe('ambos-padres')
    expect(PERMIT_WAIVERS[1]!.id).toBe('pasaporte-uruguayo')
  })

  it('no deja ningún caso ni documento sin texto', () => {
    for (const waiver of PERMIT_WAIVERS) expect(waiver.caso.length).toBeGreaterThan(10)
    for (const doc of PERMIT_DOCUMENTS) expect(doc.detalle.length).toBeGreaterThan(10)
    for (const row of PERMIT_APPEARANCES) expect(row.comparece.length).toBeGreaterThan(5)
    for (const item of PERMIT_UNPUBLISHED) expect(item.porQue.length).toBeGreaterThan(20)
  })

  it('guarda las dos vigencias de la carta poder tal como las publica la ficha', () => {
    expect(PERMIT_POWERS.map(power => power.dias)).toEqual([30, 180])
  })

  it('ordena los tramos de salidas de menor a mayor', () => {
    expect([...PERMIT_TRIP_STEPS]).toEqual([...PERMIT_TRIP_STEPS].sort((a, b) => a - b))
  })

  // La regla del repo: ninguna cifra sin fuente oficial. Estas son las que la página publica.
  it('cita sólo fuentes oficiales uruguayas', () => {
    expect(PERMIT_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of PERMIT_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.gub\.uy|www\.impo\.com\.uy)\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('incluye la ficha del arancel y la norma que habilita a exigir el permiso', () => {
    const urls = PERMIT_SOURCES.map(source => source.url).join(' ')
    expect(urls).toContain('permiso-menor-edad-menor-viaja-sin-padres-acompanado-solo-padre')
    expect(urls).toContain('leyes/18250-2008/29')
  })
})

describe('permitFaq', () => {
  it('mete el monto del día en la primera respuesta', () => {
    const faq = permitFaq('$372,03')
    expect(faq[0]!.answer).toContain('$372,03')
    expect(faq[0]!.answer).toContain('55,7 UI')
  })

  it('sin valor de UI publica la cifra en UI y ningún peso', () => {
    const faq = permitFaq(null)
    expect(faq[0]!.answer).toContain('55,7 UI')
    expect(faq[0]!.answer).not.toContain('$')
  })

  it('no repite preguntas', () => {
    const questions = permitFaq(null).map(item => item.question)
    expect(new Set(questions).size).toBe(questions.length)
  })
})
