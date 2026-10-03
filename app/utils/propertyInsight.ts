// "Comparada con lo que hay cerca": el análisis que las fichas de alquiler (/alquileres/<key>) y de
// venta (/venta-viviendas-uruguay/<key>) piden aparte, desde el navegador, a
// /api/property-insight/<alquiler|venta>/<key>.
//
// Es pura y no sabe de qué operación se trata: recibe filas normalizadas (alquiler en $ por mes sin
// gastos comunes, venta en dólares) y devuelve posición, $/m² y elecciones. Los cargadores de
// server/utils/propertyInsight.ts deciden qué fila es limpia y qué distancia es creíble.
//
// TRES REGLAS QUE LA PÁGINA TIENE QUE PODER EXPLICAR:
//  * "Cerca" es la distancia a la coordenada PROPIA del aviso, y el radio es el menor de 1, 2, 3 o
//    5 km que junta ocho comparables. Sin coordenada propia, el barrio, y se dice.
//  * Sin cinco comparables no hay veredicto: con tres, cualquier mediana es ruido.
//  * Las elecciones nunca son el propio aviso y un aviso no aparece dos veces.

export type PropertyInsightUnit = 'UYU' | 'USD'
export type PropertyInsightVerdict = 'muy-bajo' | 'bajo' | 'justo' | 'alto' | 'muy-alto'
export type PropertyInsightPickKind =
  | 'cheapest-similar'
  | 'cheapest-per-m2'
  | 'bigger-same-money'
  | 'more-bedrooms-same-money'
  | 'closest-similar'

export const PROPERTY_INSIGHT_RADII_KM = [1, 2, 3, 5] as const
export const PROPERTY_INSIGHT_TARGET = 8
export const PROPERTY_INSIGHT_MIN_PEERS = 5
/** "Por la misma plata": hasta 5 % más de lo que pide este aviso. */
export const PROPERTY_INSIGHT_STRETCH = 1.05
/** "Parecida más cercana": precio dentro de ±20 % del de este aviso. */
export const PROPERTY_INSIGHT_CLOSE_PRICE = 0.2

export interface PropertyInsightListing {
  key: string
  /** La ruta de su ficha, sin prefijo de idioma. */
  path: string
  title: string
  image: string | null
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  /** El precio que se compara: $ por mes (alquiler) o US$ (venta). */
  price: number
  /** Lo que publicó el aviso, para mostrar tal cual. */
  shown: { amount: number; currency: PropertyInsightUnit }
  /** Ya pasado por la guarda de su operación; null si no es creíble. */
  pricePerM2: number | null
  neighborhood: string
  /** A la coordenada propia del aviso; null si alguno de los dos no la tiene. */
  distanceKm: number | null
}

export interface PropertyInsightStats {
  n: number
  min: number
  p25: number
  median: number
  p75: number
  max: number
  /** Qué parte de los comparables pide MENOS que este aviso (0..1). */
  cheaperShare: number
  /** precio / mediana − 1. */
  gap: number
  verdict: PropertyInsightVerdict
}

export interface PropertyInsight {
  unit: PropertyInsightUnit
  scope: { kind: 'radius'; radiusKm: number } | { kind: 'neighborhood'; neighborhood: string }
  /** Parecidos (mismo tipo y dormitorios) dentro del alcance. */
  comparables: number
  position: PropertyInsightStats | null
  perM2: (PropertyInsightStats & { subject: number }) | null
  /** El $/m² del aviso aunque no haya con qué compararlo; null si no es creíble. */
  subjectPerM2: number | null
  picks: Array<{ kind: PropertyInsightPickKind; listing: PropertyInsightListing }>
}

export interface PropertyInsightInput {
  subject: PropertyInsightListing
  /** Otros avisos visibles del mismo departamento y tipo; pueden incluir al propio aviso. */
  peers: PropertyInsightListing[]
  /** El aviso tiene coordenada propia y las distancias de `peers` son contra ella. */
  located: boolean
  unit: PropertyInsightUnit
}

export function propertyInsightVerdict(gap: number): PropertyInsightVerdict {
  if (gap <= -0.15) return 'muy-bajo'
  if (gap <= -0.05) return 'bajo'
  if (gap <= 0.05) return 'justo'
  if (gap <= 0.15) return 'alto'
  return 'muy-alto'
}

const sameText = (a: string, b: string): boolean =>
  !!a.trim() && a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0

function quantile(sorted: readonly number[], q: number): number {
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower)
}

function statsOf(value: number, values: number[]): PropertyInsightStats | null {
  if (values.length < PROPERTY_INSIGHT_MIN_PEERS || !(value > 0)) return null
  const sorted = [...values].sort((a, b) => a - b)
  const median = quantile(sorted, 0.5)
  const gap = value / median - 1
  return {
    n: sorted.length,
    min: Math.round(sorted[0]!),
    p25: Math.round(quantile(sorted, 0.25)),
    median: Math.round(median),
    p75: Math.round(quantile(sorted, 0.75)),
    max: Math.round(sorted[sorted.length - 1]!),
    cheaperShare: sorted.filter(item => item < value).length / sorted.length,
    gap,
    verdict: propertyInsightVerdict(gap),
  }
}

