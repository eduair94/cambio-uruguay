import { useLoadingStore } from '~/stores/loading'

export const useLoading = () => {
  const loadingStore = useLoadingStore()

  const showLoading = (message = 'Cargando...') => {
    loadingStore.showLoading(message)
  }

  const hideLoading = () => {
    loadingStore.hideLoading()
  }

  const showRouteLoading = () => {
    loadingStore.showRouteLoading()
  }

  const hideRouteLoading = () => {
    loadingStore.hideRouteLoading()
  }

  const withLoading = async <T>(asyncFn: () => Promise<T>, message = 'Cargando...'): Promise<T> => {
    showLoading(message)
    try {
      return await asyncFn()
    } finally {
      hideLoading()
    }
  }

  return {
    showLoading,
    hideLoading,
    showRouteLoading,
    hideRouteLoading,
    withLoading,
    isLoading: computed(() => loadingStore.getIsLoading),
    isRouteChanging: computed(() => loadingStore.getRouteChanging),
    loadingMessage: computed(() => loadingStore.getLoadingMessage),
    showOverlay: computed(() => loadingStore.showOverlay),
  }
}
