import {
  CAR_PRICES_METHOD,
  carModelPricesUrl,
  carPricesCsv,
  carPricesQuery,
  OPEN_DATA_LICENSE,
  OPEN_DATA_PAGE,
  openCarModelPrices,
  openDataEnvelope,
  type OpenCarModelPrices,
} from '../../../../utils/openData'
import { loadCarMarketBands } from '../../../utils/cars'
import { openDataError, openDataHeaders } from '../../../utils/openData'

/**
 * Bandas de precio pedido de autos usados por modelo, año y año + versión + motor + caja: lo que
 * dibuja cada página de precios de modelo, con licencia CC BY 4.0 y sin la Guía de Mercado Libre.
 * Sin `modelo` devuelve el archivo completo (todos los modelos); `formato=csv` lo da en planilla.
 */
export default defineEventHandler(async event => {
  const parsed = carPricesQuery(getQuery(event) as Record<string, unknown>)
  if (!parsed.ok) openDataError(event, 400, parsed.error)
  let bands: Awaited<ReturnType<typeof loadCarMarketBands>>
  try {
    bands = await loadCarMarketBands()
  } catch {
    openDataError(event, 503, 'las bandas de precio no responden por un momento')
  }
  const source = parsed.modelo ? bands.filter(item => item.slug === parsed.modelo) : bands
  if (parsed.modelo && !source.length)
    openDataError(event, 404, 'modelo sin bandas publicadas (ver /api/datos/mercado?mercado=autos)')
  const models = source
    .map(item => openCarModelPrices(item, parsed))
    .filter((item): item is OpenCarModelPrices => !!item)
    // El archivo completo lista sólo modelos con alguna fila; un modelo pedido viene siempre.
    .filter(item => parsed.modelo || item.porAnio.length + item.porVersion.length > 0)
  const updated = models.reduce<string | null>(
    (max, item) => (item.actualizado && (!max || item.actualizado > max) ? item.actualizado : max),
    null
  )
  openDataHeaders(event, 3600)
  if (parsed.formato === 'csv') {
    setResponseHeaders(event, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `inline; filename="precios-autos-usados-uruguay${parsed.modelo ? `-${parsed.modelo}` : ''}.csv"`,
      link: `<${OPEN_DATA_PAGE}>; rel="describedby", <${OPEN_DATA_LICENSE.url}>; rel="license"`,
      'x-attribution': 'Fuente: Cambio Uruguay (cambio-uruguay.com)',
    })
    return carPricesCsv(models)
  }
  return openDataEnvelope(
    {
      moneda: 'USD',
      queMide: CAR_PRICES_METHOD,
      filtros: {
        modelo: parsed.modelo,
        anio: parsed.anio,
        minimo: parsed.minimo,
        nivel: parsed.nivel,
      },
      totales: {
        modelos: models.length,
        filasPorAnio: models.reduce((sum, item) => sum + item.porAnio.length, 0),
        filasPorVersion: models.reduce((sum, item) => sum + item.porVersion.length, 0),
      },
      modelos: models,
    },
    {
      pagina: parsed.modelo ? carModelPricesUrl(parsed.modelo) : OPEN_DATA_PAGE,
      actualizado: updated,
    }
  )
})
