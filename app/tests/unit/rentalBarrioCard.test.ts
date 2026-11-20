import { describe, expect, it } from 'vitest'
import { rentalBarrioCard, rentalBarrioDescription } from '../../utils/rentalBarrioCopy'
import type { RentalBarrioPage } from '../../utils/rentalBarrio'

// The share card of /alquiler/<departamento>/<barrio> (components/OgImage/Cambio.vue): the barrio
// with its department, and under it the same median its meta description starts with. Kept apart
// from rentalBarrioCopy.test.ts, which another change of the same batch edits.

const dist = (median: number | null, count = 40) => ({
  count,
  mean: median,
  median,
  p25: median && median - 4000,
  p75: median && median + 4000,
})
const cell = (
  propertyType: 'apartamento' | 'casa',
  bedrooms: 'any' | '1' | '2',
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

describe('rentalBarrioCard', () => {
  it('names the barrio with its department and leads with the median of the description', () => {
    const card = rentalBarrioCard(page())
    expect(card).toEqual({
      title: 'Alquiler en Pocitos, Montevideo',
      subtitle:
        'Apartamento de 2 dormitorios a $ 36.000 por mes de mediana · datos del 4 de octubre de 2026',
    })
    // The same figure as the description: one median per page.
    expect(rentalBarrioDescription(page())).toContain(
      'apartamento de 2 dormitorios a $ 36.000 por mes de mediana'
    )
    // It fits the card uncut (the card clips at 110).
    expect(card.subtitle.length).toBeLessThanOrEqual(110)
  })

  it('falls back to the next cell, and to no subtitle without a median', () => {
    expect(rentalBarrioCard(page({ cells: [cell('casa', 'any', 45000)] })).subtitle).toBe(
      'Casa a $ 45.000 por mes de mediana · datos del 4 de octubre de 2026'
    )
    // Without a median there is no subtitle: the card falls back to the description.
    expect(rentalBarrioCard(page({ cells: [] }))).toEqual({
      title: 'Alquiler en Pocitos, Montevideo',
      subtitle: '',
    })
    expect(
      rentalBarrioCard(page({ rentalDataAsOf: null, generatedAt: 'no es una fecha' })).subtitle
    ).toBe('Apartamento de 2 dormitorios a $ 36.000 por mes de mediana')
  })
})
