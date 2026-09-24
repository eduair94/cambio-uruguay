// El asesor de compra (/que-auto-comprar-uruguay): puntúa la tabla por modelo que deja el job
// contra lo que la persona contestó. El análisis pesado ya está hecho (caradvisorsnapshots); acá
// sólo se filtra y ordena una tabla chica en memoria.
import { adviseCars, normalizeCarAdvisorQuery } from '../../../utils/carAdvisor'
import type { FuelResponse } from '../../../utils/fuelPrices'
import { FUEL_FALLBACK } from '../../utils/combustiblesFallback'
import { loadCarAdvisor } from '../../utils/cars'

async function fuelPrices(): Promise<FuelResponse> {
  try {
    const response = await $fetch<FuelResponse>('/api/combustibles')
    return response?.latest?.super95 != null && response.latest.gasoil50s != null
      ? response
      : FUEL_FALLBACK
  } catch {
    return FUEL_FALLBACK
  }
}

export default defineEventHandler(async event => {
  const query = normalizeCarAdvisorQuery(getQuery(event))
  let snapshot
  try {
    snapshot = await loadCarAdvisor()
    if (!snapshot) throw new Error('CAR_ADVISOR_PREPARING')
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'The used-car advisor is temporarily unavailable',
      cause: error,
    })
  }
  const fuel = await fuelPrices()
  const prices = { super95: fuel.latest.super95!, gasoil50s: fuel.latest.gasoil50s! }
  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=900')
  return {
    generatedAt: snapshot.generatedAt,
    usdUyu: snapshot.usdUyu,
    models: snapshot.data.models.length,
    typicalDrop: snapshot.data.typicalDrop,
    partsBaseline: snapshot.data.partsBaseline,
    fuel: { asOf: fuel.asOf, from: fuel.latest.from, ...prices },
    query,
    ...adviseCars(snapshot, query, prices),
  }
})
