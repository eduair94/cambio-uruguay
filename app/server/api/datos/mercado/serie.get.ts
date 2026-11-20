import type { MarketSeriesDoc } from '../../../../utils/marketSeries'
import {
  marketKeyFromQuery,
  marketPageUrl,
  openDataEnvelope,
  openMarketPoint,
  openMarketRow,
} from '../../../../utils/openData'
import { MarketSeriesModel } from '../../../models/MarketSeries'
import { connectDb } from '../../../utils/db'
import { openDataError, openDataHeaders } from '../../../utils/openData'

/**
 * La serie diaria de una cohorte. Si la combinación no tiene muestra suficiente responde 404 con
 * el motivo: el sitio nunca publica una mediana de menos de 8 avisos.
 */
export default defineEventHandler(async event => {
  const parsed = marketKeyFromQuery(getQuery(event) as Record<string, unknown>)
  if (!parsed.ok) openDataError(event, 400, parsed.error)
  let doc: MarketSeriesDoc | null = null
  try {
    await connectDb()
    doc = (await MarketSeriesModel.findOne(
      { key: parsed.key },
      { _id: 0, key: 1, dims: 1, labels: 1, label: 1, latest: 1, points: 1, updatedAt: 1 }
    )
      .maxTimeMS(5_000)
      .lean()) as unknown as MarketSeriesDoc | null
  } catch {
    openDataError(event, 503, 'datos no disponibles por un momento')
  }
  if (!doc)
    openDataError(
      event,
      404,
      'sin serie para esa combinación: hacen falta al menos 8 avisos (probá /api/datos/mercado/actual para ver qué hay)'
    )
  openDataHeaders(event)
  const { ultimo, ...row } = openMarketRow(doc)
  return openDataEnvelope(
    { ...row, ultimo, puntos: (doc.points ?? []).map(openMarketPoint) },
    { pagina: marketPageUrl(doc.key), actualizado: doc.latest?.d ?? null }
  )
})
