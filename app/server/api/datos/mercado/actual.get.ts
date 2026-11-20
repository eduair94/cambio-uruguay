import type { MarketSeriesDoc } from '../../../../utils/marketSeries'
import {
  escapeRegex,
  marketSnapshotPrefix,
  OPEN_DATA_PAGE,
  openDataEnvelope,
  openMarketRow,
} from '../../../../utils/openData'
import { MarketSeriesModel } from '../../../models/MarketSeries'
import { connectDb } from '../../../utils/db'
import { openDataError, openDataHeaders } from '../../../utils/openData'

/** Tope de filas: hoy hay unas pocas centenas de lugares o modelos por combinación. */
const MAX_ROWS = 1000

/**
 * La foto del último día de TODAS las cohortes de una combinación: cada departamento y barrio con
 * muestra para "apartamento de 2 dormitorios en pesos", o cada modelo de auto. Lee sólo `latest`
 * (los `points` y las formas nunca salen de Mongo) y filtra por prefijo de clave, que usa el índice.
 */
export default defineEventHandler(async event => {
  const query = getQuery(event) as Record<string, unknown>
  const parsed = marketSnapshotPrefix(query)
  if (!parsed.ok) openDataError(event, 400, parsed.error)
  let docs: MarketSeriesDoc[] = []
  try {
    await connectDb()
    const filter =
      parsed.market === 'autos'
        ? // Modelos, no modelo+año: `|y:` es la serie de un año puntual (la pide /serie).
          { key: { $regex: `^${escapeRegex(parsed.prefix)}[a-z0-9-]+$` } }
        : { key: { $regex: `^${escapeRegex(parsed.prefix)}` } }
    docs = (await MarketSeriesModel.find(filter)
      .select({ _id: 0, key: 1, dims: 1, labels: 1, label: 1, latest: 1 })
      .limit(MAX_ROWS)
      .maxTimeMS(8_000)
      .lean()) as unknown as MarketSeriesDoc[]
  } catch {
    openDataError(event, 503, 'datos no disponibles por un momento')
  }
  const rows = docs
    .filter(doc => doc.latest && typeof doc.latest.d === 'string')
    .map(openMarketRow)
    .sort((a, b) => (b.ultimo.avisos ?? 0) - (a.ultimo.avisos ?? 0))
  const day = rows.reduce<string | null>(
    (latest, row) => (!latest || row.ultimo.fecha > latest ? row.ultimo.fecha : latest),
    null
  )
  openDataHeaders(event)
  return openDataEnvelope(
    { mercado: parsed.market, filas: rows.length, cohortes: rows },
    { pagina: OPEN_DATA_PAGE, actualizado: day }
  )
})
