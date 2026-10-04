import { describe, expect, it } from 'vitest'
import {
  formatUyu,
  rentalBarrioDescription,
  rentalBarrioFaq,
  rentalBarrioIntro,
  rentalBarrioChipCaption,
  rentalBarrioPlace,
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
  spellings: ['Pocitos'],
  nameShared: false,
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

  it('mismo nombre en dos departamentos: títulos distintos, el departamento sobrevive', () => {
    const shared = (department: string) =>
      page({ neighborhood: 'Carrasco', department, nameShared: true })
    const canelones = rentalBarrioTitle(shared('Canelones'))
    const montevideo = rentalBarrioTitle(shared('Montevideo'))
    expect(canelones).not.toBe(montevideo)
    // ": precios hoy" no entra en 60 con la marca (61): cae "hoy" antes que el departamento.
    expect(canelones).toBe('Alquiler en Carrasco, Canelones: precios')
    expect(montevideo).toBe('Alquiler en Carrasco, Montevideo: precios')
    for (const title of [canelones, montevideo])
      expect(`${title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    // Corto: entra la variante larga, con departamento.
    expect(
      rentalBarrioTitle(page({ neighborhood: 'Cerro', department: 'Salto', nameShared: true }))
    ).toBe('Alquiler en Cerro, Salto: cuánto cuesta hoy')
    // Largo: nunca se suelta el departamento, aunque se pase.
    expect(
      rentalBarrioTitle(
        page({
          neighborhood: 'Barrio Parque Miramar',
          department: 'Treinta y Tres',
          nameShared: true,
        })
      )
    ).toBe('Alquiler en Barrio Parque Miramar, Treinta y Tres')
    // La última miga y el H1 usan el mismo lugar.
    expect(rentalBarrioPlace(shared('Canelones'))).toBe('Carrasco, Canelones')
    // Un nombre único no cambia.
    expect(rentalBarrioTitle(page({ neighborhood: 'Carrasco' }))).toBe(
      'Alquiler en Carrasco: cuánto cuesta hoy'
    )
    expect(rentalBarrioPlace(page())).toBe('Pocitos')
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
    // Primero de la tabla: no se dice 'el 1.º'.
    expect(
      rentalBarrioRankSentence(
        page({ rank: { position: 1, of: 12, propertyType: 'apartamento', bedrooms: 'any' } })
      )
    ).toBe('Pocitos es el barrio más caro de Montevideo para un apartamento, entre 12 con datos.')
  })

  it('chips: dicen qué mediana muestran', () => {
    expect(rentalBarrioChipCaption('2')).toBe('Mediana por mes de apartamento de 2 dormitorios.')
    expect(rentalBarrioChipCaption('any')).toBe(
      'Mediana por mes de apartamento, todos los dormitorios.'
    )
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
