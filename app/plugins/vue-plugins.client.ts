// Simple Vue plugins for Nuxt 3
export default defineNuxtPlugin((nuxtApp) => {
  let errorHandler: ((event: ErrorEvent) => boolean | void) | null = null
  let rejectionHandler:
    | ((event: PromiseRejectionEvent) => boolean | void)
    | null = null

  // Add global error handler to catch browser extension errors
  if (import.meta.client) {
    errorHandler = (event: ErrorEvent) => {
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
    }

    rejectionHandler = (event: PromiseRejectionEvent) => {
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
        if (errorHandler) {
          window.removeEventListener('error', errorHandler)
          errorHandler = null
        }
        if (rejectionHandler) {
          window.removeEventListener('unhandledrejection', rejectionHandler)
          rejectionHandler = null
        }
      }
    }

    // Tawk.to is loaded separately in tawk.client.ts plugin - removed duplicate
  }
})
