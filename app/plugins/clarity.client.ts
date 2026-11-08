// Microsoft Clarity: heatmaps, session recordings and frustration signals (rage and dead clicks),
// the "what people do" half that GA4's counts cannot show. Inert until the owner creates the
// project and builds with NUXT_PUBLIC_CLARITY_ID (runtimeConfig.public.clarityId): with the id
// empty this plugin returns before registering anything, so no request reaches *.clarity.ms and
// `window.clarity` stays undefined.
//
// What it decides, in order (the rules are pure, in utils/clarityPolicy.ts; the calls to Clarity
// live in services/clarity.ts):
//   1. WHEN. After hydration and an idle moment (onNuxtReady → requestIdleCallback), and only with
//      the tab visible: ~25 KB of script and a full DOM serialisation never compete with the
//      first paint, hydration or the first interaction. Nothing in the server HTML, no hydration
//      change: it is a script, so the Auto Ads rule about lazy hydration is untouched.
//   2. WHETHER. "Rechazar", Global Privacy Control, a robot or a data-saving browser: never.
//      "Aceptar": yes. No choice yet: the country (GET /api/consent-region, from Cloudflare's
//      header) decides — the EEA, the UK, Switzerland or an unknown country wait for "Aceptar";
//      the rest records by default, the regime GA4 and AdSense already follow.
//   3. WHERE. Never on the private routes nor with a token or the reference address in the URL;
//      a share of browsers per page family; and a cap on filter changes in the big directories.
//
// Clarity restarts on every URL change by itself (it stops, waits 250 ms and serialises the DOM
// again). This plugin takes that over: it stops Clarity BEFORE every navigation — before the
// router's pushState and, for back/forward, in a capture-phase popstate listener that runs ahead
// of Clarity's own — and starts it again once the new page has rendered, if the new page may be
// recorded. Left to itself, Clarity would restart for 250 ms on a page this site excludes.
import { CONSENT_COOKIE_NAME, parseConsent, type ConsentDecision } from '~/utils/consent'
import { adDensityForPath, adsFlagOn } from '~/utils/ads'
import { isAutomatedBrowser, sentryPageName } from '~/utils/sentryPrivacy'
import {
  type ClarityQuery,
  clarityFamily,
  clarityKeepRecording,
  clarityLocale,
  clarityQueryRestarts,
  clarityRouteAllowed,
  claritySampled,
  clarityStartDecision,
  parseClaritySeed,
  strictRegionFromTimeZone,
} from '~/utils/clarityPolicy'
import * as clarity from '~/services/clarity'

/** Per tab: the country does not change between two pages of one visit. */
const REGION_KEY = 'cu-consent-region'
/** Per browser: which half of the browsers records outside the rental pages. */
const SEED_KEY = 'cu-clarity-seed'

type NavigatorSignals = Navigator & {
  globalPrivacyControl?: boolean
  connection?: { saveData?: boolean }
}

function readCookie(name: string): string | null {
  for (const part of document.cookie.split(';')) {
    const [key, ...value] = part.split('=')
    if (key?.trim() === name) {
      try {
        return decodeURIComponent(value.join('=').trim())
      } catch {
        return null
      }
    }
  }
  return null
}

function samplingSeed(): number {
  try {
    const stored = parseClaritySeed(localStorage.getItem(SEED_KEY))
    if (stored !== null) return stored
    const fresh = crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32
    localStorage.setItem(SEED_KEY, String(fresh))
    return fresh
  } catch {
    // Blocked storage: decided for this page view only.
    return Math.random()
  }
}

