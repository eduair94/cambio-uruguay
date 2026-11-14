import { onBeforeUnmount, onMounted, watch } from 'vue'
import { catalogQueryWithFilters } from '../utils/catalogShareQuery'

/** Keep client-side catalog choices reloadable without scrolling on each slider/input change. */
export function useCatalogShareQuery(
  ownedKeys: readonly string[],
  source: () => Record<string, string>,
  restore: (query: Record<string, unknown>) => void
) {
  const route = useRoute()
  const initialPath = route.path
  let restoring = false
  const restoreQuery = (query: Record<string, unknown>) => {
    restoring = true
    try {
      restore(query)
    } finally {
      restoring = false
    }
  }

  watch(
    source,
    values => {
      if (
        !import.meta.client ||
        restoring ||
        route.path !== initialPath ||
        window.location.pathname !== initialPath
      )
        return
      const search = catalogQueryWithFilters(window.location.search, ownedKeys, values)
      const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
      if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`)
        return
      const state = window.history.state
      window.history.replaceState(
        state && typeof state === 'object' ? { ...state, current: next } : state,
        '',
        next
      )
      window.dispatchEvent(new Event('cu:share-target-change'))
    },
    { deep: true, flush: 'sync' }
  )

  watch(
    () => route.query,
    query => {
      if (route.path === initialPath) restoreQuery(query)
    },
    { flush: 'sync' }
  )

  const onPopState = () => {
    if (window.location.pathname === initialPath)
      restoreQuery(Object.fromEntries(new URLSearchParams(window.location.search)))
  }
  onMounted(() => window.addEventListener('popstate', onPopState))
  onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
  useSeoMeta({ robots: () => (Object.keys(source()).length ? 'noindex, follow' : 'index, follow') })
}
