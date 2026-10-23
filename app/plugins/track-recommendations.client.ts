import { measurementContext, measurementPath } from '~/utils/engagementMeasurement'
import {
  createRecommendationExposure,
  recommendationArea,
  type RecommendationArea,
} from '~/utils/recommendationExposure'

// One exposure per authored module/pathname visit, with the same source and
// link_area as internal_navigation. Observe links, not a potentially huge box.
export default defineNuxtPlugin(nuxtApp => {
  if (typeof IntersectionObserver === 'undefined') return
  const router = useRouter()
  const { gtag } = useGtag()
  const exposure = createRecommendationExposure()
  let observer: IntersectionObserver | null = null
  let generation = 0
  let disposed = false
  const visible = () => document.visibilityState === 'visible'
  const stop = () => {
    generation++
    observer?.disconnect()
    observer = null
  }
  const visit = () => {
    const route = router.currentRoute.value
    exposure.visit(route.path, measurementPath(route))
  }
  const refresh = async () => {
    stop()
    const currentGeneration = generation
    await nextTick()
    if (disposed || currentGeneration !== generation || !visible()) return
    const route = router.currentRoute.value
    const path = measurementPath(route)
    if (!path) return
    visit()
    const areas = new Map<Element, RecommendationArea>()
    const currentObserver = new IntersectionObserver(
      entries => {
        if (disposed || currentGeneration !== generation || !visible()) return
        for (const entry of entries) {
          if (!entry.isIntersecting || !entry.target.isConnected) continue
          const mark = exposure.observe(areas.get(entry.target), entry.intersectionRatio, visible())
          if (!mark) continue
          try {
            gtag('event', 'recommendation_view', {
              ...measurementContext(mark.content_path, location.origin),
              ...mark,
            })
          } catch {
            // A missing tag must not affect navigation or create retry traffic.
          }
        }
      },
      { threshold: [0.5] }
    )
    observer = currentObserver
    for (const module of document.querySelectorAll<HTMLElement>('[data-link-area]')) {
      const area = recommendationArea(module.dataset.linkArea)
      if (!area) continue
      for (const link of module.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        if (link.closest('[data-link-area]') !== module || link.hasAttribute('download')) continue
        try {
          const destination = new URL(link.getAttribute('href') || '', location.href)
          if (
            !/^https?:$/.test(destination.protocol) ||
            destination.origin !== location.origin ||
            destination.pathname === route.path ||
            !measurementPath(router.resolve(destination.pathname))
          )
            continue
          areas.set(link, area)
          currentObserver.observe(link)
        } catch {
          // Invalid or non-navigation hrefs are not recommendation exposures.
        }
      }
    }
  }
  visit()
  const removeRouteHook = router.afterEach((to, from, failure) => {
    if (!failure && to.path !== from.path) {
      stop() // Old DOM must not be credited to the new page while it loads.
      visit()
    }
  })
  const removeMountedHook = nuxtApp.hook('app:mounted', refresh)
  const removePageHook = nuxtApp.hook('page:finish', refresh)
  const onVisibility = () => {
    if (visible()) void refresh()
    else stop()
  }
  const onPageShow = () => void refresh()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', stop)
  window.addEventListener('pageshow', onPageShow)
  void refresh()

  const cleanup = () => {
    disposed = true
    stop()
    removeRouteHook()
    removeMountedHook()
    removePageHook()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', stop)
    window.removeEventListener('pageshow', onPageShow)
  }
  nuxtApp.vueApp.onUnmount(cleanup)
  if (import.meta.hot) import.meta.hot.dispose(cleanup)
})
