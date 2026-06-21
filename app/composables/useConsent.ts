// app/composables/useConsent.ts
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE,
  parseConsent,
  consentSignals,
  type ConsentDecision,
} from '~/utils/consent'

// Single source of truth for the user's cookie-consent decision. Backed by a
// first-party cookie (cu_consent). Applies Google Consent Mode v2 updates to
// gtag when the user accepts; the denied default is configured in nuxt.config.
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
    try {
      const { gtag } = useGtag()
      gtag('consent', 'update', consentSignals(d))
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
