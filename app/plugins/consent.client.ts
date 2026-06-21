// app/plugins/consent.client.ts
import { parseConsent, consentSignals, CONSENT_COOKIE_NAME } from '~/utils/consent'

// Re-apply a stored "granted" decision on every client boot so returning users
// keep full consent without re-prompting. The denied default is set via
// nuxt-gtag initCommands in nuxt.config, so no action is needed for denied.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const cookie = useCookie<string | null>(CONSENT_COOKIE_NAME)
  const decision = parseConsent(cookie.value)
  if (decision !== 'granted') return

  try {
    const { gtag } = useGtag()
    gtag('consent', 'update', consentSignals('granted'))
  } catch {
    // gtag unavailable — nothing to upgrade.
  }
})
