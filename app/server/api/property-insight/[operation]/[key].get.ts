// "Comparada con lo que hay cerca" de una ficha de alquiler o de venta. Se pide desde el navegador
// después de pintar la ficha: el análisis lee cientos de avisos y la ficha no lo espera. Recibe sólo
// la clave del aviso; la coordenada sale de la base, nunca de quien pregunta.
import { propertySaleValidKey } from '../../../../utils/propertySales'
import { rentalValidKey } from '../../../../utils/rentals'
import type { PropertyInsight } from '../../../../utils/propertyInsight'
import { loadPropertySaleInsight, loadRentalInsight } from '../../../utils/propertyInsight'

export interface PropertyInsightResponse {
  insight: PropertyInsight | null
}

export default defineEventHandler(async (event): Promise<PropertyInsightResponse> => {
  const operation = String(getRouterParam(event, 'operation') ?? '')
  const key = String(getRouterParam(event, 'key') ?? '').trim()
  const valid =
    operation === 'alquiler'
      ? rentalValidKey(key)
      : operation === 'venta' && propertySaleValidKey(key)
  if (!valid) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Property is not available' })
  }
  try {
    const insight =
      operation === 'alquiler' ? await loadRentalInsight(key) : await loadPropertySaleInsight(key)
    setResponseHeader(event, 'cache-control', 'public, max-age=120, s-maxage=600')
    return { insight }
  } catch (error) {
    console.error('[api/property-insight] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Comparison temporarily unavailable',
      cause: error,
    })
  }
})
