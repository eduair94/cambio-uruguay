import { describe, expect, it } from 'vitest'
import {
  formatUyu,
  rentalBarrioDescription,
  rentalBarrioFaq,
  rentalBarrioIntro,
  rentalBarrioRankSentence,
  rentalBarrioTitle,
} from '../../utils/rentalBarrioCopy'
import type { RentalBarrioPage } from '../../utils/rentalBarrio'

const dist = (median: number | null, count = 40) => ({
  count,
  mean: median,
  median,
  p25: median && median - 4000,
  p75: median && median + 4000,
})
const cell = (
  propertyType: 'apartamento' | 'casa',
  bedrooms: any,
  median: number,
  expenses: number | null = null
) => ({
  propertyType,
  bedrooms,
  prices: {
    rent: dist(median),
    commonExpenses: dist(expenses),
    monthlyTotal: dist(expenses === null ? null : median + expenses),
    builtSquareMeter: dist(null),
    sources: 3,
    lastSeenFrom: null,
    lastSeenTo: null,
  },
})
const page = (over: Partial<RentalBarrioPage> = {}): RentalBarrioPage => ({
  department: 'Montevideo',
  departmentSlug: 'montevideo',
  neighborhood: 'Pocitos',
  slug: 'pocitos',
  path: '/alquiler/montevideo/pocitos',
  cells: [
    cell('apartamento', 'any', 32000, 6500),
    cell('apartamento', '1', 27000),
    cell('apartamento', '2', 36000),
  ],
  rank: { position: 4, of: 40, propertyType: 'apartamento', bedrooms: '2' },
  similar: [],
  largest: [],
  generatedAt: '2026-10-04T06:53:00.000Z',
  rentalDataAsOf: '2026-10-04T06:48:00.000Z',
  indexable: true,
  officialZone: null,
  officialZoneId: null,
  ...over,
})

describe('rentalBarrioCopy', () => {
  it('formatea pesos uruguayos', () => {
    expect(formatUyu(32000)).toBe('$ 32.000')
    expect(formatUyu(null)).toBe('—')
  })

  it('title y description con el dato', () => {
    expect(rentalBarrioTitle(page())).toBe('Alquiler en Pocitos: cuánto cuesta hoy')
    // Nombre largo: cae a la variante más corta, aunque igual se pase (no se corta un nombre propio).
    expect(rentalBarrioTitle(page({ neighborhood: 'Barrio Parque Miramar Las Delicias' }))).toBe(
      'Alquiler en Barrio Parque Miramar Las Delicias'
    )
    // Nombre mediano: la variante del medio entra en 60 con la marca y la primera no.
    expect(rentalBarrioTitle(page({ neighborhood: 'Punta Carretas' }))).toBe(
      'Alquiler en Punta Carretas: precios hoy'
    )
  })

  it('description: si no entra en 155 se cae la coletilla, no la cifra ni la fecha', () => {
    // Con "apartamento de 2 dormitorios" y la fecha, la versión completa pasa de 155 (167).
    const description = rentalBarrioDescription(page())
    expect(description).toBe(
      'Alquilar en Pocitos (Montevideo): apartamento de 2 dormitorios a $ 36.000 por mes de mediana. Datos del 4 de octubre de 2026.'
    )
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it('description: sin celdas de apartamento cae a la casa (y ahí entra la versión completa)', () => {
    const description = rentalBarrioDescription(page({ cells: [cell('casa', 'any', 45000)] }))
    expect(description).toBe(
      'Alquilar en Pocitos (Montevideo): casa a $ 45.000 por mes de mediana, con gastos comunes y rango por dormitorio. Datos del 4 de octubre de 2026.'
    )
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it('intro con 1 y 2 dormitorios, sin 3 si no hay dato', () => {
    const intro = rentalBarrioIntro(page())
    expect(intro).toContain('1 dormitorio: $ 27.000')
    expect(intro).toContain('2 dormitorios: $ 36.000')
    expect(intro).not.toContain('3 dormitorios')
  })

  it('rank sólo con al menos 3 barrios comparados', () => {
    expect(rentalBarrioRankSentence(page())).toBe(
      'Pocitos es el 4.º barrio más caro de Montevideo para un apartamento de 2 dormitorios, entre 40 con datos.'
    )
    expect(
      rentalBarrioRankSentence(
        page({ rank: { position: 1, of: 2, propertyType: 'apartamento', bedrooms: '2' } })
      )
    ).toBeNull()
  })

  it('FAQ: sólo preguntas con dato, más garantías', () => {
    const faq = rentalBarrioFaq(page())
    const questions = faq.map(item => item.question)
    expect(questions).toContain(
      '¿Cuánto cuesta alquilar un apartamento de 2 dormitorios en Pocitos?'
    )
    expect(questions).toContain('¿Cuánto son los gastos comunes en Pocitos?')
    expect(questions).toContain('¿Pocitos es caro comparado con el resto de Montevideo?')
    expect(questions).toContain('¿Qué garantía piden para alquilar en Pocitos?')
    expect(questions.some(q => q.includes('3 dormitorios'))).toBe(false)
    // Los ids son anclas estables del FAQ: cambiarlos rompe enlaces.
    expect(faq.map(item => item.id)).toEqual([
      'barrio-precio-1-dormitorios',
      'barrio-precio-2-dormitorios',
      'barrio-gastos-comunes',
      'barrio-caro',
      'barrio-garantia',
    ])
    expect(faq.find(item => item.id === 'barrio-garantia')!.link).toEqual({
      to: '/garantia-de-alquiler-uruguay',
      label: 'Garantías de alquiler',
    })
  })
})
