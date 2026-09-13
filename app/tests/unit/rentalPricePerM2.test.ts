// "Menor precio por m²" ordena por una cifra que también se muestra en la tarjeta, y existe en dos
// formas: la función (tarjeta) y la expresión de Mongo (orden). Si divergen, la página ordena por
// un número y muestra otro. Este archivo prueba la regla con casos medidos el 2026-09-13 y las dos
// formas una contra la otra con un evaluador mínimo de agregación.
import { describe, expect, it } from 'vitest'
import {
  RENTAL_PRICE_PER_M2_SORT_FIELDS,
  rentalPricePerM2,
  rentalPricePerM2Expression,
  rentalPricePerM2Stages,
  type RentalPricePerM2Input,
} from '~/utils/rentalPricePerM2'
import { normalizeRentalQuery, rentalMongoSort, RENTAL_SORTS } from '~/utils/rentals'

type Doc = Record<string, unknown>

/** Sólo los operadores que usa la expresión; uno nuevo tiene que modelarse acá a propósito. */
function evaluate(expr: unknown, doc: Doc, vars: Doc = {}): unknown {
  if (typeof expr === 'string') {
    if (expr.startsWith('$$')) return vars[expr.slice(2)] ?? null
    if (expr.startsWith('$')) return doc[expr.slice(1)] ?? null
    return expr
  }
  if (Array.isArray(expr)) return expr.map(item => evaluate(item, doc, vars))
  if (expr === null || typeof expr !== 'object') return expr
  const [op, arg] = Object.entries(expr as Doc)[0]!
  const all = () => (arg as unknown[]).map(item => evaluate(item, doc, vars))
  // Orden BSON entre null y números: null va antes que cualquier número.
  const compare = (a: unknown, b: unknown) =>
    a === null ? (b === null ? 0 : -1) : b === null ? 1 : (a as number) - (b as number)
  switch (op) {
    case '$let': {
      const { vars: definitions, in: body } = arg as { vars: Doc; in: unknown }
      const scope = { ...vars }
      for (const [name, value] of Object.entries(definitions))
        scope[name] = evaluate(value, doc, vars)
      return evaluate(body, doc, scope)
    }
    case '$cond': {
      const [condition, then, otherwise] = arg as unknown[]
      return evaluate(condition, doc, vars) ? evaluate(then, doc, vars) : evaluate(otherwise, doc, vars)
    }
    case '$and':
      return (arg as unknown[]).every(item => Boolean(evaluate(item, doc, vars)))
    case '$or':
      return (arg as unknown[]).some(item => Boolean(evaluate(item, doc, vars)))
    case '$not':
      return !evaluate((arg as unknown[])[0], doc, vars)
    case '$in': {
      const [value, list] = all()
      return (list as unknown[]).includes(value)
    }
    case '$isNumber':
      return typeof evaluate(arg, doc, vars) === 'number'
    case '$eq': {
      const [a, b] = all()
      return a === b
    }
    case '$gt': {
      const [a, b] = all()
      return compare(a, b) > 0
    }
    case '$gte': {
      const [a, b] = all()
      return compare(a, b) >= 0
    }
    case '$lte': {
      const [a, b] = all()
      return compare(a, b) <= 0
    }
    case '$divide': {
      const [a, b] = all() as number[]
      return a! / b!
    }
    case '$add':
      return (all() as number[]).reduce((sum, value) => sum + value, 0)
    case '$multiply':
      return (all() as number[]).reduce((product, value) => product * value, 1)
    case '$max':
      return Math.max(...(all() as number[]))
    case '$switch': {
      const { branches, default: fallback } = arg as {
        branches: Array<{ case: unknown; then: unknown }>
        default: unknown
      }
      for (const branch of branches)
        if (evaluate(branch.case, doc, vars)) return evaluate(branch.then, doc, vars)
      return evaluate(fallback, doc, vars)
    }
    default:
      throw new Error(`Operador no modelado en el test: ${op}`)
  }
}

const home = (
  propertyType: string,
  area: number | null,
  bedrooms: number | null,
  priceUyu: number
): RentalPricePerM2Input => ({ propertyType, area, bedrooms, priceUyu })

