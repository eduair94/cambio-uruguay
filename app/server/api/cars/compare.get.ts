// El comparador de modelos (/comparar-autos-usados-uruguay): arma las columnas de los modelos de la
// URL desde la tabla del asesor (caradvisorsnapshots). Sólo depende de QUÉ modelos y variantes se
// comparan: el año, el presupuesto y los km los resuelve la página con la misma función pura
// (utils/carCompare.ts), así el deslizador de presupuesto no vuelve a pedir nada.
import {
  buildCarCompareResponse,
  normalizeCarCompareQuery,
  type CarCompareResponse,
} from '../../../utils/carCompare'
import { latinNcapResults } from '../../../utils/latinNcap'
import { loadCarFuelPrices } from '../../utils/carFuelPrices'
import { loadCarAdvisor } from '../../utils/cars'

export default defineEventHandler(async (event): Promise<CarCompareResponse> => {
  const { picks } = normalizeCarCompareQuery(getQuery(event))
  let snapshot
  try {
    snapshot = await loadCarAdvisor()
    if (!snapshot) throw new Error('CAR_ADVISOR_PREPARING')
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'The used-car comparison is temporarily unavailable',
      cause: error,
    })
  }
  const fuel = await loadCarFuelPrices()
  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=900')
  return buildCarCompareResponse(snapshot, picks, {
    fuel: { asOf: fuel.asOf, super95: fuel.latest.super95!, gasoil50s: fuel.latest.gasoil50s! },
    ncapOf: slug => latinNcapResults(slug, 6),
  })
})
