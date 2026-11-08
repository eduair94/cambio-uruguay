// Thin, consent-safe wrapper over GA4 (nuxt-gtag). Google Consent Mode v2 is
// already wired (see useConsent / consent.client.ts), so events are always safe
// to emit — GA gates storage until the user accepts. Use this for the few
// high-signal interactions we want to read in GA4 ("Engagement → Events"):
// which features get used, where users drop off, and what they understand.
//
//   const track = useTrack()
//   track('convert', { from: 'USD', to: 'UYU' })
//
// Give interaction metadata specific names (content_path, tour_trigger,
// search_trigger). `source` and other campaign fields belong to acquisition,
// not to where an on-site interaction happened: keep campaign attribution in
// external UTM links, separate from these events.
//
// The same event reaches Microsoft Clarity, when it is recording, so a session can be filtered
// by what happened in it (search_no_results, feedback_view…). Its NAME only: the parameters can
// carry a path or a filter, and Clarity gets nothing a visitor typed.
import { event as clarityEvent } from '~/services/clarity'

export function useTrack() {
  const { gtag } = useGtag()
  return (event: string, params: Record<string, unknown> = {}) => {
    if (!import.meta.client) return
    try {
      gtag('event', event, params)
    } catch {
      // analytics is best-effort; never let it break a user interaction
    }
    try {
      clarityEvent(event)
    } catch {
      // same
    }
  }
}
