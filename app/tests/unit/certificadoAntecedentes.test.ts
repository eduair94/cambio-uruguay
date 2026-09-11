import { describe, expect, it } from 'vitest'

import {
  ANTECEDENTES_FAQ,
  ANTECEDENTES_SOURCES,
  DESTINOS,
  LEY_19791_DELITOS,
  MODALIDADES,
  VIGENCIA_DIAS,
  sobreprecioUrgente,
  uiAPesos,
} from '../../utils/certificadoAntecedentes'

describe('las tarifas son las que publica la ficha del trámite', () => {
  it('tiene las dos modalidades con su tarifa y su plazo', () => {
    expect(MODALIDADES.map(m => m.id)).toEqual(['comun', 'urgente'])

    const comun = MODALIDADES.find(m => m.id === 'comun')!
    const urgente = MODALIDADES.find(m => m.id === 'urgente')!

    expect(comun.costoUi).toBe(26.5)
    expect(urgente.costoUi).toBe(53.1)

    // El plazo lleva su unidad adentro a propósito: la común se cuenta en días CORRIDOS y la
    // urgente en HÁBILES, y una tabla que dijera sólo «15» y «2» los haría comparables cuando no
    // lo son — 2 días hábiles pueden ser 4 corridos si cae un fin de semana en el medio.
    expect(comun.plazo).toContain('corridos')
    expect(urgente.plazo).toContain('hábiles')
  })

  it('caduca a los 90 días', () => {
    expect(VIGENCIA_DIAS).toBe(90)
  })
})

describe('el sobreprecio de la urgente se calcula, no se escribe', () => {
  it('sale de las dos tarifas vigentes', () => {
    // 53,10 / 26,50 − 1 = 1,0037…, o sea que apurarlo cuesta poco más del doble.
    expect(sobreprecioUrgente()).toBeCloseTo(53.1 / 26.5 - 1, 10)
    expect(sobreprecioUrgente()).toBeGreaterThan(1)
  })
})

describe('la conversión a pesos nunca muestra NaN', () => {
  it('multiplica cuando los dos valores son válidos', () => {
    expect(uiAPesos(26.5, 6.5)).toBeCloseTo(172.25, 10)
  })

  it.each([
    ['UI no numérica', Number.NaN, 6.5],
    ['valor no numérico', 26.5, Number.NaN],
    ['valor cero', 26.5, 0],
    ['monto negativo', -1, 6.5],
    ['valor negativo', 26.5, -6.5],
  ])('devuelve 0 con %s', (_caso, monto, valor) => {
    expect(uiAPesos(monto, valor)).toBe(0)
  })
})

describe('los destinos separan lo declarado de lo que la gente recibe', () => {
  it('admite los dos que la ficha nombra y rechaza el empleador y el alquiler', () => {
    const admitidos = DESTINOS.filter(d => d.admitido)
    const rechazados = DESTINOS.filter(d => !d.admitido)

    expect(admitidos).toHaveLength(2)
    expect(rechazados).toHaveLength(2)
    expect(admitidos.map(d => d.quien).join(' ')).toMatch(/organismo público/i)
    expect(admitidos.map(d => d.quien).join(' ')).toMatch(/consular/i)
  })

  it('cada destino explica por qué, porque el sí o el no solos no sirven de nada', () => {
    for (const destino of DESTINOS) expect(destino.detalle.length).toBeGreaterThan(60)
  })
})

describe('el alcance del certificado de la Ley 19.791 va completo', () => {
  // La lista ES el alcance: cualquier resumen («delitos sexuales») lo agranda o lo achica, y de eso
  // depende que alguien entienda si el certificado que le piden es este o el otro.
  it('lleva los once literales del artículo 1', () => {
    expect(LEY_19791_DELITOS).toHaveLength(11)
    expect(new Set(LEY_19791_DELITOS).size).toBe(11)
  })

  it('cada literal cita la norma de la que sale', () => {
    for (const delito of LEY_19791_DELITOS) {
      expect(delito, delito).toMatch(/Código Penal|Ley N° 17\.815/)
    }
  })
})

describe('nada se afirma sin fuente', () => {
  it('enlaza sólo dominios oficiales uruguayos', () => {
    expect(ANTECEDENTES_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of ANTECEDENTES_SOURCES) {
      expect(source.url, source.url).toMatch(/^https:\/\/www\.(gub\.uy|impo\.com\.uy)\//)
      expect(source.label.length).toBeGreaterThan(40)
    }
  })

  it('cita las dos fichas y los dos artículos de la Ley 19.791', () => {
    const urls = ANTECEDENTES_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('/tramites/certificado-antecedentes-judiciales')
    expect(urls).toContain('/bases/leyes/19791-2019/1')
    expect(urls).toContain('/bases/leyes/19791-2019/2')
  })

  it('deja la contradicción del costo a la vista en vez de resolverla', () => {
    // El art. 2 dice «no tendrá costo alguno para la institución solicitante» y la ficha del mismo
    // certificado publica 26,5 UI. La página no puede elegir una y callar la otra: si alguien
    // borra ese matiz de la FAQ, el sitio pasa a afirmar algo que sus fuentes no dicen.
    const respuesta = ANTECEDENTES_FAQ.find(f => /19\.791 es gratis/i.test(f.question))
    expect(respuesta).toBeDefined()
    expect(respuesta!.answer).toContain('no tendrá costo alguno para la institución solicitante')
    expect(respuesta!.answer).toContain('26,5 UI')
  })
})

describe('la FAQ contesta lo que se pregunta', () => {
  it('cubre precio, vigencia, empleador y alquiler', () => {
    const preguntas = ANTECEDENTES_FAQ.map(f => f.question.toLowerCase()).join(' | ')
    expect(preguntas).toMatch(/cuánto sale/)
    expect(preguntas).toMatch(/cuánto dura/)
    expect(preguntas).toMatch(/empresa privada/)
    expect(preguntas).toMatch(/alquilar/)
  })

  it('no repite una pregunta y todas tienen respuesta sustantiva', () => {
    expect(new Set(ANTECEDENTES_FAQ.map(f => f.question)).size).toBe(ANTECEDENTES_FAQ.length)
    for (const faq of ANTECEDENTES_FAQ) expect(faq.answer.length).toBeGreaterThan(80)
  })
})
