// GET /api/bankos/analysis — per-issuer discount statistics for
// /que-banco-tiene-mas-descuentos-uruguay. Reuses the same cached catalog (live-first, snapshot
// fallback) as /api/bankos/discounts; the maths lives in utils/bankosAnalysis so it can be tested.
import { getRawCatalog } from '../../utils/bankos'
import {
  analyzeBankos,
  type AnalysisRawData,
  type BankosAnalysis,
} from '../../../utils/bankosAnalysis'

export default defineEventHandler(
  async (event): Promise<BankosAnalysis & { source: string; generatedAt: string | null }> => {
    const { catalog, source } = await getRawCatalog()
    const analysis = analyzeBankos(catalog.data as unknown as AnalysisRawData)
    // The catalog moves about once a day; this is a pure reduction of it.
    setResponseHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=3600')
    return { ...analysis, source, generatedAt: catalog.generatedAt }
  }
)
