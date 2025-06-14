import { useLoadingStore } from '~/stores/loading'

export default defineNuxtPlugin((nuxtApp) => {
  const loadingStore = useLoadingStore()

  // Handle various Nuxt lifecycle hooks for better loading management
  nuxtApp.hook('app:beforeMount', () => {
    loadingStore.showLoading('Iniciando aplicación...')
  })

  // Auto-hide loading on hydration complete
  nuxtApp.hook('app:mounted', () => {
    // Use requestAnimationFrame to ensure all rendering is complete
    requestAnimationFrame(() => {
      // Check if all critical resources are loaded
      if (document.readyState === 'complete') {
        loadingStore.hideLoading()
        loadingStore.hideRouteLoading()
      } else {
        // Wait for the load event
        const handleLoad = () => {
          loadingStore.hideLoading()
          loadingStore.hideRouteLoading()
          window.removeEventListener('load', handleLoad)
        }
        window.addEventListener('load', handleLoad)

        // Fallback timeout
        setTimeout(() => {
          loadingStore.hideLoading()
          loadingStore.hideRouteLoading()
        }, 2000)
      }
    })
  })

  // Handle errors
  nuxtApp.hook('app:error', () => {
    loadingStore.hideLoading()
    loadingStore.hideRouteLoading()
  })

  // Handle page transitions
  nuxtApp.hook('page:start', () => {
    loadingStore.showRouteLoading()
  })

  nuxtApp.hook('page:finish', () => {
    // Small delay to ensure page content is rendered
    requestAnimationFrame(() => {
      loadingStore.hideRouteLoading()
    })
  })

  // Provide global loading helper
  return {
    provide: {
      loading: {
        show: (message?: string) => loadingStore.showLoading(message),
        hide: () => loadingStore.hideLoading(),
        showRoute: () => loadingStore.showRouteLoading(),
        hideRoute: () => loadingStore.hideRouteLoading(),
      },
    },
  }
})
