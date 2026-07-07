// Correlation + notable moves + today's news for a currency (default USD).
import { buildAnalysis } from '../../utils/analysis'

const SUPPORTED = new Set(['USD']) // Phase 3 adds EUR, ARS

export default defineCachedEventHandler(
  async event => {
    const raw = getRouterParam(event, 'currency') ?? 'USD'
    const currency = raw.toUpperCase()
    if (!SUPPORTED.has(currency)) {
      throw createError({ statusCode: 404, statusMessage: `Unsupported currency: ${currency}` })
    }
    return buildAnalysis(currency)
  },
  {
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 6,
    name: 'analysis',
    getKey: event => (getRouterParam(event, 'currency') ?? 'USD').toUpperCase(),
  }
)
