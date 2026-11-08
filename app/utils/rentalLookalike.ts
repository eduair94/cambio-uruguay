// "Puede ser la misma vivienda": la regla que impide que una lista de recomendaciones muestre dos
// veces el mismo apartamento (las parecidas de la ficha, las elecciones del análisis de precio y la
// ficha que ya no está).
//
// SÓLO PARA MOSTRAR. Nunca decide identidad, uniones ni alertas: eso sigue siendo la evidencia
// física de classes/rentals (docs/app/RENTALS.md), que exige dirección exacta y unidad explícita.
// Acá alcanza con que dos avisos se parezcan tanto que mostrarlos juntos sea mostrar uno dos veces;
// el costo aceptado es que dos unidades reales del mismo edificio, con el mismo título y el mismo
// precio, pierdan un lugar en una lista.
//
// Medido el 8/11/2026 en /api/rentals/ficha/montevideo-pocitos-bulevar-espana-nh6byn-10rlmiq: de
// sus seis "parecidas", cuatro eran ella misma en otros portales (Mercado Libre, El País e InfoCasas
// dos veces) y las otras dos eran una misma vivienda publicada dos veces: una alternativa real.
import { haversineKm } from './nearbyRates'
import {
  RENTAL_SOURCE_LABEL,
  type RentalCurrency,
  type RentalOffer,
  type RentalPublicProperty,
  type RentalSource,
} from './rentals'
import { rentalSavedSafeUrl } from './rentalSaved'

/** Lo que entra del título, ya plegado: los portales cortan o adornan el final de formas distintas. */
export const RENTAL_LOOKALIKE_TITLE_LENGTH = 60
/**
 * Un mismo aviso declara superficies distintas según el portal (edificada o total): el de RE/MAX en
 * Bulevar España dice 84 m² en Mercado Libre y El País y 90 m² en InfoCasas (`totalArea`), un 7 %
 * de diferencia. Con ±5 % esa copia seguía ocupando un lugar; con un título específico la
 * superficie sólo separa lo que es claramente otro tamaño.
 */
export const RENTAL_LOOKALIKE_AREA_TOLERANCE = 0.1
/** Un título sin nada propio no prueba nada: la superficie tiene que coincidir, y de cerca. */
export const RENTAL_LOOKALIKE_GENERIC_AREA_TOLERANCE = 0.05
/** Más lejos que esto, dos coordenadas exactas son dos edificios. */
export const RENTAL_LOOKALIKE_VETO_KM = 0.3
/**
 * Los portales que publican el punto del propio aviso. El pin de Mercado Libre puede caer a ~1 km
 * (9fedu4 de El País y su copia 1ul3cu4 de Mercado Libre, el mismo apartamento): nunca veta.
 */
export const RENTAL_EXACT_COORDINATE_SOURCES: readonly RentalSource[] = ['infocasas', 'elpais']

export interface RentalLookalikeFacts {
  /** Plegado (sin tildes, minúsculas, sin signos) y cortado a 60 caracteres. */
  title: string
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  /** Cada precio pedido tal como se publicó, `moneda:monto`; el primero es el del aviso principal. */
  prices: readonly string[]
  point: { lat: number; lng: number } | null
  /** El punto viene de un portal que publica el del aviso, en todos sus avisos. */
  exactPoint: boolean
  /** Nombres de anunciante plegados; los genéricos ("Mercado Libre", "Particular") no cuentan. */
  sellers: readonly string[]
  /** Palabras de su barrio y su departamento: nombrarlos no hace específico a un título. */
  place: readonly string[]
}

