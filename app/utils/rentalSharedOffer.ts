// Una oferta, una sola vez en el payload.
//
// `/api/rentals` devuelve cada vivienda con `offers` y, aparte, `matchingOffer`: el aviso que
// cumple el filtro. La API la arma como COPIA del mismo aviso (annotateRentalAvailability y
// withRentalGalleryPreviews reconstruyen las dos por su lado) y el JSON de $fetch tampoco conserva
// identidades. devalue, el serializador del payload de Nuxt, escribe un objeto una vez por
// identidad, así que esa copia viajaba entera: medido el 2026-11-20 en /alquileres-uruguay, 24 de
// 24 viviendas con `matchingOffer` igual a su oferta y 11.200 B de 89.456 B del `__NUXT_DATA__`
// alcanzables sólo por ella.
//
// Esto devuelve la misma respuesta con `matchingOffer` apuntando al elemento de `offers` que es
// igual a ella campo por campo. Sólo se comparte lo que es igual de verdad: una oferta que difiere
// en un solo valor (un reporte de disponibilidad, una foto) queda como vino. No muta la entrada.

interface SharedOffer {
  source?: unknown
  listingId?: unknown
}

interface SharedOfferItem {
  offers: SharedOffer[]
  matchingOffer?: SharedOffer | null
}

type SharedOfferResponse = { items: SharedOfferItem[] }

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return Number.isNaN(a) && Number.isNaN(b)
  }
  const aArray = Array.isArray(a)
  if (aArray !== Array.isArray(b)) return false
  if (aArray) {
    const left = a as unknown[]
    const right = b as unknown[]
    return left.length === right.length && left.every((value, i) => sameValue(value, right[i]))
  }
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const leftKeys = Object.keys(left)
  if (leftKeys.length !== Object.keys(right).length) return false
  return leftKeys.every(key => Object.hasOwn(right, key) && sameValue(left[key], right[key]))
}

export function shareMatchingOffer<R extends SharedOfferResponse>(response: R): R
export function shareMatchingOffer<T extends null | undefined>(response: T): T
export function shareMatchingOffer<R extends SharedOfferResponse>(
  response: R | null | undefined
): R | null | undefined {
  if (!response || !Array.isArray(response.items)) return response
  const items = response.items.map((item: SharedOfferItem): SharedOfferItem => {
    const matching = item.matchingOffer
    if (!matching || !Array.isArray(item.offers)) return item
    if (item.offers.includes(matching)) return item
    const found = item.offers.find(
      candidate =>
        candidate.source === matching.source &&
        candidate.listingId === matching.listingId &&
        sameValue(candidate, matching)
    )
    return found ? { ...item, matchingOffer: found } : item
  })
  // Each item keeps its own type: only `matchingOffer` changed, to a value of the same type.
  return { ...response, items } as R
}
