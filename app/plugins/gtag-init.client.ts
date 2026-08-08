// nuxt-gtag runs in manual mode (`enabled: false` in nuxt.config) so that the
// chrome-free routes can stay genuinely third-party-free. Everywhere else GA
// starts here, with the same Consent Mode v2 defaults it always had — they
// travel in the module's `initCommands` and are applied by `initialize()`.
//
// Why this exists: gating the tawk and clarity plugins was not enough. gtag is
// loaded by the module itself, so /pizarra (which promises no third-party
// request) and /widget (an iframe inside somebody else's page) were both still
// pulling googletagmanager.com. Caught by the /pizarra e2e network assertion.
import { isBareRoute } from '~/utils/bareRoutes'

export default defineNuxtPlugin(nuxtApp => {
  if (!import.meta.client) return

  const { initialize } = useGtag()
  let started = false

  const startUnlessBare = (path: string) => {
    if (started || isBareRoute(path)) return
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
