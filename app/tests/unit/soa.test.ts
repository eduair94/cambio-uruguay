// Lo que este test fija del catálogo del SOA (`utils/soa.ts`).
//
// No mide que el archivo exista: mide las cuatro cosas que, si se mueven, publican un dato falso
// en una página que cita la ley artículo por artículo.
//
//  1. EL TOPE Y EL SNIPPET NO PUEDEN DIVERGIR. La descripción de la página es un literal (así la
//     mide el trinquete de los 155 caracteres de `seoDescriptionBudget.test.ts`, que sólo lee
//     literales), así que nada la ataría al catálogo si no fuera este test: alguien que corrija el
//     artículo 8 en `soa.ts` dejaría el SERP diciendo el tope viejo.
//  2. LA EQUIVALENCIA EN PESOS SE ABSTIENE. El tope está en UI y el valor de la UI se lee en vivo;
//     `soaCoverageInPesos` tiene que devolver `null` ante cualquier lectura que no sea un número
//     positivo, porque la alternativa es estampar un valor de hace meses como "hoy".
//  3. LA ESCALERA DEL ARTÍCULO 8 TIENE UN SOLO TRAMO VIGENTE, y es el más alto. Los otros dos se
//     conservan porque se citan como si fueran el de hoy; si alguna vez hubiera dos marcados
//     vigentes, la tabla de la página mostraría dos topes a la vez.
//  4. TODO DATO LLEVA SU ARTÍCULO Y SU URL. Es la regla de la página entera: un ítem sin fuente no
//     se puede publicar, y la URL tiene que apuntar a impo.com.uy, que es el texto oficial.
//
// Y una abstención: en ninguna parte del catálogo puede aparecer un PRECIO del seguro. El art. 11
// consagra la libertad de contratación y no hay cifra oficial que citar; publicar una cuenta propia
// sería una estimación con apariencia de dato.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  SOA_COVERAGE_STEPS,
  SOA_COVERAGE_UI,
  SOA_COVERED,
  SOA_DEADLINES,
  SOA_ENFORCEMENT,
  SOA_EXCLUDED_VEHICLES,
  SOA_FAQ,
  SOA_NON_THIRD_PARTIES,
  SOA_SOURCES,
  SOA_SPECIAL_COVERAGE,
  SOA_VERIFIED_AT,
  soaCoverageInPesos,
} from '../../utils/soa'

const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'seguro-obligatorio-de-auto-uruguay.vue'),
  'utf8'
)

const ALL_ITEMS = [
  ...SOA_NON_THIRD_PARTIES,
  ...SOA_COVERED,
  ...SOA_EXCLUDED_VEHICLES,
  ...SOA_DEADLINES,
  ...SOA_SPECIAL_COVERAGE,
  ...SOA_ENFORCEMENT,
]

describe('el tope del artículo 8', () => {
  it('es 250.000 UI, que es el tramo vigente desde el tercer año', () => {
    expect(SOA_COVERAGE_UI).toBe(250_000)
  })

  it('tiene exactamente un tramo vigente, y es el más alto de la escalera', () => {
    const current = SOA_COVERAGE_STEPS.filter(step => step.current)
    expect(current).toHaveLength(1)
    expect(current[0]!.ui).toBe(Math.max(...SOA_COVERAGE_STEPS.map(step => step.ui)))
  })

  it('conserva los dos tramos históricos que todavía se citan como vigentes', () => {
    expect(SOA_COVERAGE_STEPS.map(step => step.ui)).toEqual([150_000, 200_000, 250_000])
  })

  // El trinquete que ata el catálogo al SERP: la descripción es un literal y nada más la revisa.
  it('es el mismo número que publica la descripción de la página', () => {
    const described = PAGE.match(/^const description =\n\s*'([^']+)'/m)?.[1] ?? ''
    expect(described).not.toBe('')
    expect(described).toContain(SOA_COVERAGE_UI.toLocaleString('es-UY'))
  })
})

