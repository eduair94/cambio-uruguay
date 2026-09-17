import { PriceEventSnapshotModel } from '../models/PriceEventSnapshot'
import { connectDb } from '../utils/db'
import type { PriceEventApiResponse } from '../../utils/priceEvents'

/**
 * `/ciberlunes-y-black-friday-uruguay` en vivo: el snapshot `current` (bajas reales y tachados de
 * hoy) más la serie de los últimos 30 días para el gráfico. Escrito por `sync_price_events.ts`
 * (Task 2, raíz) en APP DB `priceeventsnapshots`.
 *
 * Final review M7: esta ruta YA NO sirve `events` — la página nunca lo leyó (siempre pintó el
 * calendario desde el espejo estático `PRICE_EVENT_CALENDAR`, `app/utils/priceEvents.ts`), así que
 * mandarlo por la red en cada visita era ~40 KB sin lector. Si algún día un consumidor SÍ necesita el
 * calendario servido por la API, agregarlo de nuevo acá junto con `PriceEventApiResponse` y su test.
 */

/** La vitrina de la página nunca pinta más de esto: recortar acá evita mandar por la red el resto del
 * `topDrops` guardado (hasta 200, ver `classes/priceevents/aggregate.ts`) para nada. */
const PRICE_EVENT_RESPONSE_MAX_DROPS = 50

/** Cuántos documentos `day:YYYY-MM-DD` sirve la serie de 30 días de la página. */
const PRICE_EVENT_RESPONSE_MAX_DAYS = 30

const PRICE_EVENT_EMPTY_RESPONSE: PriceEventApiResponse = {
  current: null,
  days: [],
}

interface PriceEventDayDocLean {
  day: string
  eligible?: number
  dropsCount?: number
  inflatedCount?: number
}

export default defineEventHandler(async (event): Promise<PriceEventApiResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()

    const [currentDoc, dayDocsDesc] = await Promise.all([
      PriceEventSnapshotModel.findOne({ key: 'current' })
        // Sólo los campos que la página renderiza: nunca `_id`/`__v`/`key` (interno, "current" o
        // "day:<fecha>", sin valor para el lector) ni los timestamps de Mongoose.
        .select({
          _id: 0,
          day: 1,
          event: 1,
          generatedAt: 1,
          trackingSince: 1,
          analyzed: 1,
          eligible: 1,
          byVertical: 1,
          topDrops: 1,
          dropsCount: 1,
          inflatedCount: 1,
          sellers: 1,
          bySource: 1,
          suspect: 1,
        })
        .lean(),
      // Ordenado DESC para tomar los 30 más recientes con `.limit()`, y se da vuelta después para
      // servir ascendente (el orden que pinta el gráfico de la página).
      PriceEventSnapshotModel.find({ key: { $regex: /^day:/ } })
        .select({ _id: 0, day: 1, eligible: 1, dropsCount: 1, inflatedCount: 1 })
        .sort({ day: -1 })
        .limit(PRICE_EVENT_RESPONSE_MAX_DAYS)
        .lean(),
    ])

    const days = (dayDocsDesc as unknown as PriceEventDayDocLean[])
      .slice()
      .reverse()
      .map(doc => ({
        day: doc.day,
        eligible: doc.eligible ?? 0,
        // NUNCA `topDrops.length`: ese array está recortado a 200 (ver aggregate.ts) y estos totales
        // tienen que ser el conteo real del día, no el tamaño de la vitrina.
        drops: doc.dropsCount ?? 0,
        inflated: doc.inflatedCount ?? 0,
      }))

    const current = currentDoc
      ? ({
          ...(currentDoc as unknown as PriceEventApiResponse['current']),
          topDrops: ((currentDoc as unknown as { topDrops?: unknown[] }).topDrops ?? []).slice(
            0,
            PRICE_EVENT_RESPONSE_MAX_DROPS
          ),
        } as PriceEventApiResponse['current'])
      : null

    return { current, days }
  } catch {
    // Un problema de Mongo nunca puede tirar la página entera: el resto (cómo medimos, el marco
    // legal, los enlaces relacionados) vale la pena leerlo aunque hoy no haya datos.
    return PRICE_EVENT_EMPTY_RESPONSE
  }
})