async function strictRegion(): Promise<boolean | null> {
  try {
    const cached = sessionStorage.getItem(REGION_KEY)
    if (cached === '1' || cached === '0') return cached === '1'
  } catch {
    /* No storage: ask the server. */
  }
  try {
    const response = await fetch('/api/consent-region', {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = (await response.json()) as { strict?: unknown }
    // Anything but an explicit `false` waits for "Aceptar".
    const strict = body?.strict !== false
    try {
      sessionStorage.setItem(REGION_KEY, strict ? '1' : '0')
    } catch {
      /* Asked again on the next page. */
    }
    return strict
  } catch {
    try {
      return strictRegionFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      return null
    }
  }
}

const hrefWithoutHash = () => location.href.split('#')[0] ?? ''

export default defineNuxtPlugin(nuxtApp => {
  if (!import.meta.client) return
  const config = useRuntimeConfig().public
  const projectId = String(config.clarityId || '').trim()
  if (!projectId) return

  const router = useRouter()
  const toolsAds = adsFlagOn(config.adsTools)
  const signals = navigator as NavigatorSignals
  const env = {
    gpc: signals.globalPrivacyControl === true,
    automated: isAutomatedBrowser(navigator),
    saveData: signals.connection?.saveData === true,
  }
  let cookie: ConsentDecision | null = parseConsent(readCookie(CONSENT_COOKIE_NAME))
  let seed: number | null = null
  let region: Promise<boolean | null> | null = null
  let ready = false
  let queryChanges = 0
  let restartPending = false
  let generation = 0
  let lastHref = hrefWithoutHash()

  // A stored "Rechazar" also clears what an earlier recorded visit left behind.
  if (cookie === 'denied' && /(?:^|;\s*)_cl(?:ck|sk)=/.test(document.cookie)) clarity.forget()

  function sendTags(path: string, name: unknown) {
    clarity.set('template', sentryPageName(name) ?? 'otra')
    clarity.set('family', clarityFamily(path))
    clarity.set('locale', clarityLocale(path))
    clarity.set('ads', adDensityForPath(path, { toolsAds }))
    clarity.set('consent', cookie === 'granted' ? 'explicita' : 'por-defecto')
  }

  /**
   * Whether a page may be recorded: the route, this browser's sample and the filter cap. The
   * sampling seed is only created for a page that passes the route check.
   */
  function recordable(path: string, query: ClarityQuery) {
    return (
      clarityRouteAllowed(path, query) &&
      claritySampled(clarityFamily(path), (seed ??= samplingSeed())) &&
      clarityKeepRecording({ path, queryChanges })
    )
  }

  /** Brings Clarity in line with the current page and consent: start, keep or stop. */
  async function reconcile() {
    if (!ready) return
    const run = ++generation
    const route = router.currentRoute.value
    // As if outside the strict regions: only an undecided visitor needs the country to know more.
    let decision = clarityStartDecision({ cookie, strictRegion: false, ...env })
    if (decision !== 'load' || !recordable(route.path, route.query)) {
      clarity.stop()
      return
    }
    if (cookie === null) {
      region ??= strictRegion()
      const strict = await region
      // A navigation or a consent change happened meanwhile: the newer call decides.
      if (run !== generation) return
      decision = clarityStartDecision({ cookie, strictRegion: strict, ...env })
      if (decision !== 'load') {
        clarity.stop()
        return
      }
    }
    const fresh = clarity.isLoaded() ? clarity.start() : clarity.load(projectId)
    if (fresh) sendTags(route.path, route.name)
  }

  /** A URL change is about to happen: Clarity must not see it while recording. */
  function beforeNavigation(path: string, query: ClarityQuery) {
    generation++
    restartPending = true
    // Still loading, clarity.js has recorded nothing yet: let it finish on a page it may record.
    // Stopping now would abort the load for the rest of the page view.
    if (clarity.isPending() && recordable(path, query)) return
    clarity.stop()
  }

  router.beforeEach((to, from) => {
    queryChanges = clarityQueryRestarts(queryChanges, from, to)
    if (to.fullPath.split('#')[0] !== from.fullPath.split('#')[0])
      beforeNavigation(to.path, to.query)
  })
  // Back and forward change the URL before any router guard runs, and Clarity's own popstate
  // listener would restart it there. Capture phase, registered first: this one runs before it.
  window.addEventListener(
    'popstate',
    () => {
      if (hrefWithoutHash() !== lastHref) beforeNavigation(location.pathname, location.search)
    },
    { capture: true }
  )
  // Every navigation ends here, rendered or failed (Nuxt calls it on both): the new page's DOM is
  // in place, so Clarity's first serialisation is of the page it will record.
  nuxtApp.hook('page:loading:end', () => {
    lastHref = hrefWithoutHash()
    if (!restartPending) return
    restartPending = false
    void reconcile()
  })

  // useConsent dispatches this BEFORE telling gtag: Clarity listens to Consent Mode too, and a
  // 'denied' reaching it while it records restarts it cookieless with one more upload.
  window.addEventListener('cu:consent', event => {
    const decision = parseConsent((event as CustomEvent<unknown>).detail)
    if (!decision) return
    cookie = decision
    if (decision === 'denied') {
      generation++
      clarity.stop()
      clarity.forget()
      return
    }
    void reconcile()
  })

  // The site's call-to-action clicks (`data-cta`), as Clarity events, so a recording can be
  // filtered by the action taken. The same attribute GA4 reads (plugins/track-clicks.client.ts).
  document.addEventListener(
    'click',
    event => {
      const element = event.target instanceof Element ? event.target : null
      const value = element?.closest<HTMLElement>('[data-cta]')?.dataset.cta
      if (value && /^[\w-]{1,80}$/.test(value)) clarity.event(`cta_${value}`)
    },
    { capture: true, passive: true }
  )

  onNuxtReady(() => {
    const boot = () =>
      requestIdleCallback(
        () => {
          ready = true
          lastHref = hrefWithoutHash()
          void reconcile()
        },
        { timeout: 8000 }
      )
    if (document.visibilityState === 'visible') {
      boot()
      return
    }
    // A tab opened in the background loads nothing until someone looks at it.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', onVisible)
      boot()
    }
    document.addEventListener('visibilitychange', onVisible)
  })
})
