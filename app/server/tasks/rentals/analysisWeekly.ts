import { rebuildRentalAnalysisSnapshot } from '../../utils/rentalAnalysis'

// The only scheduled reader of the whole rental catalogue for /analisis-alquileres-uruguay (and the
// price estimator that shares its snapshot). Both cluster workers fire it: the disk lock lets one
// build, and the other returns `busy` or `fresh`. See server/utils/rentalAnalysisCache.ts.
export default defineTask({
  meta: {
    name: 'rentals:analysis-weekly',
    description: 'Rebuild the weekly rental analysis snapshot from the whole catalogue',
  },
  async run() {
    const result = await rebuildRentalAnalysisSnapshot()
    console.info('[rental-analysis] weekly rebuild', result)
    return { result }
  },
})
