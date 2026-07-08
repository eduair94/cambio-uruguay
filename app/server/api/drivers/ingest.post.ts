// Manual / cron trigger for the daily driver ingest + news archive (the same work
// as the `drivers:daily` scheduled task). Idempotent — `ingestDrivers` upserts and
// `archiveTodayNews` is keyed per (date,currency), so repeated calls are safe.
// Optionally gated by a shared token when NUXT_DRIVERS_INGEST_TOKEN is set
// (mirrors /api/blog/generate). Busts the analysis/drivers route cache so freshly
// ingested data is visible immediately instead of after the cached-handler TTL.
import { ingestDrivers } from '../../utils/drivers/ingest'
import { archiveTodayNews } from '../../utils/priceNews'

export default defineEventHandler(async event => {
  // Raw process.env reads empty at pm2 runtime here — this app's secrets are
  // baked from .env at BUILD time via useRuntimeConfig (see nuxt.config.ts).
  const required = useRuntimeConfig().driversIngestToken
  if (required) {
    const provided = getHeader(event, 'x-ingest-token') || String(getQuery(event).token || '')
    if (provided !== required) {
      throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
    }
  }

  const drivers = await ingestDrivers(['USD'])
  const news = await archiveTodayNews('USD')

  // Best-effort cache invalidation: the /api/analysis/:currency and /api/drivers
  // routes are defineCachedEventHandler, so without this they keep serving the
  // pre-ingest (empty) payload until their maxAge expires.
  try {
    const cache = useStorage('cache')
    const keys = await cache.getKeys()
    await Promise.all(
      keys
        .filter(k => k.includes('analysis') || k.includes('drivers'))
        .map(k => cache.removeItem(k))
    )
  } catch {
    // Non-fatal: the fresh data still surfaces once the normal cache TTL elapses.
  }

  return { ok: true, drivers, news }
})
