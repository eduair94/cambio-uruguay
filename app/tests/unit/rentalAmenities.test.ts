// El filtro "Comodidades" lee las etiquetas que InfoCasas publica en `offers[].details.amenities`.
// Estas son las etiquetas reales de la colección (2026-09-13) y cada una tiene que caer en la
// comodidad correcta — o en ninguna: "Terraza lavadero" no es una terraza y "Previsión A.A." no
// es un aire acondicionado.
import { describe, expect, it } from 'vitest'
import {
  RENTAL_AMENITIES,
  normalizeRentalAmenities,
  rentalAmenityConditions,
  rentalAmenityPublished,
  type RentalAmenity,
} from '~/utils/rentalAmenities'
import {
  buildRentalFilter,
  normalizeRentalQuery,
  rentalPublicStages,
  rentalQueryToParams,
} from '~/utils/rentals'
import { MUTUALISTA_SEDES } from '~/utils/mutualistaSedes'

const LABELS: Array<[string, RentalAmenity | null]> = [
  ['Aire acondicionado', 'aire'],
  ['Parrillero / Barbacoa', 'parrillero'],
  ['Balcón / Terraza', 'balcon'],
  ['Garaje', null],
  ['Lavadero', 'lavadero'],
  ['Ascensor', 'ascensor'],
  ['Se aceptan mascotas', null],
  ['Living comedor', null],
  ['Calefacción individual', 'calefaccion'],
  ['Gym', 'gimnasio'],
  ['Jardin / Patio', 'jardin'],
  ['Amueblada', null],
  ['Internet', null],
  ['Cochera', null],
  ['Balcón', 'balcon'],
  ['Piscina', 'piscina'],
  ['Terraza lavadero', 'lavadero'],
  ['Agua caliente central', null],
  ['Playroom', 'salon'],
  ['Calefacción', 'calefaccion'],
  ['Patio', 'jardin'],
  ['Sauna', 'sauna'],
  ['Salón de uso común', 'salon'],
  ['Estufa a leña', null],
  ['Losa radiante', 'calefaccion'],
  ['Barbacoa', 'parrillero'],
  ['Lavandería', 'lavadero'],
  ['Calefacción central', 'calefaccion'],
  ['Solárium', null],
  ['Previsión A.A.', null],
  ['Jacuzzi', null],
  ['Spa', 'sauna'],
]

describe('etiquetas publicadas → comodidades', () => {
  it.each(LABELS)('%s → %s', (label, expected) => {
    expect(RENTAL_AMENITIES.filter(amenity => rentalAmenityPublished([label], amenity))).toEqual(
      expected ? [expected] : []
    )
  })

  it('no distingue mayúsculas e ignora lo que no es texto', () => {
    expect(rentalAmenityPublished(['GYM'], 'gimnasio')).toBe(true)
    expect(rentalAmenityPublished([null, 3, { name: 'Gym' }], 'gimnasio')).toBe(false)
  })
})

describe('claves de comodidades', () => {
  it('conserva sólo las conocidas, una vez y en el orden de presentación', () => {
    expect(normalizeRentalAmenities('piscina,gimnasio,jacuzzi,piscina')).toEqual([
      'gimnasio',
      'piscina',
    ])
    expect(normalizeRentalAmenities(['sauna', ' aire '])).toEqual(['aire', 'sauna'])
    expect(normalizeRentalAmenities(undefined)).toEqual([])
  })

  it('arma una condición de etiqueta entera por comodidad', () => {
    expect(rentalAmenityConditions(['gimnasio'])).toEqual([
      { 'offers.details.amenities': { $regex: '^(gimnasio|gym)$', $options: 'i' } },
    ])
  })
})

describe('comodidades en la URL', () => {
  it('va y vuelve por el contrato de la consulta', () => {
    const params = rentalQueryToParams(normalizeRentalQuery({ comodidades: 'piscina, gimnasio' }))
    expect(params.comodidades).toBe('gimnasio,piscina')
    expect(normalizeRentalQuery(params).amenities).toEqual(['gimnasio', 'piscina'])
    expect(rentalQueryToParams(normalizeRentalQuery({})).comodidades).toBeUndefined()
  })
})

describe('filtro de comodidades', () => {
  it('pide TODAS las elegidas', () => {
    const query = normalizeRentalQuery({ comodidades: 'gimnasio,piscina' })
    expect(buildRentalFilter(query, 10).filter.$and).toEqual(
      rentalAmenityConditions(['gimnasio', 'piscina'])
    )
  })

  it('convive con la cercanía a una sede y con el buscador de texto', () => {
    const sede = MUTUALISTA_SEDES[0]!
    const query = normalizeRentalQuery({
      comodidades: 'gimnasio',
      sedes: String(sede.osmId),
      q: 'rambla',
    })
    const { filter } = buildRentalFilter(query, 10)
    const and = filter.$and as Array<Record<string, unknown>>
    expect(and).toHaveLength(2)
    expect(and[0]).toEqual(rentalAmenityConditions(['gimnasio'])[0])
    expect(and[1]!.$expr).toBeDefined()
    expect(Array.isArray(filter.$or)).toBe(true)
  })

  it('sin comodidades no agrega condiciones', () => {
    expect(buildRentalFilter(normalizeRentalQuery({}), 10).filter.$and).toBeUndefined()
  })

  it('se vuelve a exigir después de descartar los avisos vencidos', () => {
    const { filter } = buildRentalFilter(normalizeRentalQuery({ comodidades: 'gimnasio' }), 10)
    const stages = rentalPublicStages(filter, 10) as Array<Record<string, any>>
    const matches = stages.filter(stage => stage.$match?.$and)
    const current = stages.findIndex(stage => stage.$set?.offers)
    // Prefiltro sobre todos los avisos (barato, superconjunto) y match exacto sobre los vigentes.
    expect(matches).toHaveLength(2)
    expect(stages.indexOf(matches[0]!)).toBeLessThan(current)
    expect(stages.indexOf(matches[1]!)).toBeGreaterThan(current)
  })
})
