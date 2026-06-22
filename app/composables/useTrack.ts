// Thin, consent-safe wrapper over GA4 (nuxt-gtag). Google Consent Mode v2 is
// already wired (see useConsent / consent.client.ts), so events are always safe
// to emit — GA gates storage until the user accepts. Use this for the few
// high-signal interactions we want to read in GA4 ("Engagement → Events"):
// which features get used, where users drop off, and what they understand.
//
//   const track = useTrack()
//   track('convert', { from: 'USD', to: 'UYU' })
export function useTrack() {
  const { gtag } = useGtag()
  return (event: string, params: Record<string, unknown> = {}) => {
    if (!import.meta.client) return
    try {
      gtag('event', event, params)
    } catch {
      // analytics is best-effort; never let it break a user interaction
    }
  }
}
