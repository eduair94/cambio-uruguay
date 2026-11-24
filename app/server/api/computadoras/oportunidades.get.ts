import { ComputerCatalogModel } from '../../models/ComputerCatalog'
import { ComputerMetaModel } from '../../models/ComputerMeta'
import { connectDb } from '../../utils/db'
import { computerPreviewToday, readComputerPreview } from '../../utils/computadorasPreview'
import {
  COMPUTER_DEALS_PER_PAGE,
  COMPUTER_DEAL_SUMMARY_PROJECTION,
  COMPUTER_FRESH_DAYS_FALLBACK,
  COMPUTER_META_ID,
  COMPUTER_ROW_PROJECTION,
  computerCoverageOf,
  computerDealBaseMatch,
  computerDealMatch,
  computerDealNormalizeQuery,
  computerDealSortSpec,
  computerDealSummary,
  computerDealsEmpty,
  computerDealsInMemory,
  type ComputerDealSummaryRow,
  type ComputerDealsResponse,
} from '../../../utils/computadoras'
import type {
  ComputerPublicListing,
  ComputerPublicMetaDoc,
} from '../../../utils/computadorasPublic'

/**
 * Las oportunidades de `/oportunidades-computadoras-usadas-uruguay`: las filas del catálogo que el
 * job marcó con `opportunity` (pide entre el 15 % y el 55 % menos que su referencia, sin fallas
 * declaradas ni moneda deducida, con la ficha de Facebook leída), dentro de la ventana de frescura
 * de la corrida.
 *
 * Además de la página pedida manda el RESUMEN de la lista entera, sin ningún filtro, como
 * `/api/car-opportunities`: las páginas filtradas van noindex, así que la URL que indexa el buscador
 * tiene que describir todo lo que hay y no sólo los primeros 24. La lista con oportunidad es chica
 * (cientos de filas como mucho) y el resumen lee sólo seis campos de cada una.
 *
 * Los mismos tres estados que el directorio: sin corrida `preparing`, con la base caída
 * `unavailable` y `no-store` (nunca un vacío cacheado), y si no `ok`.
 */
export default defineEventHandler(async (event): Promise<ComputerDealsResponse> => {
  const query = computerDealNormalizeQuery(getQuery(event) as Record<string, unknown>)

  // Vista previa en dev: el JSON del dry-run del job, por el mismo filtro y el mismo orden.
  if (import.meta.dev && process.env.COMPUTADORAS_PREVIEW_FILE) {
    try {
      const file = await readComputerPreview()
      setResponseHeader(event, 'cache-control', 'no-store')
      if (file)
        return computerDealsInMemory(file.items, file.meta, query, computerPreviewToday(file))
    } catch {
      setResponseHeader(event, 'cache-control', 'no-store')
      return computerDealsEmpty(query, 'unavailable')
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  try {
    await connectDb()
    const metaDoc = (await ComputerMetaModel.findOne({ key: COMPUTER_META_ID })
      .select({ _id: 0, key: 1, generatedAt: 1, meta: 1 })
      .maxTimeMS(5_000)
      .lean()) as unknown as ComputerPublicMetaDoc | null
    const coverage = computerCoverageOf(metaDoc?.meta ?? null)
    const freshDays = coverage?.freshDays ?? COMPUTER_FRESH_DAYS_FALLBACK
    const match = computerDealMatch(query, today, freshDays)

    const [total, items, summaryRows] = await Promise.all([
      ComputerCatalogModel.countDocuments(match).maxTimeMS(10_000),
      ComputerCatalogModel.find(match)
        .select(COMPUTER_ROW_PROJECTION)
        .sort(computerDealSortSpec(query.orden))
        .skip((query.pagina - 1) * COMPUTER_DEALS_PER_PAGE)
        .limit(COMPUTER_DEALS_PER_PAGE)
        .maxTimeMS(10_000)
        .lean(),
      ComputerCatalogModel.find(computerDealBaseMatch(today, freshDays))
        .select(COMPUTER_DEAL_SUMMARY_PROJECTION)
        .limit(5_000)
        .maxTimeMS(10_000)
        .lean(),
    ])

    setResponseHeader(
      event,
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
    )
    return {
      status: metaDoc ? 'ok' : 'preparing',
      generatedAt: coverage?.generatedAt ?? '',
      total,
      page: query.pagina,
      perPage: COMPUTER_DEALS_PER_PAGE,
      items: (items ?? []) as unknown as ComputerPublicListing[],
      summary: computerDealSummary((summaryRows ?? []) as unknown as ComputerDealSummaryRow[]),
    }
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return computerDealsEmpty(query, 'unavailable')
  }
})
