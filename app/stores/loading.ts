import { defineStore } from 'pinia'

export const useLoadingStore = defineStore('loading', {
  state: () => ({
    isLoading: true,
    loadingMessage: 'Cargando...',
    routeChanging: false,
    isClient: true,
  }),

  getters: {
    getIsLoading: state => state.isLoading,
    getLoadingMessage: state => state.loadingMessage,
    getRouteChanging: state => state.routeChanging,
    showOverlay: state => (state.isLoading || state.routeChanging) && state.isClient,
  },

  actions: {
    // Initialize client-side state
    initClient() {
      if (typeof window !== 'undefined') {
        this.isClient = true
      }
    },

    setLoading(loading: boolean, message = 'Cargando...') {
      // Only update if we're on the client side or if we're hiding the loading
      if (this.isClient || !loading) {
        this.isLoading = loading
        this.loadingMessage = message
      }
    },

    setRouteChanging(changing: boolean) {
      // Only update if we're on the client side or if we're hiding the route changing
      if (this.isClient || !changing) {
        this.routeChanging = changing
      }
    },

    showLoading(message = 'Cargando...') {
      this.setLoading(true, message)
    },

    hideLoading() {
      this.setLoading(false)
    },

    showRouteLoading() {
      this.setRouteChanging(true)
    },

    hideRouteLoading() {
      this.setRouteChanging(false)
    },
  },
})
