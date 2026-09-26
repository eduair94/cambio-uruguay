// El asesor de vivienda (/donde-vivir-uruguay): los barrios donde lo que la persona necesita entra en
// su plata, para alquilar, comprar o comparar. Los agregados ya están calculados; acá se puntúan.
import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { adviseHousing, normalizeHousingAdvisorQuery } from '../../../utils/housingAdvisor'
import { RENTAL_ZONE_DEPARTMENTS } from '../../../utils/rentalZones'
import { loadHousingAdvisorData } from '../../utils/housingAdvisor'

export default defineEventHandler(async event => {
  const query = normalizeHousingAdvisorQuery(getQuery(event))
  let data
  try {
    data = await loadHousingAdvisorData(query.department, query.type, query.bedrooms)
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'The housing advisor is temporarily unavailable',
      cause: error,
    })
  }
  // Sin dólar alquilar anda igual; comprar y comparar necesitan llevar los precios a pesos.
  if (!(data.usdUyu > 0) && query.operation !== 'alquilar') {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'The housing advisor is temporarily unavailable',
    })
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=900')
  return {
    generatedAt: data.generatedAt,
    usdUyu: data.usdUyu,
    zones: data.zones.length,
    departments: RENTAL_ZONE_DEPARTMENTS,
    query,
    ...adviseHousing(data.zones, query, { usdUyu: data.usdUyu, power: data.power }),
  }
})