describe('la equivalencia en pesos se abstiene sin lectura en vivo', () => {
  it('convierte con un valor positivo', () => {
    expect(soaCoverageInPesos(6.5)).toBeCloseTo(250_000 * 6.5, 6)
  })

  it.each([null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'devuelve null ante %p en lugar de publicar una cuenta',
    value => {
      expect(soaCoverageInPesos(value as number | null | undefined)).toBeNull()
    }
  )
})

describe('cada dato del catálogo se puede citar', () => {
  it('tiene ítems en las seis listas', () => {
    expect(SOA_NON_THIRD_PARTIES.length).toBe(5) // los cinco literales del art. 6
    expect(SOA_EXCLUDED_VEHICLES.length).toBe(4) // los cuatro literales del art. 3
    expect(SOA_DEADLINES.length).toBe(2)
    expect(SOA_COVERED.length).toBeGreaterThanOrEqual(3)
    expect(SOA_SPECIAL_COVERAGE.length).toBeGreaterThanOrEqual(3)
    expect(SOA_ENFORCEMENT.length).toBeGreaterThanOrEqual(3)
  })

  it('cada ítem nombra su artículo y apunta al texto oficial', () => {
    for (const item of ALL_ITEMS) {
      expect(item.article, item.id).toMatch(/art/i)
      expect(item.url, item.id).toMatch(/^https:\/\/www\.impo\.com\.uy\/bases\/leyes\/18412-2008/)
      expect(item.detail.length, item.id).toBeGreaterThan(40)
      expect(item.detail, item.id).not.toBe(item.label)
    }
  })

  it('no repite ids dentro de una misma lista', () => {
    for (const list of [
      SOA_NON_THIRD_PARTIES,
      SOA_COVERED,
      SOA_EXCLUDED_VEHICLES,
      SOA_DEADLINES,
      SOA_SPECIAL_COVERAGE,
      SOA_ENFORCEMENT,
    ]) {
      const ids = list.map(item => item.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('todas las fuentes son de impo.com.uy y ninguna se repite', () => {
    expect(SOA_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of SOA_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
    const urls = SOA_SOURCES.map(source => source.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('fecha la verificación en formato ISO', () => {
    expect(SOA_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('las preguntas frecuentes', () => {
  it('contestan con el artículo, no en general', () => {
    expect(SOA_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const faq of SOA_FAQ) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true)
      expect(faq.answer.length, faq.question).toBeGreaterThan(80)
      expect(faq.answer, faq.question).toMatch(/arts?\.|artículo/i)
    }
  })

  it('no repite preguntas', () => {
    const questions = SOA_FAQ.map(faq => faq.question)
    expect(new Set(questions).size).toBe(questions.length)
  })
})

describe('la abstención sobre el precio', () => {
  // El art. 11 consagra la libertad de contratación: no hay precio oficial del SOA que citar, y la
  // multa del art. 25 está fijada en veces ese precio comercial, no en pesos. Un monto en pesos
  // escrito acá sería una estimación nuestra disfrazada de dato legal.
  it('no guarda ningún monto en pesos en el catálogo', () => {
    const source = readFileSync(join(__dirname, '..', '..', 'utils', 'soa.ts'), 'utf8')
    const bodies = ALL_ITEMS.flatMap(item => [item.label, item.detail])
      .concat(SOA_FAQ.flatMap(faq => [faq.question, faq.answer]))
      .join('\n')
    expect(bodies).not.toMatch(/\$\s?\d/)
    expect(bodies).not.toMatch(/\bpesos\s+\d/i)
    // Y la regla de la multa se publica tal cual la escribe la ley.
    expect(source).toContain('dos veces el importe promedio del costo del Seguro Obligatorio')
  })

  it('declara que la multa se mide contra el precio del propio seguro', () => {
    const fine = SOA_ENFORCEMENT.find(item => item.id === 'multa')
    expect(fine).toBeDefined()
    expect(fine!.detail).toMatch(/dos veces/i)
  })
})
