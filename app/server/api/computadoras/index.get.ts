import { ComputerCatalogModel } from '../../models/ComputerCatalog'
import { ComputerMetaModel } from '../../models/ComputerMeta'
import { connectDb } from '../../utils/db'
import { computerPreviewToday, readComputerPreview } from '../../utils/computadorasPreview'
import {
  COMPUTERS_PER_PAGE,
  COMPUTER_EMPTY_FACETS,
  COMPUTER_FACET_SPECS,
  COMPUTER_FRESH_DAYS_FALLBACK,
  COMPUTER_META_ID,
  COMPUTER_RAM_STEPS,
  COMPUTER_ROW_PROJECTION,
  computerCoverageOf,
  computerEmptyList,
  computerFacetPipeline,
  computerLabelFacet,
  computerListInMemory,
  computerMatch,
  computerNormalizeQuery,
  computerRamFacet,
  computerSortSpec,
  type ComputerFacetRow,
  type ComputerFacets,
  type ComputerListResponse,
} from '../../../utils/computadoras'
import type {
  ComputerPublicListing,
  ComputerPublicMetaDoc,
} from '../../../utils/computadorasPublic'

/**
 * El listado de `/computadoras-usadas-uruguay`: un AVISO por fila, con filtros y paginado.
 *
 * Las mismas tres decisiones que `/api/motos`, por las mismas razones:
 *
 * 1. **La ventana de frescura sale de la corrida** (`meta.freshDays`), no de una constante de acá:
 *    dos verdades harían que la página liste avisos que el job ya dejó de contar.
 * 2. **Un fallo de base no es un 404 ni un 500**: la forma vacía con `status: 'unavailable'` y
 *    `cache-control: no-store`. Un directorio vacío cacheado diez minutos porque Mongo parpadeó
 *    esconde el catálogo entero durante esa ventana, y un 500 rompería el SSR de la página.
 * 3. **Sin documento de corrida, `status: 'preparing'`**: el job todavía no publicó nada, y la
 *    página tiene que poder decir «el relevamiento está arrancando», no «no hay computadoras».
 *
 * Qué cumple cada filtro lo define UNA función (`computerMatch`), la misma que evalúa en memoria la
 * vista previa de dev: si la regla viviera dos veces, la vista previa mostraría otra página.
 */
export default defineEventHandler(async (event): Promise<ComputerListResponse> => {
  const query = computerNormalizeQuery(getQuery(event) as Record<string, unknown>)

  // Vista previa en dev: el JSON del dry-run del job, por el mismo filtro, el mismo orden y las
  // mismas facetas. No conecta a Mongo (el .env local apunta a producción).
  if (import.meta.dev && process.env.COMPUTADORAS_PREVIEW_FILE) {
    try {
      const file = await readComputerPreview()
      setResponseHeader(event, 'cache-control', 'no-store')
      if (file)
        return computerListInMemory(file.items, file.meta, query, computerPreviewToday(file))
    } catch {
      setResponseHeader(event, 'cache-control', 'no-store')
      return computerEmptyList(query, 'unavailable')
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
    const match = computerMatch(query, today, freshDays)

    const facetRows = (spec: (typeof COMPUTER_FACET_SPECS)[number]) =>
      ComputerCatalogModel.aggregate<ComputerFacetRow>(
        computerFacetPipeline(
          computerMatch(spec.relax(query), today, freshDays),
          spec.field,
          spec.limit,
          spec.labelField
        ) as never[]
      ).option({ maxTimeMS: 10_000 })

    const [total, items, facetResults, ramCounts] = await Promise.all([
      ComputerCatalogModel.countDocuments(match).maxTimeMS(10_000),
      ComputerCatalogModel.find(match)
        .select(COMPUTER_ROW_PROJECTION)
        .sort(computerSortSpec(query.orden))
        .skip((query.pagina - 1) * COMPUTERS_PER_PAGE)
        .limit(COMPUTERS_PER_PAGE)
        .maxTimeMS(10_000)
        .lean(),
      // Cada faceta se guarda por su NOMBRE, no por su posición: motos sacó a producción dos facetas
      // cruzadas (23/11/2026) por agregar una en otro lugar de un `Promise.all` desestructurado.
      Promise.all(COMPUTER_FACET_SPECS.map(async spec => ({ spec, rows: await facetRows(spec) }))),
      // Los tres escalones de RAM, cada uno con el resto de los filtros puestos: el panel dice
      // cuántas hay en cada uno antes de elegirlo.
      Promise.all(
        COMPUTER_RAM_STEPS.map(step =>
          ComputerCatalogModel.countDocuments(
            computerMatch({ ...query, ramMin: step }, today, freshDays)
          ).maxTimeMS(10_000)
        )
      ),
    ])

    const facets: ComputerFacets = { ...COMPUTER_EMPTY_FACETS }
    for (const { spec, rows } of facetResults)
      facets[spec.name] = computerLabelFacet(spec.name, rows)
    facets.rams = computerRamFacet(ramCounts)

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
      perPage: COMPUTERS_PER_PAGE,
      items: (items ?? []) as unknown as ComputerPublicListing[],
      facets,
      coverage,
    }
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return computerEmptyList(query, 'unavailable')
  }
})
