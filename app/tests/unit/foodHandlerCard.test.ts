// El catálogo de `/carne-de-manipulacion-de-alimentos-uruguay`.
//
// POR QUÉ ESTE ARCHIVO. La página entera es una afirmación por departamento —cuánto cobra, cuánto
// dura, por dónde se hace— y cada una sale de una ficha oficial distinta. El modo de fallar no es
// que la página rompa: es que alguien rellene un hueco. Las tres cosas que este test impide son
// exactamente las tres tentaciones:
//
//   1. Poner una vigencia donde la ficha no publica ninguna (tres de las siete no la publican).
//   2. Convertir a pesos un importe que la ficha expresa en UR. Canelones habla de una «U.R.
//      Municipal» que se ajusta semestralmente y no dice que sea la del INE: `costPesos` tiene que
//      quedar en `null` para toda fila que no cobre en pesos.
//   3. Que el snippet publique un rango que el catálogo ya no respalda. El título dice «de $ 0 a
//      $ 850» y esas dos cifras tienen que salir de `foodHandlerPesoRange()`, no de la memoria de
//      quien lo escribió.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  FOOD_HANDLER_CHECKED_AT,
  FOOD_HANDLER_DEPARTMENTS,
  FOOD_HANDLER_FAQS,
  FOOD_HANDLER_NATIONAL_RULES,
  FOOD_HANDLER_RELATED,
  FOOD_HANDLER_SOURCES,
  FOOD_HANDLER_TOTAL_DEPARTMENTS,
  FOOD_HANDLER_WITHOUT_SHEET,
  foodHandlerChannelLabel,
  foodHandlerPesoRange,
  foodHandlerValidityLabel,
  foodHandlerValidityYears,
  foodHandlerWithoutValidity,
} from '../../utils/foodHandlerCard'

const PAGE = join(__dirname, '..', '..', 'pages', 'carne-de-manipulacion-de-alimentos-uruguay.vue')
const source = readFileSync(PAGE, 'utf8')

/** El literal de un `const <name> = '…'` del nivel superior del `<script setup>`. */
function pageLiteral(name: string): string {
  const match = source.match(new RegExp(`\\nconst ${name} =\\s*\\n?\\s*'((?:[^'\\\\]|\\\\.)*)'`))
  if (!match) throw new Error(`no se pudo leer el literal \`${name}\` de la página`)
  return match[1]!
}

/**
 * Los dominios oficiales que esta página acepta como respaldo. Es la misma lista que la regla de
 * fuentes del repo: normativa y trámites del Estado, más el portal propio de cada intendencia.
 */
const OFFICIAL_HOSTS = [/\.gub\.uy$/, /^gub\.uy$/, /^www\.impo\.com\.uy$/]

