// Manual trigger for the BCU advertencias scrape — the same work the weekly `bcu:warnings` task
// does. Needed to seed the list on deploy without waiting for Monday, and to re-check on demand
// when a new advertencia is reported.
//
// Gated by the same shared secret as the Reddit refresh, read from runtimeConfig (NOT
// process.env: pm2's runtime env is empty here, so a process.env gate would read undefined in
// production and leave an endpoint that hits the BCU on every request wide open).
import { refreshBcuWarnings } from '../../utils/bcuWarningsStore'

export default defineEventHandler(async event => {
  const required = useRuntimeConfig().redditRefreshToken as string | undefined
  if (required) {
    const provided = getHeader(event, 'x-reddit-token') || String(getQuery(event).token || '')
    if (provided !== required) {
      throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
    }
  }
  const result = await refreshBcuWarnings()
  return { ok: result.ok, ...result }
})
