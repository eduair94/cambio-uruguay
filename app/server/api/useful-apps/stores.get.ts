// What the weekly job `currency-useful-apps` read from the Google Play and App Store listings of
// the apps in /apps-utiles-uruguay: icon, rating, last version, availability in Uruguay.
//
// Public and unauthenticated: every field comes from a public store listing. Compacted to what
// the page shows (usefulAppsCompactStores), so the SSR payload carries no descriptions and no
// developer-change audit. A missing document returns null and the page renders without icons and
// ratings — a 500 would turn "the job has not run yet" into a broken page.
import { UsefulAppsSnapshotModel } from '../../models/UsefulAppsSnapshot'
import { connectDb } from '../../utils/db'
import { usefulAppsCompactStores, usefulAppsIsoDay } from '../../../utils/usefulAppsStores'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    const doc = await UsefulAppsSnapshotModel.findOne({ key: 'uy' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, developerChanges: 0, counts: 0 })
      .lean()
    // El día de hoy en Uruguay, no el del reloj UTC del servidor.
    const now = new Date()
    return usefulAppsCompactStores(doc, usefulAppsIsoDay(now) ?? now.toISOString().slice(0, 10))
  } catch {
    return null
  }
})
