// Comodidades publicadas de un alquiler, para el filtro "Comodidades" de /alquileres-uruguay.
//
// DE DÓNDE SALEN: de las `facilities` de InfoCasas, que el barrido ya guarda textuales en
// `offers[].details.amenities` (ver `classes/rentals/sources/infocasas.ts`). Es la única fuente que
// las publica como dato: las de El País son generadas y se descartan a propósito, MercadoLibre sólo
// ofrece seis filtros de búsqueda (ninguno es gimnasio) y Facebook y Casasweb no publican nada.
// Medido el 2026-09-13: 13.341 de 58.265 propiedades públicas traen alguna.
//
// ETIQUETA ENTERA, NUNCA SUBSTRING: "Terraza lavadero" no es una terraza y "Previsión A.A." no es
// un aire acondicionado. Cada patrón se ancla con ^…$ contra etiquetas que existen en la colección.
//
// LA AUSENCIA NO ES UNA NEGATIVA: un aviso sin la marca puede tener gimnasio. El filtro sólo
// encuentra lo publicado, y la página lo tiene que decir.

export type RentalAmenity =
  | 'gimnasio'
  | 'piscina'
  | 'parrillero'
  | 'ascensor'
  | 'aire'
  | 'balcon'
  | 'lavadero'
  | 'calefaccion'
  | 'jardin'
  | 'sauna'
  | 'salon'

/**
 * Patrón de UNA etiqueta publicada, para `$regex` con `$options: 'i'`. Entre paréntesis, cuántas
 * propiedades públicas traían cada etiqueta el 2026-09-13. El orden es el de presentación.
 */
export const RENTAL_AMENITY_PATTERNS: Readonly<Record<RentalAmenity, string>> = Object.freeze({
  // Gym (2.214). InfoCasas no escribe "Gimnasio", pero otra fuente podría.
  gimnasio: '^(gimnasio|gym)$',
  // Piscina (1.678).
  piscina: '^piscina( climatizada| abierta| cerrada)?$',
  // Parrillero / Barbacoa (5.120), Barbacoa (740).
  parrillero: '^(parrillero|barbacoa)( ?/ ?(parrillero|barbacoa))?( individual| com[uú]n)?$',
  // Ascensor (3.081).
  ascensor: '^ascensor(es)?$',
  // Aire acondicionado (5.162). "Previsión A.A." (407) es sólo la instalación: no entra.
  aire: '^aire acondicionado$',
  // Balcón / Terraza (5.052), Balcón (1.813). "Terraza lavadero" no es una terraza de uso.
  balcon: '^(balc[oó]n|terraza|balc[oó]n ?/ ?terraza)$',
  // Lavadero (3.514), Terraza lavadero (1.514), Lavandería (721).
  lavadero: '^(lavadero|terraza lavadero|lavander[ií]a)$',
  // Calefacción individual (2.259), Calefacción (1.281), Losa radiante (817), Calefacción central
  // (552). "Estufa a leña" (870) no es lo que busca quien pide calefacción.
  calefaccion: '^(calefacci[oó]n( individual| central)?|losa radiante)$',
  // Jardin / Patio (2.187), Patio (1.030).
  jardin: '^(jard[ií]n|patio|jard[ií]n ?/ ?patio)$',
  // Sauna (1.003), Spa (20).
  sauna: '^(sauna|spa)$',
  // Playroom (1.386), Salón de uso común (937).
  salon: '^(sal[oó]n de uso com[uú]n|playroom)$',
})

/** Orden de presentación en el selector, en la URL y en los resúmenes. */
export const RENTAL_AMENITIES = Object.freeze(
  Object.keys(RENTAL_AMENITY_PATTERNS)
) as readonly RentalAmenity[]

export function isRentalAmenity(value: unknown): value is RentalAmenity {
  return typeof value === 'string' && Object.hasOwn(RENTAL_AMENITY_PATTERNS, value)
}

/** `"piscina,gimnasio,otra"` → `['gimnasio', 'piscina']`: conocidas, sin repetir, en orden fijo. */
export function normalizeRentalAmenities(input: unknown): RentalAmenity[] {
  const wanted = new Set(
    (Array.isArray(input) ? input : [input]).flatMap(value =>
      typeof value === 'string' ? value.split(',').map(part => part.trim()) : []
    )
  )
  return RENTAL_AMENITIES.filter(amenity => wanted.has(amenity))
}

/** ¿Alguna etiqueta publicada corresponde a esta comodidad? El mismo patrón que la consulta. */
export function rentalAmenityPublished(
  labels: readonly unknown[],
  amenity: RentalAmenity
): boolean {
  const pattern = new RegExp(RENTAL_AMENITY_PATTERNS[amenity], 'i')
  return labels.some(label => typeof label === 'string' && pattern.test(label))
}

/**
 * Una condición por comodidad pedida: la propiedad tiene que tenerlas TODAS. Va sobre las etiquetas
 * de sus avisos y `rentalPublicStages` la vuelve a exigir después de descartar los vencidos, así que
 * un aviso viejo no puede aportar un gimnasio. JSON plano y no `RegExp`, como en las ventas.
 */
export function rentalAmenityConditions(
  amenities: readonly RentalAmenity[]
): Array<Record<string, unknown>> {
  return amenities.map(amenity => ({
    'offers.details.amenities': { $regex: RENTAL_AMENITY_PATTERNS[amenity], $options: 'i' },
  }))
}
