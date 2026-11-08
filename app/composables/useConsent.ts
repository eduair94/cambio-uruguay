// app/composables/useConsent.ts
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE,
  parseConsent,
  consentSignals,
  insertStoredConsent,
  type ConsentDecision,
} from '~/utils/consent'

// Single source of truth for the user's cookie-consent decision. Backed by a
// first-party cookie (cu_consent). Each decision is announced on `window` as a
// `cu:consent` event (Microsoft Clarity listens) and applied to gtag as a
// Consent Mode v2 update; the region-scoped defaults live in nuxt.config.
export function useConsent() {
  const cookie = useCookie<string | null>(CONSENT_COOKIE_NAME, {
    maxAge: CONSENT_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  })

  const decision = computed<ConsentDecision | null>(() => parseConsent(cookie.value))
  const hasDecided = computed(() => decision.value !== null)

  // Banner visibility. Open by default until a decision exists; the footer
  // "Configurar cookies" control re-opens it via reopen().
  const bannerOpen = useState<boolean>('cu_consent_banner_open', () => false)

  const apply = (d: ConsentDecision) => {
    if (!import.meta.client) return
    // For the scripts that are not gtag (plugins/clarity.client.ts), and BEFORE gtag hears it:
    // Clarity also listens to Consent Mode, and a 'denied' reaching it while it records restarts
    // it without cookies and uploads once more. Stopped first, it ignores that signal.
    try {
      window.dispatchEvent(new CustomEvent('cu:consent', { detail: d }))
    } catch {
      // A listener that throws must not keep the decision from reaching gtag.
    }
    try {
      // While gtag.js has not loaded (it can be held back: plugins/gtag-init.client.ts waits for a
      // clean address bar), a plain update lands after the queued `config` commands and the first
      // page_view would still go out under the region default. Ahead of `js` it wins.
      const signals = consentSignals(d)
      if (!insertStoredConsent((window as { dataLayer?: unknown }).dataLayer, signals)) {
        const { gtag } = useGtag()
        gtag('consent', 'update', signals)
      }
    } catch {
      // gtag not available (module disabled / SSR) — cookie still records intent.
    }
  }

  const accept = () => {
    cookie.value = 'granted'
    apply('granted')
    bannerOpen.value = false
  }

  const reject = () => {
    cookie.value = 'denied'
    apply('denied')
    bannerOpen.value = false
  }

  const reopen = () => {
    bannerOpen.value = true
  }

  return { decision, hasDecided, bannerOpen, accept, reject, reopen }
}
