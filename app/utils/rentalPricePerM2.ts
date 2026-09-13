// Precio por m² de un alquiler: la cifra por la que ordena "Menor precio por m²" y la que muestra la
// tarjeta. Una sola regla en dos formas — función y expresión de agregación — que
// `tests/unit/rentalPricePerM2.test.ts` prueba una contra la otra.
//
// POR QUÉ NO ES `precio / área`: ordenar de menor a mayor sube al primer lugar los errores de carga,
// no las gangas. Medido el 2026-09-13 sobre 58.265 propiedades públicas: los 20 primeros de
// `priceUyu / area` eran superficies imposibles — un apartamento de 1 dormitorio con 55.000 m²,
// casas de balneario con el terreno cargado como superficie (400–700 m² a $10.000) — y en la otra
// punta había avisos de temporada con 1 m². Es la trampa de la pizarra congelada: ordenar por "más
// barato" premia el dato roto.
//
// `null` NO esconde la propiedad: la manda al final del orden y la tarjeta no muestra la cifra.
import type { RentalPropertyType } from './rentals'

/** Menos que esto no es una vivienda ni un local: es un error de unidad o de carga. */
export const RENTAL_PRICE_PER_M2_MIN_AREA = 15
/** El mismo techo de superficie que acepta el barrido (`classes/rentals/details.ts`). */
export const RENTAL_PRICE_PER_M2_MAX_AREA = 1_000_000
/**
 * Superficie máxima creíble de una vivienda: 100 m² más 80 por dormitorio, o 400 m² si no publica
 * dormitorios. Lo que queda afuera es, casi siempre, la superficie del terreno.
 */
export const RENTAL_PRICE_PER_M2_AREA_BASE = 100
export const RENTAL_PRICE_PER_M2_AREA_PER_BEDROOM = 80
export const RENTAL_PRICE_PER_M2_AREA_UNKNOWN_BEDROOMS = 400
/**
 * Piso de $/m² por tipo de vivienda. El percentil 1 medido era $265 en apartamentos y $64 en casas,
 * y lo que quedaba debajo de estos pisos era, leído fila por fila, terreno o un tipeo. Los demás
 * tipos no tienen piso: un galpón a $75/m² es real.
 */
export const RENTAL_PRICE_PER_M2_FLOOR: Readonly<Partial<Record<RentalPropertyType, number>>> =
  Object.freeze({ apartamento: 150, casa: 100 })
/** Una habitación cobra por cama y publica la superficie de toda la residencia. */
export const RENTAL_PRICE_PER_M2_EXCLUDED: readonly RentalPropertyType[] = Object.freeze([
  'habitacion',
])

/** Campos temporales del orden: se proyectan antes del `$sort` y se quitan antes de responder. */
export const RENTAL_PRICE_PER_M2_SORT_FIELDS = [
  '_rentalPricePerM2Unknown',
  '_rentalPricePerM2',
] as const

export interface RentalPricePerM2Input {
  propertyType: string
  area: number | null
  bedrooms: number | null
  priceUyu: number
}

export function rentalPricePerM2(property: RentalPricePerM2Input): number | null {
  const { propertyType, area, bedrooms, priceUyu } = property
  if ((RENTAL_PRICE_PER_M2_EXCLUDED as readonly string[]).includes(propertyType)) return null
  if (
    typeof area !== 'number' ||
    !(area >= RENTAL_PRICE_PER_M2_MIN_AREA) ||
    !(area <= RENTAL_PRICE_PER_M2_MAX_AREA)
  )
    return null
  if (typeof priceUyu !== 'number' || !(priceUyu > 0)) return null
  const value = priceUyu / area
  const floor = RENTAL_PRICE_PER_M2_FLOOR[propertyType as RentalPropertyType]
  if (floor === undefined) return value
  const cap =
    typeof bedrooms === 'number'
      ? RENTAL_PRICE_PER_M2_AREA_BASE + RENTAL_PRICE_PER_M2_AREA_PER_BEDROOM * Math.max(0, bedrooms)
      : RENTAL_PRICE_PER_M2_AREA_UNKNOWN_BEDROOMS
  return area <= cap && value >= floor ? value : null
}

/** La misma regla como expresión de agregación, construida con las mismas constantes. */
export function rentalPricePerM2Expression(): Record<string, unknown> {
  const value = { $divide: ['$priceUyu', '$area'] }
  const cap = {
    $cond: [
      { $isNumber: '$bedrooms' },
      {
        $add: [
          RENTAL_PRICE_PER_M2_AREA_BASE,
          { $multiply: [RENTAL_PRICE_PER_M2_AREA_PER_BEDROOM, { $max: [0, '$bedrooms'] }] },
        ],
      },
      RENTAL_PRICE_PER_M2_AREA_UNKNOWN_BEDROOMS,
    ],
  }
  const floor = {
    $switch: {
      branches: Object.entries(RENTAL_PRICE_PER_M2_FLOOR).map(([type, minimum]) => ({
        case: { $eq: ['$propertyType', type] },
        then: minimum,
      })),
      default: null,
    },
  }
  return {
    $let: {
      vars: { floor },
      in: {
        $cond: [
          {
            // `$and` corta en el primer falso: la división sólo se evalúa con una superficie válida.
            $and: [
              { $not: [{ $in: ['$propertyType', [...RENTAL_PRICE_PER_M2_EXCLUDED]] }] },
              { $isNumber: '$area' },
              { $gte: ['$area', RENTAL_PRICE_PER_M2_MIN_AREA] },
              { $lte: ['$area', RENTAL_PRICE_PER_M2_MAX_AREA] },
              { $isNumber: '$priceUyu' },
              { $gt: ['$priceUyu', 0] },
              {
                $or: [
                  { $eq: ['$$floor', null] },
                  { $and: [{ $lte: ['$area', cap] }, { $gte: [value, '$$floor'] }] },
                ],
              },
            ],
          },
          value,
          null,
        ],
      },
    },
  }
}

/** Las dos claves del orden. Van DESPUÉS de elegir el aviso: el precio es el que se muestra. */
export function rentalPricePerM2Stages(): Array<Record<string, unknown>> {
  return [
    { $set: { _rentalPricePerM2: rentalPricePerM2Expression() } },
    { $set: { _rentalPricePerM2Unknown: { $eq: ['$_rentalPricePerM2', null] } } },
  ]
}
