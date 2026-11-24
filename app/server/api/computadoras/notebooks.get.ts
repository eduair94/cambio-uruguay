import { ComputerMetaModel } from '../../models/ComputerMeta'
import { connectDb } from '../../utils/db'
import { readComputerPreview } from '../../utils/computadorasPreview'
import {
  COMPUTER_NOTEBOOK_REPORT_ID,
  type ComputerNotebookReportResponse,
} from '../../../utils/computadoras'
import type { ComputerPublicNotebookReport } from '../../../utils/computadorasPublic'

/**
 * El informe de `/precios-notebooks-usadas-uruguay`: un documento que arma el job
 * (`computermetas`, `key: "uy-computadoras-notebooks"`), con cada mediana ya cortada por su muestra
 * mínima. Esta ruta no calcula nada: leer el catálogo entero en cada pedido para agrupar mil
 * notebooks es justo lo que el análisis periódico existe para evitar.
 *
 * Sin documento, `preparing` (el job todavía no lo escribió); con la base caída, `unavailable` y
 * `no-store`, para que el borde no siga sirviendo un informe vacío cuando la base vuelve.
 */
export default defineEventHandler(async (event): Promise<ComputerNotebookReportResponse> => {
  if (import.meta.dev && process.env.COMPUTADORAS_PREVIEW_FILE) {
    setResponseHeader(event, 'cache-control', 'no-store')
    const file = await readComputerPreview().catch(() => null)
    if (!file) return { status: 'unavailable', generatedAt: '', report: null }
    const report = file.notebookReport
    return {
      status: report ? 'ok' : 'preparing',
      generatedAt: report?.generatedAt ?? '',
      report,
    }
  }

  try {
    await connectDb()
    const doc = (await ComputerMetaModel.findOne({ key: COMPUTER_NOTEBOOK_REPORT_ID })
      .select({ _id: 0, key: 1, generatedAt: 1, meta: 1 })
      .maxTimeMS(5_000)
      .lean()) as unknown as {
      generatedAt?: string
      meta?: ComputerPublicNotebookReport
    } | null
    const report = doc?.meta ?? null
    setResponseHeader(
      event,
      'cache-control',
      'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
    )
    return {
      status: report ? 'ok' : 'preparing',
      generatedAt: report?.generatedAt ?? doc?.generatedAt ?? '',
      report,
    }
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return { status: 'unavailable', generatedAt: '', report: null }
  }
})
