// Simple Vue plugins for Nuxt 3
export default defineNuxtPlugin((nuxtApp) => {
  // Add global error handler to catch browser extension errors
  if (import.meta.client) {
    window.addEventListener('error', (event) => {
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
    })

    window.addEventListener('unhandledrejection', (event) => {
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
    })

    // Initialize Tawk.to for Nuxt 3
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://embed.tawk.to/63c9feb9c2f1ac1e202ea427/1gn6gm1s3'
    script.charset = 'UTF-8'
    script.setAttribute('crossorigin', '*')
    document.head.appendChild(script)

    script.onload = () => {
      if ((window as any).Tawk_API) {
        ;(window as any).Tawk_API.customStyle = {
          zIndex: 4,
        }
      }
    }
  }
})
