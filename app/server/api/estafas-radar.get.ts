// The scam radar for /estafas-uruguay: what people are reporting on Reddit right now, grouped by
// modus operandi. Built by the daily `reddit:sentiment` task from the corpus we already harvest.
//
// Not a cached event handler — pm2 runs a 2-instance cluster and Nitro's cache is per-process, so
// the workers would serve divergent radars after a refresh (we shipped exactly that bug once).
import { getScamRadar } from '../utils/scamRadarStore'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400'
  )
  try {
    return await getScamRadar()
  } catch {
    return { patterns: [], asOf: null, empty: true, disclaimer: '' }
  }
})
