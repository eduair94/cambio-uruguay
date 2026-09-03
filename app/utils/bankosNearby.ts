// "Estoy parado acá: ¿tengo descuento con mi tarjeta?"
//
// TRES HECHOS MEDIDOS QUE DEFINEN ESTA PANTALLA, y ninguno es obvio:
//
// 1. EL DESCUENTO ES DE LA MARCA, NO DEL LOCAL. Un local del catálogo trae seis campos —
//    `_id, locationId, brandId, location, rating, __v` — y ninguno menciona banco ni beneficio.
//    Así que no hace falta acertar la sucursal, sólo la marca. Por eso la respuesta se agrupa por
//    marca y no por punto: "Farmashop" una vez, no los tres Farmashop de la cuadra.
//
// 2. EL RADIO CORRECTO SON ~40 METROS, NO UN KILÓMETRO. Medido sobre el catálogo: parado en un
//    local, dentro de 40 m hay una mediana de 2 marcas y el 88 % de los casos tiene 6 o menos. A
//    1 km —el mínimo que permitía el control del mapa— la mediana es 50 y el 75 % pasa de 20. Una
//    lista de 50 comercios no contesta "¿acá tengo descuento?", la reemplaza por otra búsqueda.
//
// 3. EN UN SHOPPING NINGÚN GPS ALCANZA, NUNCA. Punta Carretas tiene 78 locales dentro de 30 m
//    entre sí, todos geocodificados prácticamente al mismo punto. No hay precisión que desempate
//    eso: la desambiguación es por NOMBRE. Por eso la pantalla ofrece buscar, y por eso el orden
//    por distancia se corta con el nombre cuando hay empate.
//
// PURE (sin Vue, sin I/O) para que la ruta del servidor y los tests compartan la aritmética.

/** Radios ofrecidos, en metros. El primero es el default. */
export const NEARBY_RADII = [40, 150, 500] as const

export interface NearbyPoint {
  locationId: string
  brandId: string
  brandName: string
  categories: string[]
  lat: number
  lng: number
  banks: Array<{
    bankId: string
    bankName: string
    color: string
    creditDescription: string | null
    debitDescription: string | null
    hasCredit: boolean
    hasDebit: boolean
    availableDays: number[] | null
    matchedKinds?: Array<'credit' | 'debit'>
  }>
  otherBanks?: Array<{ bankId: string; bankName: string; color: string }>
}

export interface NearbyBrand {
  brandId: string
  name: string
  categories: string[]
  /** Metros hasta el local más cercano de esa marca. Redondeado: el GPS no da para más. */
  distanceM: number
  /** Cuántos locales de la marca caen dentro del radio (un shopping puede tener varios). */
  locations: number
  /** Emisores con los que el visitante SÍ tiene el beneficio. */
  yours: Array<{
    bankId: string
    bankName: string
    color: string
    credit: string | null
    debit: string | null
    days: number[] | null
    kinds: Array<'credit' | 'debit'>
  }>
  /** Emisores que descuentan la marca pero que el visitante no tiene. */
  others: Array<{ bankId: string; bankName: string }>
  /**
   * Slug de la página de marca, o null si esa marca no tiene.
   *
   * Lo calcula el SERVIDOR sobre el catálogo completo y no la pantalla: tanto el corte como el
   * desempate de una colisión dependen del conjunto, así que un slug adivinado del nombre acá
   * sería un enlace a un 404 para el 85 % de las marcas.
   */
  pageSlug?: string | null
}

/** Metros entre dos coordenadas. Haversine: a esta escala el error es centimétrico. */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Las marcas con descuento dentro del radio, ordenadas por cercanía.
 *
 * Agrupa por marca (ver el punto 1 de arriba) y se queda con el local más cercano de cada una.
 * El desempate por nombre no es cosmético: en un shopping decenas de marcas comparten
 * prácticamente la misma coordenada, y sin un criterio estable la lista se reordenaría sola entre
 * dos lecturas del GPS.
 */
export function nearbyBrands(
  points: readonly NearbyPoint[],
  lat: number,
  lng: number,
  radiusM: number
): NearbyBrand[] {
  const byBrand = new Map<string, NearbyBrand>()

  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue
    const distance = distanceMeters(lat, lng, point.lat, point.lng)
    if (distance > radiusM) continue

    const existing = byBrand.get(point.brandId)
    if (existing) {
      existing.locations += 1
      existing.distanceM = Math.min(existing.distanceM, Math.round(distance))
      continue
    }

    byBrand.set(point.brandId, {
      brandId: point.brandId,
      name: point.brandName,
      categories: point.categories || [],
      distanceM: Math.round(distance),
      locations: 1,
      yours: point.banks.map(bank => ({
        bankId: bank.bankId,
        bankName: bank.bankName,
        color: bank.color,
        // Sólo el texto del medio de pago que el visitante tiene. Mostrarle el de crédito a quien
        // eligió la de débito es el mismo error que tenía el mapa, un nivel más abajo.
        credit: bank.matchedKinds?.includes('credit') ? bank.creditDescription : null,
        debit: bank.matchedKinds?.includes('debit') ? bank.debitDescription : null,
        days: bank.availableDays,
        kinds: bank.matchedKinds || [],
      })),
      others: (point.otherBanks || []).map(b => ({ bankId: b.bankId, bankName: b.bankName })),
    })
  }

  return [...byBrand.values()].sort(
    (a, b) => a.distanceM - b.distanceM || a.name.localeCompare(b.name, 'es')
  )
}

/**
 * El veredicto en una línea, que es lo único que se lee parado en la caja.
 *
 * Devuelve `null` cuando no hay nada que decir todavía; la pantalla decide si eso es "buscando" o
 * "no hay comercios acá".
 */
export function verdictFor(brand: NearbyBrand | null | undefined): string | null {
  if (!brand) return null
  const withBenefit = brand.yours.filter(y => y.credit || y.debit)
  if (withBenefit.length) {
    const first = withBenefit[0]
    const kind = first.debit ? 'débito' : 'crédito'
    return `Sí, con tu ${first.bankName} ${kind}`
  }
  if (brand.others.length) {
    const names = brand.others.map(o => o.bankName)
    const list =
      names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} o ${names.at(-1)}`
    return `Con tus tarjetas no. Acá descuenta ${list}`
  }
  return 'Sin descuento publicado en este comercio'
}

/** "a 12 m" / "a 150 m". Nunca decimales: el GPS de un teléfono no los sostiene. */
export function distanceLabel(meters: number): string {
  if (meters < 1000) return `a ${Math.round(meters)} m`
  return `a ${(meters / 1000).toFixed(1).replace('.', ',')} km`
}
