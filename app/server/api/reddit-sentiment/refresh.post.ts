// Manual / cron trigger for the Reddit sentiment refresh — the same work the daily
// `reddit:sentiment` task does. Useful for the first backfill after deploy:
//
//   curl -X POST 'https://cambio-uruguay.com/api/reddit-sentiment/refresh?window=all' \
//        -H 'x-reddit-token: …'
//
// Idempotent by construction: MongoDB dedupes threads on `redditId`, so a repeated call
// re-scores the corpus without re-downloading it.
//
// Gated by a shared token. The token comes from runtimeConfig, NOT process.env: under pm2 the
// runtime environment is empty (secrets are baked at build), so a process.env gate would read
// undefined in production and silently leave this endpoint — which spends Reddit calls and AI
// tokens on every hit — wide open.
//
// It must do EVERYTHING the task does, or it stops being a faithful trigger: it silently skipped
// the scam radar once, and the radar shipped empty.
import { refreshRedditSentiment } from '../../utils/redditSentimentStore'
import { refreshScamRadar } from '../../utils/scamRadarStore'

export default defineEventHandler(async event => {
  const required = useRuntimeConfig().redditRefreshToken as string | undefined
  if (required) {
    const provided = getHeader(event, 'x-reddit-token') || String(getQuery(event).token || '')
    if (provided !== required) {
      throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
    }
  }

  const q = getQuery(event)
  // `budget` = how many threads to download comments for in this run (0 = no limit, for a
  // one-off backfill; the daily task keeps the small default so it always finishes quickly).
  const budget = q.budget !== undefined ? Math.max(0, Number(q.budget) || 0) : undefined

  const result = await refreshRedditSentiment({
    window: q.window === 'all' ? 'all' : 'year',
    withSummaries: q.summaries !== 'false',
    budget,
  })
  // Same corpus, second read — exactly what the task does.
  const radar = await refreshScamRadar()
  return { ok: true, ...result, radar }
})
