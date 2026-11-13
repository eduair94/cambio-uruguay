import type { MarketSeriesIndex } from '../../../../utils/marketSeries'
import {
  isOpenDataMarket,
  marketPageUrl,
  OPEN_DATA_SITE,
  openDataEnvelope,
} from '../../../../utils/openData'
import { MarketSeriesMetaModel } from '../../../models/MarketSeries'
import { connectDb } from '../../../utils/db'
import { openDataError, openDataHeaders } from '../../../utils/openData'

const PAGES = {
  alquiler: '/evolucion-precio-alquileres-uruguay',
  venta: '/evolucion-precio-viviendas-uruguay',
  autos: '/evolucion-precio-autos-usados-uruguay',
} as const

/** Qué hay medido en un mercado: lugares o modelos con serie, desde cuándo y lo que más se movió. */
export default defineEventHandler(async event => {
  const market = String(getQuery(event).mercado || '').toLowerCase()
  if (!isOpenDataMarket(market))
    openDataError(event, 400, 'mercado debe ser alquiler, venta o autos')
  let index: MarketSeriesIndex | null = null
  try {
    await connectDb()
    index = (await MarketSeriesMetaModel.findOne({ key: `index:${market}` })
      .select({ _id: 0, __v: 0 })
      .maxTimeMS(5_000)
      .lean()) as unknown as MarketSeriesIndex | null
  } catch {
    openDataError(event, 503, 'datos no disponibles por un momento')
  }
  if (!index) openDataError(event, 503, 'el índice de este mercado todavía no está')
  openDataHeaders(event)
  const mover = (m: MarketSeriesIndex['movers']['down'][number]) => ({
    clave: m.key,
    etiqueta: m.label,
    moneda: m.currency,
    ventanaDias: m.window,
    variacion: m.chg,
    pares: m.pairs,
    bajaron: m.down,
    subieron: m.up,
    url: marketPageUrl(m.key),
  })
  return openDataEnvelope(
    {
      mercado: market,
      dia: index.day,
      medidoDesde: index.trackingSince,
      observaciones: index.observations,
      cohortes: index.cohorts,
      lugares: (index.scopes ?? []).map(scope => ({
        ambito: scope.scope,
        token: scope.token,
        departamento: scope.department,
        barrio: scope.neighborhood,
        etiqueta: scope.label,
        avisos: scope.n,
      })),
      modelos: (index.models ?? []).map(model => ({
        slug: model.slug,
        marca: model.brand,
        modelo: model.model,
        avisos: model.n,
        medianaUsd: model.med,
        variacion30d: model.w30,
        url: `${OPEN_DATA_SITE}/autos-usados-uruguay/precios/${model.slug}`,
      })),
      movimientos: {
        ventanaDias: index.movers?.window ?? null,
        bajaron: (index.movers?.down ?? []).map(mover),
        subieron: (index.movers?.up ?? []).map(mover),
      },
    },
    { pagina: `${OPEN_DATA_SITE}${PAGES[market]}`, actualizado: index.generatedAt }
  )
})
