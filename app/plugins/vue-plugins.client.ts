// Simple Vue plugins for Nuxt 3
export default defineNuxtPlugin(nuxtApp => {
  // Add global error handler to catch browser extension errors
  if (import.meta.client) {
    const errorHandler = (event: ErrorEvent) => {
      // Ignore browser extension errors
      if (
        event.error?.stack?.includes('chrome-extension://') ||
        event.error?.stack?.includes('moz-extension://') ||
        event.error?.stack?.includes('GenAIWebpageEligibilityService') ||
        event.error?.stack?.includes('CacheStore') ||
        event.error?.message?.includes('caches is not defined')
      ) {
        event.preventDefault()
        return false
      }
      return true
    }

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      // Ignore browser extension promise rejections
      if (
        event.reason?.stack?.includes('chrome-extension://') ||
        event.reason?.stack?.includes('moz-extension://') ||
        event.reason?.stack?.includes('GenAIWebpageEligibilityService') ||
        event.reason?.stack?.includes('CacheStore') ||
        event.reason?.message?.includes('caches is not defined')
      ) {
        event.preventDefault()
        return false
      }
      return true
    }

    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', rejectionHandler)

    // Cleanup on page leave or app end
    nuxtApp.hook('app:beforeMount', () => {
      // Store cleanup functions for later use
      if (typeof window !== 'undefined' && (window as any).__vuePluginCleanup) {
        ;(window as any).__vuePluginCleanup()
      }
    })

    // Store cleanup in window for access during navigation
    if (typeof window !== 'undefined') {
      ;(window as any).__vuePluginCleanup = () => {
        window.removeEventListener('error', errorHandler)
        window.removeEventListener('unhandledrejection', rejectionHandler)
      }
    }

    // Tawk.to is loaded separately in tawk.client.ts plugin - removed duplicate
  }
})
