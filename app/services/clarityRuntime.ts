// Microsoft Clarity on the page: whether it may record, where, and keeping it in line with the
// visitor's choice. plugins/clarity.client.ts imports this file on demand, once the project id
// is set, the page has hydrated and an idle moment came with the tab visible: none of it is in
// the entry chunk. Like services/clarity.ts it sits outside Nuxt's auto-imports; what it needs
// from Nuxt (the router, the end of a navigation, the idle callback) comes in as arguments.
//
// What it decides, in order (the rules are pure, in utils/clarityPolicy.ts; the calls to Clarity
// live in services/clarity.ts):
//   1. WHETHER. "Rechazar", Global Privacy Control, a robot or a data-saving browser: never.
//      "Aceptar": yes. No choice yet: the country (GET /api/consent-region, from Cloudflare's
//      header) decides — the EEA, the UK, Switzerland or an unknown country wait for "Aceptar";
//      the rest records by default, the regime GA4 and AdSense already follow.
//   2. WHERE. Never on the private routes nor with a token or the reference address in the URL
//      (nor in a tab opened from such a URL: Clarity sends the referrer as is), and not past the
//      third filter change in the big directories.
//   3. HOW MANY. A share of browsers per page family, from a seed this browser keeps. It is
//      created only once the visitor's choice and country already allow recording.
//
// Clarity restarts on every URL change by itself (it stops, waits 250 ms and serialises the DOM
// again). This file takes that over: it stops Clarity BEFORE every navigation — in a router
// guard, ahead of the router's pushState, and for back/forward in a capture-phase popstate
// listener registered before Clarity's own — and starts it again once the new page has rendered,
// if the new page may be recorded. It also restarts itself on a back/forward-cache restore and
// after pausing on an idle tab; services/clarity.ts parks it so those restarts send nothing, and
// this file stops them as soon as it sees them.
import { CONSENT_COOKIE_NAME, parseConsent, type ConsentDecision } from '../utils/consent'
import { adDensityForPath, adsFlagOn } from '../utils/ads'
import { isAutomatedBrowser, sentryPageName } from '../utils/sentryPrivacy'
import {
  type ClarityQuery,
  clarityFamily,
  clarityKeepRecording,
  clarityLocale,
  clarityQueryRestarts,
  clarityReferrerAllowed,
  clarityRouteAllowed,
  claritySampled,
  clarityStartDecision,
  parseClaritySeed,
  strictRegionFromTimeZone,
} from '../utils/clarityPolicy'
import * as clarity from './clarity'

/** Per tab: the country does not change between two pages of one visit. */
const REGION_KEY = 'cu-consent-region'
/** Per browser: which half of the browsers records outside the rental pages. */
const SEED_KEY = 'cu-clarity-seed'

interface RouteLike {
  path: string
  fullPath: string
  name?: unknown
  query: ClarityQuery
}

export interface ClarityRuntimeOptions {
  projectId: string
  /** runtimeConfig.public.adsTools: the ad density of the tool pages, for the `ads` tag. */
  adsTools: unknown
  router: {
    currentRoute: { value: RouteLike }
    beforeEach: (guard: (to: RouteLike, from: RouteLike) => unknown) => unknown
  }
  /** Nuxt's `page:loading:end`: every navigation ends there, rendered or failed. */
  onNavigationEnd: (callback: () => void) => unknown
  /** Nuxt's requestIdleCallback (a 1 ms timeout where the browser has none, as in Safari). */
  idle: (callback: () => void, options?: { timeout?: number }) => unknown
}

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

const storedDecision = (): ConsentDecision | null => parseConsent(readCookie(CONSENT_COOKIE_NAME))
const hasClarityCookies = () => /(?:^|;\s*)_cl(?:ck|sk)=/.test(document.cookie)
const hrefWithoutHash = () => location.href.split('#')[0] ?? ''
const withoutHash = (fullPath: string) => fullPath.split('#')[0] ?? ''

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

