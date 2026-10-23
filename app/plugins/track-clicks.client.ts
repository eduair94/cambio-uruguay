import {
  measurementContext,
  measurementLinkArea,
  measurementPath,
} from '~/utils/engagementMeasurement'

// Actual link activations, not synthetic pageviews. Link areas distinguish a
// next-step recommendation from the header; query/filter/hash changes do not
// masquerade as another page. Full outbound URLs can contain search text,
// WhatsApp messages or tokens, so only their origin/domain leaves the browser.
export default defineNuxtPlugin(nuxtApp => {
  if (!import.meta.client) return
  const router = useRouter()
  const { gtag } = useGtag()
  const send = (event: string, params: Record<string, unknown>) => {
    const path = measurementPath(router.currentRoute.value)
    if (!path) return
    try {
      gtag('event', event, { ...measurementContext(path, location.origin), ...params })
    } catch {
      /* best-effort */
    }
  }

  const onClick = (e: MouseEvent) => {
    if (e.type === 'auxclick' && e.button !== 1) return
    const el = e.target as HTMLElement | null
    const anchor = el?.closest?.('a[href]') as HTMLAnchorElement | null
    if (anchor) {
      const raw = anchor.getAttribute('href') || ''
      try {
        const u = new URL(raw, location.href)
        if (/^https?:$/.test(u.protocol) && u.origin !== location.origin) {
          send('outbound_click', { link_url: u.origin, link_domain: u.hostname })
        } else if (
          /^https?:$/.test(u.protocol) &&
          !anchor.hasAttribute('download') &&
          u.pathname !== location.pathname
        ) {
          const destination = measurementPath(router.resolve(u.pathname))
          if (destination) {
            const area = anchor.closest<HTMLElement>('[data-link-area]')?.dataset.linkArea
            const inferredArea = anchor.closest('.related-pages')
              ? 'related_pages'
              : anchor.closest('.v-app-bar')
                ? 'header'
                : anchor.closest('.v-navigation-drawer')
                  ? 'drawer'
                  : anchor.closest('footer, .v-footer')
                    ? 'footer'
                    : 'content'
            send('internal_navigation', {
              destination_path: destination,
              link_area: measurementLinkArea(area || inferredArea),
            })
          }
        }
      } catch {
        /* non-URL href */
      }
    }
    const cta = el?.closest?.('[data-cta]') as HTMLElement | null
    if (cta && /^[\w-]{1,80}$/.test(cta.dataset.cta || ''))
      send('cta_click', { cta: cta.dataset.cta, path: measurementPath(router.currentRoute.value) })
  }
  document.addEventListener('click', onClick, { capture: true, passive: true })
  document.addEventListener('auxclick', onClick, { capture: true, passive: true })
  const cleanup = () => {
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('auxclick', onClick, true)
  }
  nuxtApp.vueApp.onUnmount(cleanup)
  if (import.meta.hot) import.meta.hot.dispose(cleanup)
})
