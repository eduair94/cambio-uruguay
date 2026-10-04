import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CAR_BUDGETS,
  carBudgetDescription,
  carBudgetFaq,
  carBudgetPath,
  carBudgetTitle,
  formatUsd,
  parseCarBudget,
  type CarBudgetResponse,
} from '../../utils/carBudget'

const response = (over: Partial<CarBudgetResponse> = {}): CarBudgetResponse => ({
  budget: 6000,
  adverts: 759,
  models: [
    {
      marketSlug: 'chevrolet-corsa',
      brand: 'Chevrolet',
      model: 'Corsa',
      adverts: 53,
      medianUsd: 5700,
      medianYear: 2008,
      medianKm: 188500,
      hasPage: true,
    },
    {
      marketSlug: 'chevrolet-spark',
      brand: 'Chevrolet',
      model: 'Spark',
      adverts: 41,
      medianUsd: 5500,
      medianYear: 2009,
      medianKm: 135000,
      hasPage: false,
    },
    {
      marketSlug: 'volkswagen-gol',
      brand: 'Volkswagen',
      model: 'Gol',
      adverts: 24,
      medianUsd: 5495,
      medianYear: 1998,
      medianKm: 236000,
      hasPage: true,
    },
  ],
  listings: [],
  generatedAt: '2026-10-04T03:37:27.814Z',
  indexable: true,
  others: [10000, 15000, 20000, 30000],
  ...over,
})

describe('carBudget', () => {
  it('acepta sólo los topes del informe', () => {
    expect(parseCarBudget('6000')).toBe(6000)
    expect(parseCarBudget('30000')).toBe(30000)
    for (const bad of ['7000', '6000.5', 'abc', '', '06000', undefined, ['6000']])
      expect(parseCarBudget(bad)).toBeNull()
  })

  it('paridad con classes/autos/report.ts', () => {
    // report.ts escribe los topes con separador numérico (6_000): se quita antes de buscar.
    const source = readFileSync(resolve(__dirname, '../../../classes/autos/report.ts'), 'utf8')
    const literal = source.replace(/(\d)_(\d)/g, '$1$2').match(/\[\s*6000\s*,[^\]]*\]/)
    expect(literal, 'la lista de topes cambió de forma en report.ts').not.toBeNull()
    expect(JSON.parse(literal![0])).toEqual([...CAR_BUDGETS])
  })

  it('ruta, formato, title, description', () => {
    expect(carBudgetPath(6000)).toBe('/autos-usados-uruguay/hasta-6000-dolares')
    expect(formatUsd(6000)).toBe('US$ 6.000')
    expect(carBudgetTitle(6000)).toBe('Autos usados hasta US$ 6.000 en Uruguay')
    const description = carBudgetDescription(response())
    expect(description).toContain('Corsa')
    expect(description).toContain('759')
    expect(description.length).toBeLessThanOrEqual(155)
    for (const budget of CAR_BUDGETS) {
      expect(`${carBudgetTitle(budget)} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
      expect(carBudgetDescription(response({ budget, adverts: 12345 })).length).toBeLessThanOrEqual(
        155
      )
      expect(carBudgetDescription(response({ budget, models: [] })).length).toBeLessThanOrEqual(155)
    }
  })

  it('FAQ con modelos y años del tramo', () => {
    const faq = carBudgetFaq(response())
    expect(faq.map(item => item.question)).toEqual([
      '¿Qué auto usado comprar con US$ 6.000?',
      '¿Cuántos autos usados hay hasta US$ 6.000?',
      '¿De qué año es un auto usado de US$ 6.000?',
    ])
    expect(new Set(faq.map(item => item.id)).size).toBe(3)
    expect(faq[0]!.answer).toContain('Corsa')
    expect(faq[1]!.answer).toContain('759')
    expect(faq[2]!.answer).toContain('1998')
    expect(faq[2]!.answer).toContain('2009')
  })

  it('FAQ sin modelos no inventa años', () => {
    const faq = carBudgetFaq(response({ models: [] }))
    expect(faq).toHaveLength(3)
    expect(faq[2]!.answer).not.toMatch(/\b(19|20)\d\d\b/)
  })

  it('el endpoint no lista avisos con moneda deducida', () => {
    const source = readFileSync(
      resolve(__dirname, '../../server/api/cars/budget/[monto].get.ts'),
      'utf8'
    )
    expect(source.replace(/s+/g, ' ')).toContain('currencyInferred: { $ne: true }')
  })
})
