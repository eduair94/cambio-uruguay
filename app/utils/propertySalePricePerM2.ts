// Precio por m² de una vivienda EN VENTA, en dólares. Misma idea que utils/rentalPricePerM2.ts: el
// cociente crudo sube al primer lugar los errores de carga (la superficie del terreno en una casa,
// un tipeo de un cero), no las gangas, así que la cifra sólo existe si pasa una guarda.
//
// La superficie que cuenta es la EDIFICADA; si el aviso no la da, la total y si no, la que informa
// sin decir cuál es. La del terreno nunca: una casa de 90 m² en un terreno de 600 dividiría por 600.
import type { PropertySaleAreaBasis } from './propertySales'

export const SALE_PRICE_PER_M2_MIN_AREA = 15
/** Superficie máxima creíble: 100 m² más 80 por dormitorio, o 400 sin dormitorios. */
export const SALE_PRICE_PER_M2_AREA_BASE = 100
export const SALE_PRICE_PER_M2_AREA_PER_BEDROOM = 80
export const SALE_PRICE_PER_M2_AREA_UNKNOWN_BEDROOMS = 400
/** Debajo de esto, por m², no es una vivienda: es un terreno, una seña o un tipeo. */
export const SALE_PRICE_PER_M2_FLOOR: Readonly<Record<'casa' | 'apartamento', number>> =
  Object.freeze({ apartamento: 300, casa: 150 })
/** Más que esto no existe en Uruguay ni en primera línea de Punta del Este. */
export const SALE_PRICE_PER_M2_CEILING = 20_000

const AREA_ORDER: readonly PropertySaleAreaBasis[] = ['built', 'total', 'reported']

/** La superficie habitable que se puede usar para comparar, o null. */
export function propertySaleLivingArea(
  areas: Partial<Record<PropertySaleAreaBasis | 'terrace', number | null>> | null | undefined
): number | null {
  for (const basis of AREA_ORDER) {
    const value = areas?.[basis]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  }
  return null
}

export function propertySalePricePerM2(input: {
  propertyType: string
  bedrooms: number | null
  area: number | null
  priceUsd: number
}): number | null {
  const { propertyType, bedrooms, area, priceUsd } = input
  if (propertyType !== 'casa' && propertyType !== 'apartamento') return null
  if (typeof area !== 'number' || !(area >= SALE_PRICE_PER_M2_MIN_AREA)) return null
  if (!(priceUsd > 0)) return null
  const cap =
    typeof bedrooms === 'number'
      ? SALE_PRICE_PER_M2_AREA_BASE + SALE_PRICE_PER_M2_AREA_PER_BEDROOM * Math.max(0, bedrooms)
      : SALE_PRICE_PER_M2_AREA_UNKNOWN_BEDROOMS
  if (area > cap) return null
  const value = priceUsd / area
  return value >= SALE_PRICE_PER_M2_FLOOR[propertyType] && value <= SALE_PRICE_PER_M2_CEILING
    ? value
    : null
}
