// nuxt-gtag runs in manual mode (`enabled: false` in nuxt.config) so that the
// chrome-free routes can stay genuinely third-party-free. Everywhere else GA
// starts here, with the same Consent Mode v2 defaults it always had — they
// travel in the module's `initCommands` and are applied by `initialize()`.
//
// Why this exists: gating the Clarity plugin was not enough. gtag is
// loaded by the module itself, so /pizarra (which promises no third-party
// request) and /widget (an iframe inside somebody else's page) were both still
// pulling googletagmanager.com. Caught by the /pizarra e2e network assertion.
import { hasAnalyticsUnsafeQuery } from '~/utils/analyticsUrl'
import { isBareRoute } from '~/utils/bareRoutes'

/** How long GA waits for a sign-in hand-off to leave the address bar before skipping the view. */
const UNSAFE_URL_WAIT_MS = 60_000

export default defineNuxtPlugin(nuxtApp => {
  if (!import.meta.client) return

  const { initialize } = useGtag()
  let started = false
  let waiting: ReturnType<typeof setInterval> | null = null

  const startUnlessBare = (path: string) => {
    if (started || isBareRoute(path)) return
    // A sign-in hand-off (Discord's Firebase custom token, an emailed link's one-time code) or an
    // old rental link's reference point is still in the address bar, and the first page_view
    // would send it to Google (utils/analyticsUrl.ts). The code that uses each one removes it;
    // GA starts once it has. If it is still there after a minute, this view goes unmeasured and
    // the next navigation starts GA.
    if (hasAnalyticsUnsafeQuery(window.location.search, window.location.pathname)) {
      if (waiting) return
      const since = Date.now()
      waiting = setInterval(() => {
        const unsafe = hasAnalyticsUnsafeQuery(window.location.search, window.location.pathname)
        if (unsafe && Date.now() - since < UNSAFE_URL_WAIT_MS) return
        clearInterval(waiting!)
        waiting = null
        if (!unsafe) startUnlessBare(window.location.pathname)
      }, 250)
      return
    }
    started = true
    initialize()
  }

  startUnlessBare(window.location.pathname)

  // A visitor can land on /pizarra and then navigate into the site; GA should
  // start at that point rather than stay off for the rest of the session.
  const router = useRouter()
  router.afterEach(to => startUnlessBare(to.path))

  // Nothing to tear down: once started, gtag lives for the session. Leaving the
  // site through a bare route does not need to unload it.
  void nuxtApp
})
