// El catálogo de `/carne-de-manipulacion-de-alimentos-uruguay`.
//
// POR QUÉ ESTE ARCHIVO. La página entera es una afirmación por departamento —cuánto cobra, cuánto
// dura, por dónde se hace— y cada una sale de una ficha oficial distinta. El modo de fallar no es
// que la página rompa: es que alguien rellene un hueco. Las tres cosas que este test impide son
// exactamente las tres tentaciones:
//
//   1. Poner una vigencia donde la fuente no publica ninguna (cuatro de las diez no la publican).
//   2. Convertir a pesos un importe que la ficha expresa en UR. Canelones habla de una «U.R.
//      Municipal» que se ajusta semestralmente y no dice que sea la del INE: `costPesos` tiene que
//      quedar en `null` para toda fila que no cobre en pesos.
//   3. Que el snippet publique un rango que el catálogo no respalda. El primer borrador titulaba
//      «de $ 0 a $ 850» como si fuera el rango del país, y Salto cobra $ 962: el rango de
//      `foodHandlerPesoRange()` es sólo el de las fuentes en pesos, así que el título no lleva
//      importes y la descripción tiene que traer el máximo que sale del catálogo.
//
// Y una cuarta, que nació de la verificación: cada importe y cada vigencia tienen que estar en la
// frase textual de su fuente (`quotes`), para que un número cambiado a mano no pase callado.
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
  foodHandlerFree,
  foodHandlerPesoRange,
  foodHandlerSourceLabel,
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
    // Cuatro fuentes no publican vigencia. Si alguna vez la publican, la lista cambia; si alguien
    // se la inventa, el test de las frases textuales de abajo lo frena.
    expect(foodHandlerWithoutValidity().sort()).toEqual([
      'Flores',
      'Lavalleja',
      'Maldonado',
      'Rivera',
    ])
  })

  it('cada importe en pesos y cada vigencia están en la frase textual de su fuente', () => {
    const YEAR_WORDS: Record<number, string> = { 3: 'tres', 5: 'cinco' }
    for (const row of FOOD_HANDLER_DEPARTMENTS) {
      expect(row.quotes.length, row.department).toBeGreaterThan(0)
      const text = row.quotes.join(' ')
      if (row.costKind === 'sin-costo') expect(text, row.department).toContain('No tiene costo')
      if (row.costKind === 'pesos') {
        expect(text.replace(/\s/g, ''), row.department).toContain(`$${row.costPesos}`)
      }
      if (row.validityYears !== null) {
        const asDigit = new RegExp(`\\b${row.validityYears} años`)
        const asWord = YEAR_WORDS[row.validityYears]
        expect(
          asDigit.test(text) || (asWord !== undefined && text.includes(`${asWord} años`)),
          `${row.department}: la vigencia no está en la frase de la fuente`
        ).toBe(true)
      }
    }
  })

  it('una noticia lleva fecha de publicación y se rotula noticia, no ficha', () => {
    for (const row of FOOD_HANDLER_DEPARTMENTS) {
      if (row.sourceKind === 'noticia') expect(row.updatedAt, row.department).not.toBeNull()
    }
    expect(foodHandlerSourceLabel('noticia')).toEqual({
      link: 'Noticia oficial',
      dated: 'publicada el',
    })
    expect(foodHandlerSourceLabel('ficha')).toEqual({
      link: 'Ficha oficial',
      dated: 'actualizada el',
    })
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
    expect(foodHandlerPesoRange()).toEqual({ min: 0, max: 962 })
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

  it('el título no publica un rango de importes como si fuera el del país', () => {
    // El rango en pesos deja afuera las UR (Canelones cobra 1 UR el urgente) y nueve departamentos.
    expect(title).not.toMatch(/\$/)
  })

  it('la descripción nombra las vigencias, el máximo en pesos y los que no cobran', () => {
    const years = foodHandlerValidityYears()
    for (const value of years) expect(description).toMatch(new RegExp(`\\b${value}\\b`))
    expect(description).toContain(`$ ${range.max}`)
    const top = FOOD_HANDLER_DEPARTMENTS.find(row => row.costPesos === range.max)!
    expect(description).toContain(top.department)
    expect(range.min).toBe(0)
    for (const name of foodHandlerFree()) expect(description).toContain(name)
    // La cantidad de fuentes sale del catálogo, y nunca vuelve a afirmar que la tabla es la
    // totalidad de lo publicado.
    const COUNT_WORDS: Record<number, string> = { 10: 'Diez' }
    expect(description).toContain(`${COUNT_WORDS[FOOD_HANDLER_DEPARTMENTS.length]} fuentes`)
    expect(description).not.toMatch(/fichas oficiales publicadas|por departamento/)
  })

  it('el texto de la página no afirma que la tabla es todo lo publicado', () => {
    expect(source).not.toMatch(/fichas oficiales\s+publicadas/)
    expect(source).not.toMatch(/el único de los siete/)
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
      // Cada apartado transcripto con su número está nombrado en la etiqueta, y al revés: el primer
      // borrador citaba 5.5.4 y parafraseaba 5.5.5 bajo la etiqueta del 5.5.4.
      const named = rule.article.match(/5\.5\.\d/g) ?? []
      const quoted = rule.quote.match(/5\.5\.\d(?=\.)/g) ?? []
      if (quoted.length > 0) expect([...quoted].sort()).toEqual([...named].sort())
    }
    const suspension = FOOD_HANDLER_NATIONAL_RULES.find(rule => /suspen/.test(rule.detail))!
    expect(suspension.article).toContain('5.5.5')
    expect(suspension.quote).toContain('quedará en suspenso la vigencia del carné de salud')
  })

  it('ningún «es el único» queda sin acotar a la tabla', () => {
    for (const row of FOOD_HANDLER_DEPARTMENTS) {
      if (/únic[oa]/.test(row.note)) {
        expect(row.note, row.department).toMatch(/De las fuentes de esta tabla, es la única/)
      }
    }
  })
})