// Casos reales o calcados de filas reales de la colección (2026-09-13).
const CASES: Array<[string, RentalPricePerM2Input, number | null]> = [
  ['2 dormitorios, 65 m², $29.000', home('apartamento', 65, 2, 29000), 29000 / 65],
  ['1 dormitorio con 55.000 m² (tipeo)', home('apartamento', 55000, 1, 22900), null],
  ['1 dormitorio con 555 m²', home('apartamento', 555, 1, 27900), null],
  ['3 dormitorios, 72 m² a $8.300: debajo del piso', home('apartamento', 72, 3, 8300), null],
  ['casa de balneario con el terreno como superficie', home('casa', 305, 4, 10000), null],
  ['casa del interior, 3 dormitorios, 200 m², $22.000', home('casa', 200, 3, 22000), 110],
  ['habitación de residencia estudiantil', home('habitacion', 60, 1, 9000), null],
  ['temporada con 1 m²', home('apartamento', 1, 2, 466313), null],
  ['14 m² no alcanza', home('apartamento', 14, 0, 9000), null],
  ['monoambiente de 15 m²', home('apartamento', 15, 0, 9000), 600],
  ['sin dormitorios publicados: tope de 400 m²', home('apartamento', 400, null, 200000), 500],
  ['sin dormitorios publicados, 401 m²', home('apartamento', 401, null, 200000), null],
  ['galpón: sin piso ni tope', home('local', 2000, null, 150000), 75],
  ['sin superficie', home('apartamento', null, 2, 30000), null],
  ['sin precio', home('oficina', 80, null, 0), null],
]

describe('regla de precio por m²', () => {
  it.each(CASES)('%s', (_label, input, expected) => {
    const actual = rentalPricePerM2(input)
    if (expected === null) expect(actual).toBeNull()
    else expect(actual).toBeCloseTo(expected, 9)
  })
})

describe('la expresión de Mongo es la misma regla', () => {
  it.each(CASES)('%s', (_label, input) => {
    expect(evaluate(rentalPricePerM2Expression(), { ...input })).toEqual(rentalPricePerM2(input))
  })

  it('coincide en un barrido de tipos, superficies, dormitorios y precios', () => {
    const types = ['apartamento', 'casa', 'habitacion', 'oficina', 'local', 'terreno', 'otro']
    const areas = [null, 0, 14.9, 15, 50, 180, 181, 260, 400, 401, 5000, 1_000_000, 1_000_001]
    const bedrooms = [null, 0, 1, 2, 5]
    const prices = [0, 1500, 8000, 30000, 120000]
    let compared = 0
    for (const propertyType of types)
      for (const area of areas)
        for (const rooms of bedrooms)
          for (const priceUyu of prices) {
            const input = home(propertyType, area, rooms, priceUyu)
            expect(evaluate(rentalPricePerM2Expression(), { ...input })).toEqual(
              rentalPricePerM2(input)
            )
            compared++
          }
    expect(compared).toBe(7 * 13 * 5 * 5)
  })

  it('marca como desconocido lo que la regla no puede afirmar', () => {
    const [value, unknown] = rentalPricePerM2Stages() as Array<{ $set: Doc }>
    expect(Object.keys(value!.$set)).toEqual(['_rentalPricePerM2'])
    expect(unknown!.$set._rentalPricePerM2Unknown).toEqual({ $eq: ['$_rentalPricePerM2', null] })
  })
})

describe('orden "Menor precio por m²"', () => {
  it('se puede pedir por URL y aparece entre las opciones', () => {
    expect(normalizeRentalQuery({ sort: 'precio-m2' }).sort).toBe('precio-m2')
    expect(RENTAL_SORTS.some(option => option.value === 'precio-m2')).toBe(true)
  })

  it('manda al final lo desconocido y desempata como los demás órdenes', () => {
    expect(rentalMongoSort('precio-m2')).toEqual({
      _rentalPricePerM2Unknown: 1,
      _rentalPricePerM2: 1,
      priceUyu: 1,
      key: 1,
    })
    for (const field of RENTAL_PRICE_PER_M2_SORT_FIELDS)
      expect(Object.keys(rentalMongoSort('precio-m2'))).toContain(field)
  })
})
