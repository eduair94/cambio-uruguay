import {
  contentScrollPercent,
  createReadingProgress,
  measurementContext,
  measurementPath,
} from '~/utils/engagementMeasurement'

// At most two events per pathname visit, sent only while the visitor scrolls.
// No heartbeat, invented engagement time, page_view or key event. Consent Mode
// remains owned by the existing gtag/consent setup.
export default defineNuxtPlugin(nuxtApp => {
  const router = useRouter()
  const { gtag } = useGtag()
  const progress = createReadingProgress()
  let scrollIntentAt = -Infinity
  let frame: number | null = null
  const visible = () => document.visibilityState === 'visible'
  const visit = () => {
    const route = router.currentRoute.value
    progress.visit(route.path, measurementPath(route), performance.now(), visible())
    scrollIntentAt = -Infinity
  }
  visit()
  const removeRouteHook = router.afterEach((to, from, failure) => {
    if (!failure && to.path !== from.path) visit()
  })
  const onVisibility = () => {
    progress.setVisible(visible(), performance.now())
    scrollIntentAt = -Infinity
  }
  const onPageHide = () => progress.setVisible(false, performance.now())
  const onPageShow = () => progress.setVisible(visible(), performance.now())
  const onIntent = () => {
    if (visible()) scrollIntentAt = performance.now()
  }
  const onKey = (event: KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key))
      return
    const target = event.target as HTMLElement | null
    if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
    onIntent()
  }
  const onScroll = () => {
    if (!visible() || performance.now() - scrollIntentAt > 1500 || frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      if (!visible() || performance.now() - scrollIntentAt > 1500) return
      // FamiliaNav and layout-tail are siblings of the routed page; neither is
      // part of the read depth. Selecting direct children also excludes rails.
      const container = document.querySelector('.container_custom')
      const page = Array.from(container?.children ?? []).find(child =>
        child.matches('.v-container, :has(> .v-container)')
      )
      if (!page) return
      const rect = page.getBoundingClientRect()
      const percent = contentScrollPercent(rect.top, rect.height, window.innerHeight)
      if (percent === null) return
      for (const mark of progress.scroll(percent, performance.now())) {
        try {
          gtag('event', 'read_progress', {
            ...measurementContext(mark.content_path, location.origin),
            ...mark,
          })
        } catch {
          // Analytics must never interrupt scrolling.
        }
      }
    })
  }
  document.addEventListener('visibilitychange', onVisibility)
  document.addEventListener('wheel', onIntent, { passive: true })
  document.addEventListener('touchmove', onIntent, { passive: true })
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('pageshow', onPageShow)

  const cleanup = () => {
    removeRouteHook()
    if (frame !== null) cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', onVisibility)
    document.removeEventListener('wheel', onIntent)
    document.removeEventListener('touchmove', onIntent)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('pageshow', onPageShow)
  }
  nuxtApp.vueApp.onUnmount(cleanup)
  if (import.meta.hot) import.meta.hot.dispose(cleanup)
})
