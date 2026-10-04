// GET /api/cars/budget/<monto>: el tramo del informe del mercado (`carreportsnapshots`) para
// /autos-usados-uruguay/hasta-<monto>-dolares, más unos avisos vigentes de ese presupuesto.
// No recalcula nada: los modelos, sus medianas y el conteo de la franja son los del informe.
import {
  CAR_BUDGET_MIN_MODELS,
  CAR_BUDGETS,
  parseCarBudget,
  type CarBudgetModelRow,
  type CarBudgetResponse,
} from '../../../../utils/carBudget'
import { CAR_MARKET_INDEX_MIN } from '../../../../utils/cars'
import type { PublicCarReportBudget } from '../../../../utils/carsPublic'
import { CarCatalogModel } from '../../../models/CarCatalog'
import {
  carListingProjection,
  loadCarCatalogMeta,
  loadCarReport,
  publicCarRow,
} from '../../../utils/cars'

export default defineEventHandler(async event => {
  const budget = parseCarBudget(getRouterParam(event, 'monto'))
  if (budget === null) throw createError({ statusCode: 404, statusMessage: 'Budget not found' })

  let tier: PublicCarReportBudget | undefined
  let generatedAt: string
  try {
    const snapshot = await loadCarReport()
    if (!snapshot) throw new Error('CAR_REPORT_PREPARING')
    tier = snapshot.data.budgets?.find(entry => entry.maxUsd === budget)
    generatedAt = snapshot.generatedAt
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'The used-car budget page is temporarily unavailable',
      cause: error,
    })
  }
  if (!tier) throw createError({ statusCode: 404, statusMessage: 'Budget not found' })

  // La página de modelo enlazada tiene que existir y ser indexable: mismo criterio que el sitemap.
  const meta = await loadCarCatalogMeta().catch(() => null)
  const withPage = new Set(
    (meta?.models ?? [])
      .filter(model => model.listings >= CAR_MARKET_INDEX_MIN)
      .map(model => model.slug)
  )
  const freshDays = meta?.freshDays ?? 4

  // El piso del 50 % deja afuera repuestos y señas que priceSanity no haya retirado.
  const listings = await CarCatalogModel.find({
    priceUsd: { $lte: budget, $gte: budget * 0.5 },
    lastSeen: { $gte: new Date(Date.now() - freshDays * 86_400_000).toISOString() },
  })
    .select(carListingProjection)
    .sort({ year: -1, priceUsd: 1, key: 1 })
    .limit(12)
    .maxTimeMS(5_000)
    .lean()
    .then(rows => rows.map(row => publicCarRow(row as Record<string, unknown>)))
    .catch(() => [])

  // Campo por campo: el documento viene de Mongo y la respuesta es pública.
  const models: CarBudgetModelRow[] = tier.models.map(model => ({
    marketSlug: model.marketSlug,
    brand: model.brand,
    model: model.model,
    adverts: model.adverts,
    medianUsd: model.medianUsd,
    medianYear: model.medianYear,
    medianKm: model.medianKm,
    hasPage: withPage.has(model.marketSlug),
  }))
  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=900')
  const response: CarBudgetResponse = {
    budget,
    adverts: tier.adverts,
    models,
    listings,
    generatedAt,
    indexable: models.length >= CAR_BUDGET_MIN_MODELS,
    others: CAR_BUDGETS.filter(other => other !== budget),
  }
  return response
})
