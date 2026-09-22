import mongoose from 'mongoose'
import {
  seriesFromCarListing,
  seriesFromMarketLog,
  seriesFromPricewatch,
  type PriceHistorySeries,
} from '../../utils/priceHistory'

/**
 * La lectura del historial por aviso, para las fichas y los directorios que YA piden esa fila. No hay
 * ruta `/api/price-history`: la serie viaja adjunta a la respuesta que la página ya pide, así va en el
 * HTML servido y no cuesta un segundo viaje por el mismo id.
 *
 * Las tres colecciones son PRIVADAS (`pricewatchoffers`, `carlistings`, `marketpricelogs`). De ellas
 * sale sólo la serie del aviso que el lector está mirando: fecha, precio y moneda, que es el mismo
 * precio pedido que ese aviso publica hoy, fechado por nosotros. `publicSeries` es el único lugar que
 * arma lo que cruza la red, y `app/tests/unit/priceHistoryPrivacy.test.ts` lo vigila.
 */

/** Cuántos ids entran en UNA consulta. Se pide por tandas, no de a uno. */
export const PRICE_HISTORY_ID_MAX = 60

/**
 * Cuántos ids puede pedir una página en total (5 tandas). Una ficha de categoría de equipar muestra
 * varias decenas de productos con hasta ocho ofertas cada uno: con un tope único de 60 la mitad de
 * las tarjetas se quedaba sin variación, y cuál se quedaba dependía del orden. Sigue siendo un tope:
 * esto es la página que el lector tiene delante, no la colección entera.
 */
export const PRICE_HISTORY_TOTAL_MAX = 300

const ID = /^[\w:.-]{1,160}$/

/**
 * La colección, sólo si la conexión está abierta. Sin esta guarda, una llamada con la conexión caída
 * queda EN COLA en el buffer de mongoose en vez de fallar: la ficha se cuelga hasta que el buffer
 * vence (10 s por defecto) en lugar de salir sin el bloque de precios, que es opcional.
 */
const collection = (name: string) =>
  mongoose.connection.readyState === 1 ? mongoose.connection.collection(name) : null

const cleanIds = (ids: readonly string[]): string[] =>
  [...new Set(ids.filter(id => typeof id === 'string' && ID.test(id)))].slice(0, PRICE_HISTORY_TOTAL_MAX)

const chunks = (ids: readonly string[]): string[][] => {
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += PRICE_HISTORY_ID_MAX) out.push(ids.slice(i, i + PRICE_HISTORY_ID_MAX))
  return out
}

/** Lo ÚNICO que sale por la red. Cualquier campo nuevo del documento privado se queda adentro. */
export function publicSeries(series: PriceHistorySeries): PriceHistorySeries {
  return {
    id: series.id,
    currency: series.currency,
    points: series.points.map(point => ({ d: point.d, p: point.p })),
    firstSeen: series.firstSeen,
    lastSeen: series.lastSeen,
    changePct: series.changePct,
    lastChange: series.lastChange ? { from: series.lastChange.from, to: series.lastChange.to, at: series.lastChange.at } : null,
    currencySwitched: series.currencySwitched,
  }
}

/** equipar, sillas, celulares y movilidad: un punto por día por `listingId`. */
export async function pricewatchHistory(ids: readonly string[]): Promise<Map<string, PriceHistorySeries>> {
  const wanted = cleanIds(ids)
  const found = new Map<string, PriceHistorySeries>()
  if (!wanted.length) return found
  const offers = collection('pricewatchoffers')
  if (!offers) return found
  for (const chunk of chunks(wanted)) {
    const rows = await offers
      .find(
        { listingId: { $in: chunk } },
        { projection: { _id: 0, listingId: 1, currency: 1, firstSeen: 1, lastSeen: 1, history: 1 }, maxTimeMS: 4000 }
      )
      .toArray()
    for (const row of rows) {
      const series = seriesFromPricewatch(row)
      if (series) found.set(series.id, publicSeries(series))
    }
  }
  return found
}

/** autos: `carlistings.priceHistory`, la serie que se actualiza cada hora. */
export async function carHistory(key: string): Promise<PriceHistorySeries | null> {
  if (!ID.test(key)) return null
  const cars = collection('carlistings')
  if (!cars) return null
  const row = await cars.findOne(
    { key },
    { projection: { _id: 0, key: 1, firstSeen: 1, lastSeen: 1, priceHistory: 1, 'listing.currency': 1 }, maxTimeMS: 4000 }
  )
  const series = row ? seriesFromCarListing(row) : null
  return series ? publicSeries(series) : null
}

/** alquiler y venta: `marketpricelogs`, un punto sólo cuando el precio cambia. */
export async function marketHistory(
  vertical: 'alquiler' | 'venta',
  advertIds: readonly string[]
): Promise<Map<string, PriceHistorySeries>> {
  const wanted = cleanIds(advertIds)
  const found = new Map<string, PriceHistorySeries>()
  if (!wanted.length) return found
  const logs = collection('marketpricelogs')
  if (!logs) return found
  for (const chunk of chunks(wanted)) {
    const rows = await logs
      .find(
        { key: { $in: chunk.map(id => `${vertical}:${id}`) } },
        { projection: { _id: 0, advertId: 1, firstSeen: 1, lastSeen: 1, points: 1 }, maxTimeMS: 4000 }
      )
      .toArray()
    for (const row of rows) {
      const series = seriesFromMarketLog(row)
      if (series) found.set(series.id, publicSeries(series))
    }
  }
  return found
}

/**
 * El id con el que `marketpricelogs` conoce a un aviso de alquiler: `<fuente>:<id nativo>`, con el
 * prefijo de la fuente sacado si el propio `listingId` ya lo traía (la regla de
 * `classes/propertyzones/project.ts`, que es quien escribe esos logs).
 */
export function rentalAdvertId(source: unknown, listingId: unknown): string | null {
  if (typeof source !== 'string' || typeof listingId !== 'string' || !source || !listingId) return null
  const native = listingId.startsWith(`${source}:`) ? listingId.slice(source.length + 1) : listingId
  return native ? `${source}:${native}` : null
}
