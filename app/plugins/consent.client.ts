// app/plugins/consent.client.ts
import { parseConsent, consentSignals, CONSENT_COOKIE_NAME } from '~/utils/consent'

// Re-apply the visitor's STORED decision on every client boot, in both directions.
//
// It used to re-apply only "granted", on the reasoning that the default was denied anyway so a
// stored rejection needed no action. That stopped being true when the defaults became
// region-scoped (nuxt.config.ts): outside the EEA/UK/CH the default is now granted, so a visitor
// who pressed "Rechazar" last week would be measured again today unless the rejection is replayed
// here. A stored "no" has to outlive the page that recorded it.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const cookie = useCookie<string | null>(CONSENT_COOKIE_NAME)
  const decision = parseConsent(cookie.value)
  if (!decision) return

  try {
    const { gtag } = useGtag()
    gtag('consent', 'update', consentSignals(decision))
  } catch {
    // gtag unavailable — nothing to apply.
  }
})