export function rentalLookalikeFold(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const PLACEHOLDER_SELLERS = new Set([
  ...Object.values(RENTAL_SOURCE_LABEL).map(rentalLookalikeFold),
  'mercadolibre',
  'facebook',
  'particular',
  'dueno',
  'dueno directo',
  'propietario',
  'propietaria',
  'inmobiliaria',
  'anunciante',
])

/** Palabras que cualquier aviso de alquiler podría llevar: no identifican una vivienda. */
const GENERIC_WORDS = new Set(
  [
    'alquiler alquileres alquilo alquila alquilan alquilamos alquilar alq arriendo arrienda arrendamiento renta rento se',
    'apartamento apartamentos apto aptos apart departamento departamentos depto dpto casa casas',
    'monoambiente monoambientes mono ambiente ambientes ph duplex loft vivienda unidad habitacion habitaciones cuarto',
    'dormitorio dormitorios dorm dorms dormi dor bano banos m2 mts metros',
    'un uno una dos tres cuatro cinco seis',
    'de del la las el los en con y e a al para por sin o u muy mas su',
    'montevideo uruguay zona barrio',
    'amplio amplia lindo linda hermoso hermosa excelente impecable luminoso luminosa ideal nuevo nueva estrenar',
    'precioso preciosa moderno moderna comodo comoda gran grande super bien buen ubicado ubicada ubicacion',
    'centrico centrica oportunidad disponible inmediato',
  ]
    .join(' ')
    .split(' ')
)
/** "2", "2d", "3dorm", "60m2": cantidades y superficies, no señas de una unidad. Un "1084" sí lo es. */
const COUNT_WORD =
  /^(?:\d{1,2}(?:d|dorm|dorms|dormitorios?|b|banos?|amb|ambientes?)?|\d{1,4}(?:m2|mts2?|m))$/

export function rentalLookalikeGenericTitle(title: string, place: Iterable<string> = []): boolean {
  const own = new Set(place)
  return rentalLookalikeFold(title)
    .split(' ')
    .filter(Boolean)
    .every(word => GENERIC_WORDS.has(word) || COUNT_WORD.test(word) || own.has(word))
}

type LookalikeOffer = Pick<RentalOffer, 'source' | 'price' | 'currency'> &
  Partial<Pick<RentalOffer, 'sellerName'>>
export type RentalLookalikeRow = Pick<
  RentalPublicProperty,
  'title' | 'bedrooms' | 'bathrooms' | 'area' | 'latitude' | 'longitude'
> &
  Partial<Pick<RentalPublicProperty, 'neighborhood' | 'department'>> & {
    offers: readonly LookalikeOffer[]
    matchingOffer?: LookalikeOffer | null
  }

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
const positive = (value: unknown): number | null => {
  const number = finiteNumber(value)
  return number !== null && number > 0 ? number : null
}

export function rentalLookalikeFacts(row: RentalLookalikeRow): RentalLookalikeFacts {
  const offers = row.offers ?? []
  const prices: string[] = []
  for (const offer of [row.matchingOffer, ...offers]) {
    const price = positive(offer?.price)
    const currency: RentalCurrency | undefined = offer?.currency
    if (price === null || (currency !== 'UYU' && currency !== 'USD')) continue
    const value = `${currency}:${price}`
    if (!prices.includes(value)) prices.push(value)
  }
  const lat = finiteNumber(row.latitude)
  const lng = finiteNumber(row.longitude)
  const point = lat !== null && lng !== null ? { lat, lng } : null
  const sellers = [
    ...new Set(
      offers
        .map(offer => rentalLookalikeFold(offer.sellerName))
        .filter(name => name.length > 1 && !PLACEHOLDER_SELLERS.has(name))
    ),
  ]
  const place = [
    ...new Set(
      [row.neighborhood, row.department]
        .map(rentalLookalikeFold)
        .join(' ')
        .split(' ')
        .filter(Boolean)
    ),
  ]
  return {
    title: rentalLookalikeFold(row.title).slice(0, RENTAL_LOOKALIKE_TITLE_LENGTH).trim(),
    bedrooms: finiteNumber(row.bedrooms),
    bathrooms: finiteNumber(row.bathrooms),
    area: positive(row.area),
    prices,
    point,
    exactPoint:
      point !== null &&
      offers.length > 0 &&
      offers.every(offer => RENTAL_EXACT_COORDINATE_SOURCES.includes(offer.source)),
    sellers,
    place,
  }
}

/** Título + dormitorios + baños + el precio exacto del aviso principal, con su moneda. */
export function rentalLookalikeKey(facts: RentalLookalikeFacts): string {
  return [facts.title, facts.bedrooms ?? '', facts.bathrooms ?? '', facts.prices[0] ?? ''].join('|')
}

const closeAreas = (a: number, b: number, tolerance: number) =>
  Math.abs(a - b) <= tolerance * Math.min(a, b)
const samePoint = (a: RentalLookalikeFacts['point'], b: RentalLookalikeFacts['point']) =>
  !!a && !!b && Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6

/** El mismo texto de aviso: título, dormitorios, baños y precio, y una superficie compatible. */
function sameAdvertText(a: RentalLookalikeFacts, b: RentalLookalikeFacts): boolean {
  if (!a.title || a.title !== b.title) return false
  const areas = a.area !== null && b.area !== null
  if (rentalLookalikeGenericTitle(a.title, [...a.place, ...b.place]))
    return areas && closeAreas(a.area!, b.area!, RENTAL_LOOKALIKE_GENERIC_AREA_TOLERANCE)
  return !areas || closeAreas(a.area!, b.area!, RENTAL_LOOKALIKE_AREA_TOLERANCE)
}

/**
 * La misma inmobiliaria en el mismo punto exacto, al mismo precio y con la misma distribución: así
 * se ve una agencia que publica una unidad en varios barrios. iMas.uy publicó en El País el mismo
 * apartamento como Paso Molino, Sayago y Prado (-34.8518246, -56.2054531, $ 25.500), con títulos que
 * sólo cambiaban la palabra del barrio.
 */
function sameSellerSamePoint(a: RentalLookalikeFacts, b: RentalLookalikeFacts): boolean {
  if (a.bedrooms === null || !samePoint(a.point, b.point)) return false
  if (!a.sellers.some(seller => b.sellers.includes(seller))) return false
  return (
    a.area === null ||
    b.area === null ||
    closeAreas(a.area, b.area, RENTAL_LOOKALIKE_AREA_TOLERANCE)
  )
}

/** ¿Mostrar `a` y `b` juntos sería mostrar la misma vivienda dos veces? Simétrica. */
export function rentalLookalikes(a: RentalLookalikeFacts, b: RentalLookalikeFacts): boolean {
  if (a.bedrooms !== b.bedrooms || a.bathrooms !== b.bathrooms) return false
  if (!a.prices.some(price => b.prices.includes(price))) return false
  // La coordenada nunca suma, sólo veta: y sólo cuando las dos son el punto del propio aviso.
  if (a.exactPoint && b.exactPoint && haversineKm(a.point!, b.point!) > RENTAL_LOOKALIKE_VETO_KM)
    return false
  return sameAdvertText(a, b) || sameSellerSamePoint(a, b)
}

/** Cuál de varias copias representa al grupo: la que tiene foto y gastos comunes conocidos. */
export function rentalLookalikePreference(row: {
  offers?: readonly Partial<RentalOffer>[]
}): number {
  const offers = row.offers ?? []
  const photo = offers.some(
    offer => rentalSavedSafeUrl(offer.url) && rentalSavedSafeUrl(offer.image)
  )
  const expenses = offers.some(
    offer =>
      offer.commonExpenses === 0 ||
      (typeof offer.commonExpenses === 'number' &&
        offer.commonExpenses > 0 &&
        !!offer.commonExpensesCurrency)
  )
  return (photo ? 2 : 0) + (expenses ? 1 : 0)
}

export interface RentalLookalikeSplit<T> {
  /** Una fila por vivienda, en el orden de entrada (la posición del primero de cada grupo). */
  kept: T[]
  /** Las filas que parecen la propia vivienda de `subject`, la mejor primero. */
  copies: T[]
}

/**
 * Separa las copias de `subject` y deja una fila por vivienda entre las demás. Dentro de un grupo
 * representa la mejor según `preference` (a igualdad, la primera); el grupo conserva el lugar de
 * su primera fila, que en las listas ordenadas por precio es el mismo para todas sus copias.
 */
export function splitRentalLookalikes<T>(
  subject: RentalLookalikeFacts | null,
  rows: readonly T[],
  factsOf: (row: T) => RentalLookalikeFacts,
  preference: (row: T) => number = () => 0
): RentalLookalikeSplit<T> {
  const groups: Array<{ facts: RentalLookalikeFacts[]; rows: T[] }> = []
  const copies: T[] = []
  for (const row of rows) {
    const facts = factsOf(row)
    if (subject && rentalLookalikes(subject, facts)) {
      copies.push(row)
      continue
    }
    const group = groups.find(item => item.facts.some(other => rentalLookalikes(other, facts)))
    if (group) {
      group.facts.push(facts)
      group.rows.push(row)
    } else groups.push({ facts: [facts], rows: [row] })
  }
  const best = (list: readonly T[]) =>
    list.reduce((top, row) => (preference(row) > preference(top) ? row : top))
  return {
    kept: groups.map(group => best(group.rows)),
    copies: copies
      .map((row, index) => ({ row, index }))
      .sort((a, b) => preference(b.row) - preference(a.row) || a.index - b.index)
      .map(item => item.row),
  }
}