describe('las fuentes del carné de manipulación', () => {
  it('son todas oficiales y con URL https', () => {
    for (const s of FOOD_HANDLER_SOURCES) {
      const url = new URL(s.url)
      expect(url.protocol, s.url).toBe('https:')
      expect(
        OFFICIAL_HOSTS.some(pattern => pattern.test(url.hostname)),
        `${s.url} no es un dominio oficial`
      ).toBe(true)
      expect(s.label.length).toBeGreaterThan(10)
      expect(s.publisher.length).toBeGreaterThan(3)
    }
  })

  it('no repite ninguna URL', () => {
    const urls = FOOD_HANDLER_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('cada departamento y cada regla apuntan a una fuente que existe', () => {
    for (const row of FOOD_HANDLER_DEPARTMENTS) {
      expect(FOOD_HANDLER_SOURCES[row.sourceIndex], row.department).toBeDefined()
    }
    for (const rule of FOOD_HANDLER_NATIONAL_RULES) {
      expect(FOOD_HANDLER_SOURCES[rule.sourceIndex], rule.headline).toBeDefined()
    }
  })
})

describe('las fichas departamentales', () => {
  it('cubren los 19 departamentos sin repetir ninguno', () => {
    const names = [
      ...FOOD_HANDLER_DEPARTMENTS.map(row => row.department),
      ...FOOD_HANDLER_WITHOUT_SHEET,
    ]
    expect(new Set(names).size).toBe(names.length)
    expect(FOOD_HANDLER_TOTAL_DEPARTMENTS).toBe(19)
    expect(names).toHaveLength(19)
  })

  it('sólo llevan importe en pesos las que la ficha publica en pesos', () => {
    for (const row of FOOD_HANDLER_DEPARTMENTS) {
      if (row.costKind === 'pesos' || row.costKind === 'sin-costo') {
        expect(row.costPesos, row.department).not.toBeNull()
        expect(row.costPesos, row.department).toBeGreaterThanOrEqual(0)
      } else {
        // La tentación que este test existe para frenar: convertir una UR a pesos.
        expect(row.costPesos, `${row.department} no puede declarar pesos`).toBeNull()
      }
      if (row.costKind === 'sin-costo') expect(row.costPesos, row.department).toBe(0)
    }
  })

  it('declaran la vigencia o declaran que no la publican, nunca una inventada', () => {
    for (const row of FOOD_HANDLER_DEPARTMENTS) {
      if (row.validityYears !== null) {
        expect(Number.isInteger(row.validityYears), row.department).toBe(true)
        expect(row.validityYears).toBeGreaterThan(0)
        expect(row.validityYears).toBeLessThanOrEqual(10)
      }
      expect(row.note.length, row.department).toBeGreaterThan(40)
      expect(row.documentName.length, row.department).toBeGreaterThan(5)
    }
    // Tres fichas no publican vigencia. Si alguna vez la publican, el número baja; si alguien se
    // la inventa, este test no lo ve, pero el de arriba exige que siga saliendo del catálogo.
    expect(foodHandlerWithoutValidity().sort()).toEqual(['Flores', 'Lavalleja', 'Maldonado'])
  })

  it('traen una fecha ISO de actualización, o null cuando la ficha no publica ninguna', () => {
    for (const row of FOOD_HANDLER_DEPARTMENTS) {
      if (row.updatedAt === null) continue
      expect(row.updatedAt, row.department).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(row.updatedAt).getTime(), row.department).not.toBeNaN()
      expect(row.updatedAt <= FOOD_HANDLER_CHECKED_AT, row.department).toBe(true)
    }
    expect(FOOD_HANDLER_CHECKED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('van ordenadas por lo que sale: primero los pesos, después las UR', () => {
    const pesos = FOOD_HANDLER_DEPARTMENTS.filter(row => row.costPesos !== null)
    const amounts = pesos.map(row => row.costPesos!)
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
    // Ninguna fila con importe en pesos aparece después de una que no lo tiene.
    const firstWithout = FOOD_HANDLER_DEPARTMENTS.findIndex(row => row.costPesos === null)
    const lastWith = FOOD_HANDLER_DEPARTMENTS.map(row => row.costPesos).lastIndexOf(
      amounts[amounts.length - 1]!
    )
    expect(lastWith).toBeLessThan(firstWithout)
  })
})

describe('los derivados que imprime la página', () => {
  it('calcula el rango en pesos sólo con lo publicado en pesos', () => {
    expect(foodHandlerPesoRange()).toEqual({ min: 0, max: 850 })
    expect(foodHandlerPesoRange([])).toBeNull()
  })

  it('lista las vigencias declaradas, ordenadas y sin repetir', () => {
    expect(foodHandlerValidityYears()).toEqual([3, 5])
  })

  it('rotula la vigencia y la vía en prosa', () => {
    expect(foodHandlerValidityLabel(null)).toBe('No la publica')
    expect(foodHandlerValidityLabel(1)).toBe('1 año')
    expect(foodHandlerValidityLabel(5)).toBe('5 años')
    expect(foodHandlerChannelLabel('en-linea')).toBe('En línea')
    expect(foodHandlerChannelLabel('mixto')).toBe('En línea y presencial')
    expect(foodHandlerChannelLabel('presencial')).toBe('Presencial')
  })
})

describe('el snippet publica el mismo rango que el catálogo', () => {
  const MAX_TITLE = 60
  const MAX_DESCRIPTION = 155
  const title = pageLiteral('title')
  const description = pageLiteral('description')
  const range = foodHandlerPesoRange()!

  it('entra en el SERP', () => {
    expect(`${title} | Cambio Uruguay`.length, title).toBeLessThanOrEqual(MAX_TITLE)
    expect(description.length, description).toBeLessThanOrEqual(MAX_DESCRIPTION)
  })

  it('el título trae las dos puntas del rango que calcula el catálogo', () => {
    expect(title).toContain(`$ ${range.min}`)
    expect(title).toContain(`$ ${range.max}`)
  })

  it('la descripción nombra las dos vigencias y la cantidad de fichas', () => {
    const years = foodHandlerValidityYears()
    for (const value of years) expect(description).toMatch(new RegExp(`\\b${value}\\b`))
    expect(description).toContain(`${FOOD_HANDLER_DEPARTMENTS.length} fichas`)
    expect(description).toContain(`$ ${range.max}`)
  })
})

describe('las preguntas y los enlaces', () => {
  it('tienen pregunta y respuesta con sustancia', () => {
    expect(FOOD_HANDLER_FAQS.length).toBeGreaterThanOrEqual(5)
    for (const faq of FOOD_HANDLER_FAQS) {
      expect(faq.q.trim().endsWith('?'), faq.q).toBe(true)
      expect(faq.a.length, faq.q).toBeGreaterThan(80)
    }
    const questions = FOOD_HANDLER_FAQS.map(faq => faq.q)
    expect(new Set(questions).size).toBe(questions.length)
  })

  it('apuntan a rutas internas del propio sitio', () => {
    for (const link of FOOD_HANDLER_RELATED) {
      expect(link.to.startsWith('/'), link.to).toBe(true)
      expect(link.to).not.toContain('://')
      expect(link.label.length).toBeGreaterThan(3)
    }
    const routes = FOOD_HANDLER_RELATED.map(link => link.to)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('las reglas nacionales llevan su transcripción textual y su apartado', () => {
    for (const rule of FOOD_HANDLER_NATIONAL_RULES) {
      expect(rule.quote.length, rule.headline).toBeGreaterThan(80)
      expect(rule.article, rule.headline).toMatch(/5\.5\.\d/)
    }
  })
})
