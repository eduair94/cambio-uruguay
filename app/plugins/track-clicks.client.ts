// Global, zero-touch engagement tracking for GA4. Two high-signal behaviours
// that reveal user intent + understanding without instrumenting every link:
//
//   • outbound_click — clicks to external sites (casa-de-cambio websites, map
//     directions, sources). This is the closest proxy to the conversion goal:
//     which exchange house / destination a visitor actually goes to.
//   • cta_click — clicks on elements tagged data-cta="<name>", so key in-app
//     CTAs can be counted by simply adding the attribute.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  const { gtag } = useGtag()
  const send = (event: string, params: Record<string, unknown>) => {
    try {
      gtag('event', event, params)
    } catch {
      /* best-effort */
    }
  }

  document.addEventListener(
    'click',
    e => {
      const el = e.target as HTMLElement | null
      const anchor = el?.closest?.('a[href]') as HTMLAnchorElement | null
      if (anchor) {
        const raw = anchor.getAttribute('href') || ''
        try {
          const u = new URL(raw, location.href)
          if (/^https?:$/.test(u.protocol) && u.origin !== location.origin) {
            send('outbound_click', { link_url: u.href, link_domain: u.hostname })
          }
        } catch {
          /* non-URL href */
        }
      }
      const cta = el?.closest?.('[data-cta]') as HTMLElement | null
      if (cta) send('cta_click', { cta: cta.dataset.cta, path: location.pathname })
    },
    { capture: true, passive: true }
  )
})
