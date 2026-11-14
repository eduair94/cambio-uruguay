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

  const anchorOf = (e: MouseEvent) =>
    (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null

  const webUrl = (anchor: HTMLAnchorElement): URL | null => {
    try {
      const u = new URL(anchor.getAttribute('href') || '', location.href)
      return /^https?:$/.test(u.protocol) ? u : null
    } catch {
      return null /* non-URL href */
    }
  }

  // Internal navigation and CTAs: capture, so a component that stops propagation still counts.
  const onCapture = (e: MouseEvent) => {
    if (e.type === 'auxclick' && e.button !== 1) return
    const el = e.target as HTMLElement | null
    const anchor = anchorOf(e)
    const u = anchor ? webUrl(anchor) : null
    if (
      anchor &&
      u &&
      u.origin === location.origin &&
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
    const cta = el?.closest?.('[data-cta]') as HTMLElement | null
    if (cta && /^[\w-]{1,80}$/.test(cta.dataset.cta || ''))
      send('cta_click', { cta: cta.dataset.cta, path: measurementPath(router.currentRoute.value) })
  }

  // Outbound: window bubble, which runs after the exit notice (ExternalNavigationDialog) has had
  // its chance to cancel the navigation. A cancelled click is not an exit, and the notice's own
  // anchor (`data-external-exit-tracked`) was already counted when the reader confirmed.
  const onOutbound = (e: MouseEvent) => {
    if (e.type === 'auxclick' && e.button !== 1) return
    if (e.defaultPrevented) return
    const anchor = anchorOf(e)
    if (!anchor || anchor.hasAttribute('data-external-exit-tracked')) return
    const u = webUrl(anchor)
    if (u && u.origin !== location.origin) {
      send('outbound_click', { link_url: u.origin, link_domain: u.hostname })
    }
  }

  document.addEventListener('click', onCapture, { capture: true, passive: true })
  document.addEventListener('auxclick', onCapture, { capture: true, passive: true })
  window.addEventListener('click', onOutbound, { passive: true })
  window.addEventListener('auxclick', onOutbound, { passive: true })
  const cleanup = () => {
    document.removeEventListener('click', onCapture, true)
    document.removeEventListener('auxclick', onCapture, true)
    window.removeEventListener('click', onOutbound)
    window.removeEventListener('auxclick', onOutbound)
  }
  nuxtApp.vueApp.onUnmount(cleanup)
  if (import.meta.hot) import.meta.hot.dispose(cleanup)
})
