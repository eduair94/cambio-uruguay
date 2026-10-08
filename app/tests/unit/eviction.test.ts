// Los plazos de /desalojo-de-alquiler-uruguay, fijados contra el texto oficial.
//
// POR QUÉ: cada número de este catálogo es un plazo legal que alguien va a usar para decidir si
// paga, si contesta o si se muda. El modo de fallar no es una excepción: es un número que cambia
// sin que nadie lo note. Lo que estos tests fijan es la CIFRA de cada artículo citado, cotejada el
// 2026-10-08 contra impo.com.uy, más la sincronía entre la tabla y el snippet de la página.
//
// La cifra más importante del archivo es el 40 % del artículo 51 del Decreto-Ley 14.219, porque es
// la que estaba mal publicada en el sitio: el 60 % es la redacción ORIGINAL de 1974 y la Ley 15.799
// de 30/12/1985, art. 17, le dio nueva redacción. Las dos conviven en los buscadores, así que el
// test fija la vigente Y exige que la página siga diciendo cuál es la vieja.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  DL14219_SCOPE_CUTOFF,
  EVICTION_FAQ,
  EVICTION_REGIMES,
  EVICTION_SOURCES,
  EVICTION_VERIFIED_AT,
  EXCEPTIONAL_CAUSE_TERMS,
  NO_GUARANTEE_REQUIREMENTS,
  evictionRegime,
  evictionStep,
} from '../../utils/eviction'

const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'desalojo-de-alquiler-uruguay.vue'),
  'utf8'
)

describe('los plazos del régimen sin garantía (Ley 19.889)', () => {
  it('fija la mora en tres días hábiles desde el día hábil siguiente a la intimación', () => {
    const step = evictionStep('sinGarantia', 'mora')
    expect(step?.days).toBe(3)
    expect(step?.businessDays).toBe(true)
    expect(step?.article).toBe('Ley 19.889, art. 437')
  })

  it('fija el plazo para desocupar en seis días hábiles', () => {
    const step = evictionStep('sinGarantia', 'desalojo')
    expect(step?.days).toBe(6)
    expect(step?.businessDays).toBe(true)
    expect(step?.article).toBe('Ley 19.889, art. 439')
  })

  it('fija las excepciones y su traslado en seis días hábiles cada uno', () => {
    expect(evictionStep('sinGarantia', 'excepciones')?.days).toBe(6)
    expect(evictionStep('sinGarantia', 'traslado')?.days).toBe(6)
  })

  it('fija el lanzamiento en cinco días hábiles y la prórroga en cinco, una sola vez', () => {
    const lanzamiento = evictionStep('sinGarantia', 'lanzamiento')
    expect(lanzamiento?.days).toBe(5)
    expect(lanzamiento?.article).toBe('Ley 19.889, art. 442')
    const prorroga = evictionStep('sinGarantia', 'prorroga')
    expect(prorroga?.days).toBe(5)
    expect(prorroga?.deadline).toContain('una sola vez')
  })

  it('no le inventa plazo al paso que la ley deja sin plazo', () => {
    // El artículo 438 habilita a iniciar el desalojo y no dice cuándo: es el agujero por el que un
    // "cuánto tarda" se vuelve incontestable, y por eso se publica como ausencia y no como cero.
    const step = evictionStep('sinGarantia', 'monitorio')
    expect(step?.days).toBeNull()
    expect(step?.deadline).toBe('sin plazo legal')
  })

  it('exige las cinco condiciones del artículo 421, ni una menos', () => {
    expect(NO_GUARANTEE_REQUIREMENTS).toHaveLength(5)
    expect(NO_GUARANTEE_REQUIREMENTS.join(' ')).toContain('casa habitación')
    expect(NO_GUARANTEE_REQUIREMENTS.join(' ')).toContain('por escrito')
    expect(NO_GUARANTEE_REQUIREMENTS.join(' ')).toContain('someterse a esta ley')
  })
})

