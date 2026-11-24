import { ComputerCatalogModel } from '../../../models/ComputerCatalog'
import { ComputerMetaModel } from '../../../models/ComputerMeta'
import { ComputerPartModel } from '../../../models/ComputerPart'
import { connectDb } from '../../../utils/db'
import { readComputerPreview, computerPreviewToday } from '../../../utils/computadorasPreview'
import {
  COMPUTER_FRESH_DAYS_FALLBACK,
  COMPUTER_META_ID,
  COMPUTER_PART_PROJECTION,
  COMPUTER_ROW_PROJECTION,
  computerAvisoPartSlugs,
  computerAvisoSlugValid,
  computerCoverageOf,
  computerFilterMatches,
  computerFreshFloor,
  computerPickSimilar,
  computerSimilarFilter,
  type ComputerAvisoResponse,
} from '../../../../utils/computadoras'
import type {
  ComputerPublicListing,
  ComputerPublicMetaDoc,
  ComputerPublicPart,
} from '../../../../utils/computadorasPublic'

/**
 * La ficha de UN aviso para `/computadoras-usadas-uruguay/aviso/<slug>`.
 *
 * Los mismos tres códigos que la ficha de motos y la de autos: un slug con forma imposible 404ea
 * antes de tocar la base; un fallo de base es 503 con `no-store` (un 404 cacheado sacaría la ficha
 * de los navegadores); y sólo un slug bien formado que no está en el catálogo es un 404 de verdad.
 *
 * Las filas de las piezas y las parecidas son opcionales: una lectura lenta de cualquiera de las
 * dos nunca esconde el aviso. Sin las piezas, el desglose igual se dibuja con lo que trae la
 * valuación del propio aviso (precio nuevo y usado de cada una); lo que se pierde es la oferta más
 * barata enlazada.
 */
export default defineEventHandler(async (event): Promise<ComputerAvisoResponse> => {
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!computerAvisoSlugValid(slug))
    throw createError({ statusCode: 404, statusMessage: 'Aviso no encontrado' })

  if (import.meta.dev && process.env.COMPUTADORAS_PREVIEW_FILE) {
    const file = await readComputerPreview().catch(() => null)
    setResponseHeader(event, 'cache-control', 'no-store')
    const computer = file?.items.find(item => item.slug === slug) ?? null
    if (!file || !computer)
      throw createError({ statusCode: 404, statusMessage: 'Aviso no encontrado' })
    const coverage = computerCoverageOf(file.meta)
    const floor = computerFreshFloor(
      computerPreviewToday(file),
      coverage?.freshDays ?? COMPUTER_FRESH_DAYS_FALLBACK
    )
    const wanted = new Set(computerAvisoPartSlugs(computer))
    const filter = computerSimilarFilter(computer, floor)
    return {
      computer,
      parts: file.parts.filter(part => wanted.has(part.slug)),
      similar: computerPickSimilar(
        computer,
        file.items.filter(item => computerFilterMatches(filter, item))
      ),
      generatedAt: coverage?.generatedAt ?? '',
      usdUyu: coverage?.usdUyu ?? 0,
    }
  }

  let computer: ComputerPublicListing | null
  let freshDays: number
  let generatedAt: string
  let usdUyu: number
  try {
    await connectDb()
    const [row, metaDoc] = await Promise.all([
      ComputerCatalogModel.findOne({ slug })
        .select(COMPUTER_ROW_PROJECTION)
        .maxTimeMS(5_000)
        .lean(),
      ComputerMetaModel.findOne({ key: COMPUTER_META_ID })
        .select({ _id: 0, key: 1, generatedAt: 1, meta: 1 })
        .maxTimeMS(5_000)
        .lean(),
    ])
    computer = (row as unknown as ComputerPublicListing | null) ?? null
    const coverage = computerCoverageOf(
      (metaDoc as unknown as ComputerPublicMetaDoc | null)?.meta ?? null
    )
    freshDays = coverage?.freshDays ?? COMPUTER_FRESH_DAYS_FALLBACK
    generatedAt = coverage?.generatedAt ?? ''
    usdUyu = coverage?.usdUyu ?? 0
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Aviso no disponible por ahora',
      cause: error,
    })
  }
  if (!computer) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Aviso no encontrado' })
  }

  const subject = computer
  const floor = computerFreshFloor(new Date().toISOString().slice(0, 10), freshDays)
  const partSlugs = computerAvisoPartSlugs(subject)
  const [partRows, similarRows] = await Promise.all([
    partSlugs.length
      ? ComputerPartModel.find({ slug: { $in: partSlugs } })
          .select(COMPUTER_PART_PROJECTION)
          .maxTimeMS(3_000)
          .lean()
          .catch(() => [])
      : Promise.resolve([]),
    ComputerCatalogModel.find(computerSimilarFilter(subject, floor))
      .select(COMPUTER_ROW_PROJECTION)
      .limit(40)
      .maxTimeMS(3_000)
      .lean()
      .catch(() => []),
  ])

  setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
  return {
    computer: subject,
    parts: (partRows ?? []) as unknown as ComputerPublicPart[],
    similar: computerPickSimilar(
      subject,
      (similarRows ?? []) as unknown as ComputerPublicListing[]
    ),
    generatedAt,
    usdUyu,
  }
})
