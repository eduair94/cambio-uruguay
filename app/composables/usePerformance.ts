/**
 * Composable for lazy loading components with performance optimization
 */
export const useLazyComponent = () => {
  const isVisible = ref(false)
  const element = ref<HTMLElement>()

  const observeElement = () => {
    if (!import.meta.client || !element.value) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px', // Load 50px before element becomes visible
        threshold: 0.1,
      },
    )

    observer.observe(element.value)
  }

  onMounted(() => {
    observeElement()
  })

  return {
    isVisible: readonly(isVisible),
    element,
  }
}

/**
 * Composable for deferring non-critical operations
 */
export const useDeferredExecution = () => {
  const execute = (callback: () => void, delay = 100) => {
    if (import.meta.client) {
      // Use requestIdleCallback if available, otherwise use setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: delay })
      } else {
        setTimeout(callback, delay)
      }
    }
  }

  return { execute }
}