describe('los plazos del régimen común (Decreto-Ley 14.219)', () => {
  it('fija la mora en diez días hábiles siguientes a la intimación', () => {
    const step = evictionStep('comun', 'mora')
    expect(step?.days).toBe(10)
    expect(step?.businessDays).toBe(true)
    expect(step?.article).toBe('Decreto-Ley 14.219, art. 55')
  })

  it('fija el plazo para desocupar por mora en veinte días, que NO son hábiles', () => {
    const step = evictionStep('comun', 'desalojo')
    expect(step?.days).toBe(20)
    expect(step?.businessDays).toBe(false)
    expect(step?.article).toBe('Decreto-Ley 14.219, art. 48')
  })

  it('fija las excepciones en diez días hábiles y perentorios', () => {
    const step = evictionStep('comun', 'excepciones')
    expect(step?.days).toBe(10)
    expect(step?.article).toBe('Decreto-Ley 14.219, art. 47')
    expect(step?.detail).toContain('perentorios')
  })

  it('clausura el juicio con el 40 % vigente, y dice que el 60 % es el texto viejo', () => {
    const step = evictionStep('comun', 'clausura')
    expect(step?.deadline).toContain('40 %')
    expect(step?.deadline).toContain('una sola vez')
    expect(step?.detail).not.toMatch(/\b60 ?%.*(?:consignás|debés|pedí)/)
    expect(step?.detail).toContain('15.799')
    expect(step?.article).toBe('Decreto-Ley 14.219, art. 51')
  })

  it('distingue el 20 % que estira el plazo del 40 % que cierra el juicio', () => {
    // Son dos artículos y dos efectos distintos, y confundirlos le cuesta el inmueble a alguien:
    // el 40 % del art. 51 clausura el juicio, el 20 % del art. 52 sólo amplía el plazo.
    expect(evictionStep('comun', 'reforma')?.deadline).toContain('20 %')
    expect(evictionStep('comun', 'reforma')?.article).toBe('Decreto-Ley 14.219, art. 52')
  })

  it('fija los quince días hábiles de espera del lanzamiento y los sesenta de aplazamiento', () => {
    const step = evictionStep('comun', 'lanzamiento')
    expect(step?.days).toBe(15)
    expect(step?.businessDays).toBe(true)
    expect(step?.detail).toContain('sesenta días')
    expect(step?.article).toBe('Decreto-Ley 14.219, art. 62')
  })

  it('mantiene el año del artículo 32 fuera de los pasos por falta de pago', () => {
    const steps = evictionRegime('comun').steps.map(s => s.id)
    expect(steps).not.toContain('buenPagador')
    expect(EXCEPTIONAL_CAUSE_TERMS.map(t => t.deadline)).toContain('un año')
    expect(EXCEPTIONAL_CAUSE_TERMS.every(t => t.article.includes('art. 32'))).toBe(true)
  })

  it('fija el corte de alcance del artículo 102 en el 2 de junio de 1968', () => {
    expect(DL14219_SCOPE_CUTOFF).toBe('1968-06-02')
  })
})

describe('el catálogo se sostiene solo', () => {
  it('tiene los dos regímenes y ningún paso repetido dentro de uno', () => {
    expect(EVICTION_REGIMES.map(r => r.id).sort()).toEqual(['comun', 'sinGarantia'])
    for (const regime of EVICTION_REGIMES) {
      const ids = regime.steps.map(s => s.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(regime.steps.length).toBeGreaterThan(4)
    }
  })

  it('cada paso cita un artículo y enlaza a impo.com.uy', () => {
    for (const regime of EVICTION_REGIMES) {
      for (const step of regime.steps) {
        expect(step.article, step.id).toMatch(/art\.|arts\./)
        expect(step.url, step.id).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
        // El detalle tiene que agregar algo, no repetir el título del paso.
        expect(step.detail.length, step.id).toBeGreaterThan(step.label.length + 40)
      }
    }
  })

  it('las fuentes son todas de impo.com.uy y no se repiten', () => {
    expect(EVICTION_SOURCES.length).toBeGreaterThanOrEqual(8)
    for (const source of EVICTION_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(source.label.length).toBeGreaterThan(20)
    }
    const urls = EVICTION_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('cita la Ley 15.799, que es la que explica por qué el 60 % ya no rige', () => {
    expect(EVICTION_SOURCES.some(s => s.url.includes('15799-1985/17'))).toBe(true)
  })

  it('declara la fecha en que se cotejó, en ISO', () => {
    expect(EVICTION_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('tiene preguntas con respuesta propia y sin duplicados', () => {
    expect(EVICTION_FAQ.length).toBeGreaterThanOrEqual(6)
    const questions = EVICTION_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const entry of EVICTION_FAQ) {
      expect(entry.question.endsWith('?')).toBe(true)
      expect(entry.answer.length).toBeGreaterThan(120)
      expect(entry.short.length).toBeLessThan(90)
    }
  })

  it('no contesta cuánto tarda un desalojo en días', () => {
    // La abstención es parte del contenido: si alguien agrega un total, este test lo delata.
    const duration = EVICTION_FAQ.find(f => f.question.includes('Cuánto tarda'))
    expect(duration).toBeDefined()
    expect(duration?.answer).toContain('No hay una respuesta honesta en días')
  })
})

describe('el snippet de la página dice lo mismo que la tabla', () => {
  // La descripción es un literal (así la mide el trinquete de los 155 caracteres), así que la
  // sincronía con el catálogo no la da el compilador: la da este test.
  const description =
    PAGE.match(/const description =\s+'((?:[^'\\]|\\.)*)'/)?.[1] ??
    (() => {
      throw new Error('no se pudo leer la descripción de la página')
    })()

  it('entra en el SERP', () => {
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it('publica los tres plazos que la tabla publica', () => {
    expect(description).toContain(`${evictionStep('sinGarantia', 'desalojo')?.days} días hábiles`)
    expect(description).toContain(`y ${evictionStep('sinGarantia', 'lanzamiento')?.days} para`)
    expect(description).toContain(`${evictionStep('comun', 'desalojo')?.days} días`)
  })

  it('publica el 40 % y no el 60 %', () => {
    expect(description).toContain('40 %')
    expect(description).not.toContain('60 %')
  })

  it('declara el canonical absoluto de su propia ruta', () => {
    expect(PAGE).toContain(
      "const canonicalUrl = 'https://cambio-uruguay.com/desalojo-de-alquiler-uruguay'"
    )
  })
})
