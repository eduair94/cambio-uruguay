import { ComputerMetaModel } from '../../models/ComputerMeta'
import { ComputerPartModel } from '../../models/ComputerPart'
import { connectDb } from '../../utils/db'
import { readComputerPreview } from '../../utils/computadorasPreview'
import {
  COMPUTER_META_ID,
  COMPUTER_PART_PROJECTION,
  computerComponentsFrom,
  computerEmptyComponents,
  type ComputerComponentsResponse,
} from '../../../utils/computadoras'
import type { ComputerPublicMetaDoc, ComputerPublicPart } from '../../../utils/computadorasPublic'

/**
 * Los precios de hoy por componente para `/precios-componentes-pc-uruguay`: la tabla por rol
 * (procesadores, placas de video, RAM…) y las PCs tipo que arma el job con esas mismas medianas.
 *
 * Todo lo que decide qué fila se muestra y en qué orden vive en `computerComponentsFrom`, que es
 * puro y lo usan esta ruta y la vista previa de dev. Una falla de Mongo devuelve la forma vacía con
 * `status: 'unavailable'` y `no-store`: nunca un 404 ni un 500, y nunca un vacío cacheado que el
 * borde siga sirviendo cuando la base vuelve.
 *
 * El historial diario de cada pieza (`history`) no viaja: la página de v1 no lo dibuja, y con
 * cientos de identidades por cuatrocientos días sería la mayor parte de la respuesta.
 */
export default defineEventHandler(async (event): Promise<ComputerComponentsResponse> => {
  if (import.meta.dev && process.env.COMPUTADORAS_PREVIEW_FILE) {
    setResponseHeader(event, 'cache-control', 'no-store')
    const file = await readComputerPreview().catch(() => null)
    if (!file) return computerEmptyComponents('unavailable')
    return computerComponentsFrom(file.parts, file.meta)
  }

  try {
    await connectDb()
    const [metaDoc, parts] = await Promise.all([
      ComputerMetaModel.findOne({ key: COMPUTER_META_ID })
        .select({ _id: 0, key: 1, generatedAt: 1, meta: 1 })
        .maxTimeMS(5_000)
        .lean(),
      ComputerPartModel.find({})
        .select(COMPUTER_PART_PROJECTION)
        .limit(2_000)
        .maxTimeMS(8_000)
        .lean(),
    ])
    setResponseHeader(
      event,
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
    )
    return computerComponentsFrom(
      (parts ?? []) as unknown as ComputerPublicPart[],
      (metaDoc as unknown as ComputerPublicMetaDoc | null)?.meta ?? null
    )
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return computerEmptyComponents('unavailable')
  }
})
