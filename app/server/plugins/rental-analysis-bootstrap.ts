import { ensureRentalAnalysisSnapshot } from '../utils/rentalAnalysis'

// Cold start only: when there is no servable weekly snapshot on disk (first deploy, a bumped
// RENTAL_ANALYSIS_CACHE_VERSION, or two missed weekly runs), build it once, in the background, a few
// seconds after boot and under the same disk lock the weekly task uses. With a snapshot on disk this
// does nothing: requests never trigger a catalogue read. Never in dev, prerender or tests — the local
// .env points at the production database.
export default defineNitroPlugin(() => {
  if (import.meta.dev || import.meta.prerender || process.env.NODE_ENV === 'test') return
  const timer = setTimeout(() => {
    ensureRentalAnalysisSnapshot()
      .then(result => {
        if (result) console.info('[rental-analysis] bootstrap', result)
      })
      .catch(error => console.warn('[rental-analysis] bootstrap failed', error))
  }, 20_000)
  timer.unref?.()
})
