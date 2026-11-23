// Decides, once per page load, whether this viewer gets ads (utils/adFree.ts → decideFromHint).
//
// The point is to cost nothing to the visitors who never donated: without a saved Firebase session
// the answer is `ads` the moment the app is ready, exactly when the AdSense loader used to go in.
// Only a browser with a session waits for the server (capped), and a donor's hint answers at once.
// Ads already placed cannot be taken out (hiding them breaks AdSense's policy), so a visitor who
// signs in mid-visit and turns out to be a donor gets one reload, and only if the loader ran.
import { decideFromHint, isAdFreeActive } from '~/utils/adFree'
import { readAdFreeHint, useAdFree, writeAdFreeHint } from '~/composables/useAdFree'
import { hasStoredFirebaseSession } from '~/services/firebaseLazy'

const WAIT_FOR_SERVER_MS = 4000

function adsenseAlreadyLoaded(): boolean {
  return Boolean(document.querySelector('script[src*="adsbygoogle.js"]'))
}

/**
 * The ads already on the page cannot be taken out, so a viewer found to be a donor after the loader
 * ran gets one reload. Only when the hint was actually stored: the reloaded page then holds the
 * loader at once, and with storage blocked there is no reload at all (it would loop).
 */
function reloadIfDonorAfterAds(active: boolean | undefined) {
  if (!active || !adsenseAlreadyLoaded()) return
  if (!isAdFreeActive(readAdFreeHint()?.until)) return
  window.location.reload()
}

export default defineNuxtPlugin({
  name: 'ad-free',
  dependsOn: ['firebase'],
  setup() {
    const { viewer, refresh } = useAdFree()
    const store = useAuthStore()

    async function settle(plan: ReturnType<typeof decideFromHint>) {
      const hasSession = await hasStoredFirebaseSession()
      if (!hasSession) {
        writeAdFreeHint(null)
        viewer.value = 'ads'
        return
      }
      if (plan.status !== 'wait') {
        // Revalidate in the background: a period that ended, a refund, a donation on another device.
        reloadIfDonorAfterAds((await refresh())?.active)
        return
      }
      const timer = setTimeout(() => {
        if (viewer.value === 'unknown') viewer.value = 'ads'
      }, WAIT_FOR_SERVER_MS)
      try {
        // Past the cap the loader may already be in: same rule as a background revalidation.
        reloadIfDonorAfterAds((await refresh())?.active)
      } finally {
        clearTimeout(timer)
      }
    }

    // Sign-in and sign-out during the visit. Watched only once the first auth state is known, so
    // restoring a saved session on load is not mistaken for signing in.
    function watchSignIn() {
      watch(
        () => store.user?.uid ?? null,
        async (uid, previous) => {
          if (uid === previous) return
          if (!uid) {
            writeAdFreeHint(null)
            viewer.value = 'ads'
            return
          }
          reloadIfDonorAfterAds((await refresh())?.active)
        }
      )
    }

    onNuxtReady(() => {
      const plan = decideFromHint(readAdFreeHint(), new Date())
      if (plan.status !== 'wait') viewer.value = plan.status
      void settle(plan).catch(() => {
        if (viewer.value === 'unknown') viewer.value = 'ads'
      })

      if (store.ready) watchSignIn()
      else {
        const stop = watch(
          () => store.ready,
          ready => {
            if (!ready) return
            stop()
            watchSignIn()
          }
        )
      }
    })
  },
})