export function startClarityRuntime(options: ClarityRuntimeOptions): void {
  if (typeof window === 'undefined') return
  const { projectId, router, idle } = options
  const toolsAds = adsFlagOn(options.adsTools)
  const signals = navigator as NavigatorSignals
  const env = {
    gpc: signals.globalPrivacyControl === true,
    automated: isAutomatedBrowser(navigator),
    saveData: signals.connection?.saveData === true,
  }
  let cookie = storedDecision()
  // The same for every page of this tab (see clarityReferrerAllowed).
  const referrerAllowed = clarityReferrerAllowed(document.referrer)
  let seed: number | null = null
  let region: Promise<boolean | null> | null = null
  let queryChanges = 0
  let restartPending = false
  let generation = 0
  let lastHref = hrefWithoutHash()
  /** When this tab's own banner last decided (see syncStoredDecision). */
  let decidedHereAt = 0

  // A stored "Rechazar" also clears what an earlier recorded visit left behind.
  if (cookie === 'denied' && hasClarityCookies()) clarity.forget()

  function sendTags(path: string, name: unknown) {
    clarity.set('template', sentryPageName(name) ?? 'otra')
    clarity.set('family', clarityFamily(path))
    clarity.set('locale', clarityLocale(path))
    clarity.set('ads', adDensityForPath(path, { toolsAds }))
    clarity.set('consent', cookie === 'granted' ? 'explicita' : 'por-defecto')
  }

  /** The route rules: the excluded pages, the private query parameters, the filter cap. */
  const routeAllowed = (path: string, query: ClarityQuery) =>
    referrerAllowed &&
    clarityRouteAllowed(path, query) &&
    clarityKeepRecording({ path, queryChanges })

  /** This browser's share for the page's family; the seed is created here, and only here. */
  const sampled = (path: string) => claritySampled(clarityFamily(path), (seed ??= samplingSeed()))

  /** Brings Clarity in line with the current page and consent: start, keep or stop. */
  async function reconcile() {
    const run = ++generation
    const route = router.currentRoute.value
    // As if outside the strict regions: only an undecided visitor needs the country to know more.
    let decision = clarityStartDecision({ cookie, strictRegion: false, ...env })
    if (decision !== 'load' || !routeAllowed(route.path, route.query)) {
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
    if (!sampled(route.path)) {
      clarity.stop()
      return
    }
    const fresh = clarity.isLoaded() ? clarity.start() : clarity.load(projectId)
    if (fresh) sendTags(route.path, route.name)
  }

  /** A URL change is about to happen: Clarity must not see it while it runs. */
  function beforeNavigation(path: string, query: ClarityQuery) {
    generation++
    restartPending = true
    if (clarity.isPending()) {
      // Still loading, clarity.js has recorded nothing yet: let it finish on a page it may
      // record. Stopping now aborts the load for the rest of the page view.
      if (!routeAllowed(path, query) || !sampled(path)) clarity.stop()
      return
    }
    clarity.pause()
  }

  /**
   * The stored choice can change in another tab (useConsent writes one cookie for all of them),
   * and this tab only hears its own banner. Read again when it may have: a navigation, a return
   * to the tab, a page restored from the back/forward cache. Only toward the stricter answer, and
   * not right after a decision taken here: useCookie writes it a tick later, so for a moment the
   * cookie still holds the previous one, which must not undo it.
   */
  function syncStoredDecision(): boolean {
    if (Date.now() - decidedHereAt < 2000) return false
    const stored = storedDecision()
    if (stored === 'denied' && cookie !== 'denied') {
      cookie = 'denied'
      generation++
      clarity.stop()
      clarity.forget()
      return true
    }
    if (stored === 'granted' && cookie === null) {
      cookie = 'granted'
      return true
    }
    return false
  }

  router.beforeEach((to, from) => {
    queryChanges = clarityQueryRestarts(queryChanges, from, to)
    if (withoutHash(to.fullPath) !== withoutHash(from.fullPath)) beforeNavigation(to.path, to.query)
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
  // The new page's DOM is in place, so Clarity's first serialisation is of the page it records.
  options.onNavigationEnd(() => {
    lastHref = hrefWithoutHash()
    const changed = syncStoredDecision()
    if (!restartPending && !changed) return
    restartPending = false
    void reconcile()
  })

  // useConsent dispatches this BEFORE telling gtag, and Clarity listens to Consent Mode too.
  window.addEventListener('cu:consent', event => {
    const detail = (event as CustomEvent<unknown>).detail
    const decision = parseConsent(typeof detail === 'string' ? detail : null)
    if (!decision) return
    cookie = decision
    decidedHereAt = Date.now()
    generation++
    if (decision === 'denied') {
      // A 'denied' reaching a running Clarity restarts it cookieless with one more upload.
      clarity.stop()
      clarity.forget()
      return
    }
    // "Aceptar": an ad_storage that turns granted while Clarity runs makes the tag request
    // c.clarity.ms/c.gif (Microsoft's advertising sync). Stopped, it ignores the change; it starts
    // again in the next idle moment, after gtag, now tagged as an explicit choice.
    if (clarity.isRunning()) clarity.pause()
    idle(() => void reconcile(), { timeout: 2000 })
  })

  // A page restored from the back/forward cache: clarity-js restarts itself there, whatever the
  // site decided (its pageshow listener is never removed, and runs after this one). Look once it
  // has: parked, it recorded into nothing; stop it again, and forget it after "Rechazar".
  window.addEventListener('pageshow', event => {
    if (!(event as PageTransitionEvent).persisted) return
    idle(
      () => {
        const changed = syncStoredDecision()
        if (cookie === 'denied') {
          clarity.stop()
          clarity.forget()
        } else if (!clarity.isRecording()) {
          if (clarity.isRunning()) clarity.stop()
          // "Aceptar" in another tab while this page sat in the cache.
          if (changed) void reconcile()
        } else if (clarity.isRunning()) {
          // Recording here: the restart is the page it records, and it wiped the custom tags.
          const route = router.currentRoute.value
          sendTags(route.path, route.name)
        }
      },
      { timeout: 500 }
    )
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && syncStoredDecision())
      idle(() => void reconcile(), { timeout: 2000 })
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

  void reconcile()
}
