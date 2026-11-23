import { MotoMarketSnapshotModel } from '../../models/MotoMarketSnapshot'
import { connectDb } from '../../utils/db'
import { MOTO_REPORT_ID, motoMarketSummaryOf, type MotoMarketSummary } from '../../../utils/motos'

/**
 * El mercado en números del directorio de motos: el recorte del informe que `sync_motos.ts` guarda
 * bajo la `key` reservada `_informe`. La página lo pide en paralelo con el listado y con un tope
 * corto; un fallo devuelve `null` con `no-store` y el bloque simplemente no se dibuja.
 */
export default defineEventHandler(async (event): Promise<MotoMarketSummary | null> => {
  try {
    await connectDb()
    const doc = (await MotoMarketSnapshotModel.findOne({ key: MOTO_REPORT_ID })
      .select({ _id: 0, snapshot: 1 })
      .lean()
      .maxTimeMS(5_000)) as { snapshot?: { report?: unknown } } | null
    const summary = motoMarketSummaryOf(doc?.snapshot?.report ?? null)
    setResponseHeader(
      event,
      'cache-control',
      summary ? 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400' : 'no-store'
    )
    return summary
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return null
  }
})
