import { EquiparItemModel } from '../models/EquiparItem'
import { EquiparListingModel } from '../models/EquiparListing'
import { EquiparMetaModel } from '../models/EquiparMeta'
import { connectDb } from '../utils/db'
import { equiparProductosCutoff } from '../utils/equiparProductos'
import type { EquiparBand } from '../../utils/equipar'
import {
  sommierBuildResponse,
  sommierEmptyResponse,
  type SommierListingRow,
  type SommierResponse,
} from '../../utils/sommierBudget'

/**
 * `/cuanto-gastar-en-un-sommier-uruguay`: las bandas del sommier y del colchón por medida, y lo que
 * dicen los títulos de los avisos de sommier de los últimos 4 días.
 *
 * Lee dos colecciones que ya existían (las escribe `sync_equipar.ts`) y devuelve SÓLO agregados:
 * ningún título, vendedor ni enlace cruza la red. Los avisos ya están a la vista en
 * `/equipar-casa-uruguay/productos/sommier`; acá se cuentan, no se listan.
 */

/** Más que los avisos de sommier nuevos que caben en una ventana de 4 días; es un techo, no un muestreo. */
const LISTINGS_MAX = 5000

export default defineEventHandler(async (event): Promise<SommierResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    const cutoff = equiparProductosCutoff()

    const [meta, items, listings] = await Promise.all([
      EquiparMetaModel.findOne({ key: 'equipar-casa-uruguay' }).select({ generatedAt: 1 }).lean(),
      EquiparItemModel.find({
        category: { $in: ['sommier', 'colchon'] },
        lastSeen: { $gte: cutoff },
      })
        .select({ _id: 0, category: 1, variant: 1, newBand: 1 })
        .lean(),
      // Sólo nuevo: el usado no se recomienda (trae colchón) y nunca se mezcla con el nuevo. Los
      // sospechosos (bajo p10/2 de su propia banda) tampoco, igual que en el directorio.
      EquiparListingModel.find({
        category: 'sommier',
        condition: 'new',
        suspect: false,
        lastSeen: { $gte: cutoff },
      })
        .select({ _id: 0, variant: 1, title: 1, price: 1, priceUyu: 1, listPrice: 1 })
        .limit(LISTINGS_MAX)
        .lean(),
    ])

    const sommierBands: Record<string, EquiparBand | null> = {}
    const colchonBands: Record<string, EquiparBand | null> = {}
    for (const item of (items ?? []) as Array<{
      category: string
      variant: string
      newBand: EquiparBand | null
    }>) {
      const target = item.category === 'sommier' ? sommierBands : colchonBands
      target[item.variant] = item.newBand ?? null
    }

    const rowsByVariant: Record<string, SommierListingRow[]> = {}
    for (const row of (listings ?? []) as Array<SommierListingRow & { variant: string }>) {
      const list = rowsByVariant[row.variant] ?? []
      list.push({
        title: String(row.title ?? ''),
        price: Number(row.price),
        priceUyu: Number(row.priceUyu),
        listPrice: typeof row.listPrice === 'number' ? row.listPrice : null,
      })
      rowsByVariant[row.variant] = list
    }

    return sommierBuildResponse({
      generatedAt: (meta as { generatedAt?: string } | null)?.generatedAt ?? null,
      sommierBands,
      colchonBands,
      rowsByVariant,
    })
  } catch {
    // Una caída de la base dibuja el estado vacío de la página, nunca un 500.
    return sommierEmptyResponse()
  }
})
