// Manual / cron trigger for the daily price-prediction record (the same work as
// the `predictions:daily` scheduled task), scoped to one currency per call so a
// single bad currency can't block verifying the rest. Idempotent — `recordTodayPrediction`
// upserts on (currency, date). Optionally gated by a shared token when
// NUXT_PREDICTIONS_INGEST_TOKEN is set (mirrors /api/drivers/ingest).
import { recordTodayPrediction } from '../../utils/pricePrediction'

export default defineEventHandler(async event => {
  // Raw process.env reads empty at pm2 runtime here — this app's secrets are
  // baked from .env at BUILD time via useRuntimeConfig (see nuxt.config.ts).
  const required = useRuntimeConfig().predictionsIngestToken
  if (required) {
    const provided = getHeader(event, 'x-ingest-token') || String(getQuery(event).token || '')
    if (provided !== required) {
      throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
    }
  }

  const currency = String(getQuery(event).currency || 'USD').toUpperCase()
  const result = await recordTodayPrediction(currency)

  // Best-effort cache invalidation: /api/predictions/:currency is a
  // defineCachedEventHandler, so without this it keeps serving the pre-ingest
  // (null) payload until its maxAge expires.
  try {
    const cache = useStorage('cache')
    const keys = await cache.getKeys()
    await Promise.all(
      keys
        .filter(k => k.includes('predictions') && k.includes(currency))
        .map(k => cache.removeItem(k))
    )
  } catch {
    // Non-fatal: the fresh data still surfaces once the normal cache TTL elapses.
  }

  return { ok: true, currency, result }
})
