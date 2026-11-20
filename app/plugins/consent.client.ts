// app/plugins/consent.client.ts
import {
  parseConsent,
  consentSignals,
  insertStoredConsent,
  CONSENT_COOKIE_NAME,
} from '~/utils/consent'

// Re-apply the visitor's STORED decision on every client boot, in both directions, BEFORE the
// first hit.
//
// It used to re-apply only "granted", on the reasoning that the default was denied anyway so a
// stored rejection needed no action. That stopped being true when the defaults became
// region-scoped (nuxt.config.ts): outside the EEA/UK/CH the default is now granted, so a visitor
// who pressed "Rechazar" last week would be measured again today unless the rejection is replayed
// here. A stored "no" has to outlive the page that recorded it.
//
// Replaying it with gtag('consent','update') was not enough: that call lands in the queue after
// nuxt-gtag's `config` commands, and gtag.js sends the page_view while running `config`. With
// cu_consent=denied the first /g/collect still carried gcs=G111 and `_ga` came back on every
// load. So the decision goes into the queue right before `js` (utils/consent.ts), which this
// plugin can do because nuxt-gtag's own plugin has already queued its commands and gtag.js is only
// injected afterwards, by plugins/gtag-init.client.ts.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const cookie = useCookie<string | null>(CONSENT_COOKIE_NAME)
  const decision = parseConsent(cookie.value)
  if (!decision) return

  const signals = consentSignals(decision)
  if (insertStoredConsent((window as { dataLayer?: unknown }).dataLayer, signals)) return

  // gtag.js already runs the queue (or the module is disabled): an ordinary update still applies
  // to everything sent from now on.
  try {
    const { gtag } = useGtag()
    gtag('consent', 'update', signals)
  } catch {
    // gtag unavailable — nothing to apply.
  }
})
