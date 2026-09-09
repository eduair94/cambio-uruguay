/**
 * Las dos cosas que sólo puede decir quien lee varios portales a la vez.
 *
 * El directorio publica UNA fila por vivienda con los avisos de hasta cinco portales adentro
 * (`RentalProperty.offers`). Con eso ya se puede contestar algo que ningún portal puede: el mismo
 * inmueble no siempre cuesta lo mismo en los dos lados. Y `firstSeen`/`publishedAt` contestan la
 * otra: cuánto lleva ese aviso dando vueltas, que es con lo que se negocia y que ningún listado
 * muestra.
 *
 * Todo acá es puro y trabaja sobre el payload que la lista YA recibe: no hay llamada nueva.
 */
import type { RentalOffer, RentalSource } from '~/utils/rentals'

/**
 * Se pide la forma mínima y no `RentalProperty`: la ficha trabaja con `RentalPublicProperty` y
 * además le pasa sus ofertas ya filtradas. Atarse al tipo completo obligaría a castear en los dos
 * llamadores, que es la manera de que un cast tape un error de verdad más adelante.
 */
export interface RentalOffersInput {
  offers?: readonly RentalOffer[] | null
}

export interface RentalListedInput extends RentalOffersInput {
  firstSeen?: string | null
}

/** Diferencia mínima en pesos. Por debajo es redondeo y conversión de dólares, no una diferencia. */
export const RENTAL_GAP_MIN_UYU = 200
/** Y mínima relativa, para que un alquiler de US$ 2.500 no dispare el cartel por $300. */
export const RENTAL_GAP_MIN_PCT = 1

export interface PortalPriceGap {
  cheapestSource: RentalSource
  runnerUpSource: RentalSource
  cheapestUyu: number
  runnerUpUyu: number
  /** Pesos de más que cuesta el segundo portal. */
  diffUyu: number
  /** Ese exceso sobre el precio más caro: «pagar en X es un 9,4 % más». */
  diffPct: number
  /** El aviso concreto que sostiene el precio más barato, para enlazarlo. */
  cheapestOffer: RentalOffer
}

const comparablePrice = (offer: RentalOffer): number | null => {
  const price = Number(offer?.priceUyu)
  return Number.isFinite(price) && price > 0 ? price : null
}

/**
 * El mejor precio de cada portal, y la diferencia entre los dos mejores.
 *
 * Se compara EL MEJOR DE CADA PORTAL, no el mínimo y el máximo del conjunto: si Mercado Libre
 * tiene a la vez el aviso más barato y el más caro, comparar contra sí mismo no le sirve a nadie.
 * Lo que se responde es «¿me conviene ir a otro portal?».
 */
export function portalPriceGap(
  property: RentalOffersInput | null | undefined
): PortalPriceGap | null {
  const best = new Map<RentalSource, { price: number; offer: RentalOffer }>()
  for (const offer of property?.offers || []) {
    const price = comparablePrice(offer)
    if (price === null || !offer.source) continue
    const current = best.get(offer.source)
    if (!current || price < current.price) best.set(offer.source, { price, offer })
  }

  const ranked = [...best.entries()].sort((a, b) => a[1].price - b[1].price)
  if (ranked.length < 2) return null

  const [cheapestSource, cheapest] = ranked[0]!
  const [runnerUpSource, runnerUp] = ranked[1]!
  const diffUyu = runnerUp.price - cheapest.price
  const diffPct = (diffUyu / runnerUp.price) * 100
  if (diffUyu < RENTAL_GAP_MIN_UYU || diffPct < RENTAL_GAP_MIN_PCT) return null

  return {
    cheapestSource,
    runnerUpSource,
    cheapestUyu: cheapest.price,
    runnerUpUyu: runnerUp.price,
    diffUyu,
    diffPct,
    cheapestOffer: cheapest.offer,
  }
}

/** Por debajo de una semana el dato no informa nada y le saca lugar al resto de la tarjeta. */
export const RENTAL_LISTED_MIN_DAYS = 7

export interface RentalListedFor {
  days: number
  /**
   * `published`: lo dice el portal. `observed`: es la primera vez que NOSOTROS lo vimos, que
   * puede ser mucho después de publicado. La diferencia cambia la frase, no sólo el dato.
   */
  basis: 'published' | 'observed'
  date: string
}

const DAY_MS = 86_400_000

/** Sólo `YYYY-MM-DD` a medianoche UTC; cualquier otra cosa es dato inservible, no una fecha rara. */
const parseDay = (value: unknown, now: number): number | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const time = Date.parse(`${value}T00:00:00Z`)
  // Una fecha futura es un error del origen: no se convierte en «hace -3 días».
  if (!Number.isFinite(time) || time > now) return null
  return time
}

/**
 * Cuánto lleva publicada la vivienda, contando desde el más viejo de sus avisos.
 *
 * Se prefiere la fecha que publica el portal; si no la publica, se usa la primera lectura propia
 * y el `basis` obliga a que la interfaz lo diga con otras palabras.
 */
export function rentalListedFor(
  property: RentalListedInput | null | undefined,
  now: Date = new Date()
): RentalListedFor | null {
  const nowMs = now.getTime()
  let oldest: { time: number; basis: 'published' | 'observed'; date: string } | null = null

  const consider = (value: unknown, basis: 'published' | 'observed') => {
    const time = parseDay(value, nowMs)
    if (time === null) return
    if (!oldest || time < oldest.time) oldest = { time, basis, date: value as string }
  }

  for (const offer of property?.offers || []) {
    // `publishedAt` gana dentro del aviso: `firstSeen` sólo dice cuándo empezamos a mirar.
    if (parseDay(offer?.publishedAt, nowMs) !== null) consider(offer.publishedAt, 'published')
    else consider(offer?.firstSeen, 'observed')
  }
  if (!oldest) consider(property?.firstSeen, 'observed')
  if (!oldest) return null

  const found = oldest as { time: number; basis: 'published' | 'observed'; date: string }
  const days = Math.floor((nowMs - found.time) / DAY_MS)
  if (days < RENTAL_LISTED_MIN_DAYS) return null
  return { days, basis: found.basis, date: found.date }
}
