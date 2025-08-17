import { defineStore } from 'pinia'

export interface CambioItem {
  origin: string
  code: string
  type?: string
  buy: number
  sell: number
  localData: any
  isInterBank: boolean
  condition?: string
  pos?: number
  amount?: number
  diff?: string
  distance?: number
  distanceData?: any
}

export const useCambioStore = defineStore('cambio', {
  state: () => ({
    all_items: [] as CambioItem[],
    locations: [] as string[],
    fortex: {} as Record<string, any>,
    loading: false,
  }),

  getters: {
    allItems: state => state.all_items,
    getLocations: state => state.locations,
    getFortex: state => state.fortex,
    isLoading: state => state.loading,
  },

  actions: {
    setItems(items: CambioItem[]) {
      this.all_items = items
    },

    setLocations(locations: string[]) {
      this.locations = locations
    },

    setFortex(fortex: Record<string, any>) {
      this.fortex = fortex
    },

    setLoading(loading: boolean) {
      this.loading = loading
    },

    clearStore() {
      this.all_items = []
      this.locations = []
      this.fortex = {}
      this.loading = false
    },
  },
})