const byDistance = (a: PropertyInsightListing, b: PropertyInsightListing): number =>
  (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.key.localeCompare(b.key)
const byPrice = (a: PropertyInsightListing, b: PropertyInsightListing): number =>
  a.price - b.price || byDistance(a, b)

export function buildPropertyInsight(input: PropertyInsightInput): PropertyInsight {
  const { subject, located, unit } = input
  const seenKeys = new Set<string>([subject.key])
  const peers = input.peers.filter(peer => {
    if (seenKeys.has(peer.key) || peer.propertyType !== subject.propertyType || !(peer.price > 0))
      return false
    seenKeys.add(peer.key)
    return true
  })
  const similar = (peer: PropertyInsightListing) =>
    subject.bedrooms === null || peer.bedrooms === subject.bedrooms

  // El alcance: el menor radio con ocho parecidos; sin coordenada propia, el barrio.
  let scope: PropertyInsight['scope']
  let inScope: (peer: PropertyInsightListing) => boolean
  if (located) {
    const within = (radius: number) => (peer: PropertyInsightListing) =>
      peer.distanceKm !== null && peer.distanceKm <= radius
    const radius =
      PROPERTY_INSIGHT_RADII_KM.find(
        candidate =>
          peers.filter(peer => within(candidate)(peer) && similar(peer)).length >=
          PROPERTY_INSIGHT_TARGET
      ) ?? PROPERTY_INSIGHT_RADII_KM[PROPERTY_INSIGHT_RADII_KM.length - 1]
    scope = { kind: 'radius', radiusKm: radius }
    inScope = within(radius)
  } else {
    scope = { kind: 'neighborhood', neighborhood: subject.neighborhood }
    inScope = peer => sameText(peer.neighborhood, subject.neighborhood)
  }
  const near = peers.filter(inScope)
  const comparables = near.filter(similar)
  const position = statsOf(
    subject.price,
    comparables.map(peer => peer.price)
  )

  const perM2Group = near.filter(
    peer =>
      peer.pricePerM2 !== null &&
      (subject.bedrooms === null ||
        peer.bedrooms === null ||
        Math.abs(peer.bedrooms - subject.bedrooms) <= 1)
  )
  const perM2Stats =
    subject.pricePerM2 !== null
      ? statsOf(
          subject.pricePerM2,
          perM2Group.map(peer => peer.pricePerM2!)
        )
      : null

  const picks: PropertyInsight['picks'] = []
  const used = new Set<string>()
  const pick = (
    kind: PropertyInsightPickKind,
    ordered: readonly PropertyInsightListing[],
    accept: (candidate: PropertyInsightListing) => boolean = () => true
  ) => {
    const candidate = ordered.find(item => !used.has(item.key) && accept(item))
    if (!candidate) return
    used.add(candidate.key)
    picks.push({ kind, listing: candidate })
  }

  const ceiling = subject.price * PROPERTY_INSIGHT_STRETCH
  pick('cheapest-similar', [...comparables].sort(byPrice))
  pick(
    'cheapest-per-m2',
    near
      .filter(
        peer =>
          peer.pricePerM2 !== null &&
          (subject.bedrooms === null || (peer.bedrooms ?? -1) >= subject.bedrooms)
      )
      .sort((a, b) => a.pricePerM2! - b.pricePerM2! || byDistance(a, b)),
    peer => subject.pricePerM2 === null || peer.pricePerM2! < subject.pricePerM2
  )
  if (subject.bedrooms !== null) {
    pick(
      'more-bedrooms-same-money',
      near
        .filter(peer => peer.price <= ceiling && (peer.bedrooms ?? -1) > subject.bedrooms!)
        .sort((a, b) => byPrice(a, b))
    )
  }
  pick(
    'bigger-same-money',
    near
      .filter(peer => peer.price <= ceiling && peer.pricePerM2 !== null && peer.area !== null)
      .sort((a, b) => b.area! - a.area! || byPrice(a, b)),
    peer => subject.area === null || subject.pricePerM2 === null || peer.area! >= subject.area * 1.1
  )
  if (located) {
    pick(
      'closest-similar',
      comparables
        .filter(peer => Math.abs(peer.price / subject.price - 1) <= PROPERTY_INSIGHT_CLOSE_PRICE)
        .sort(byDistance)
    )
  }

  return {
    unit,
    scope,
    comparables: comparables.length,
    position,
    perM2: perM2Stats ? { ...perM2Stats, subject: Math.round(subject.pricePerM2!) } : null,
    subjectPerM2: subject.pricePerM2 === null ? null : Math.round(subject.pricePerM2),
    picks,
  }
}
