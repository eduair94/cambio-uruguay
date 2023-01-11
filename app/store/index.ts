export const state = () => ({
  items: [],
  locations: [],
})

export const mutations = {
  setItems(state: any, payload: any) {
    state.items = payload
  },
  setLocations(state: any, payload: any) {
    state.locations = payload
  },
}

export const actions = {
  setItems(vuexContext: any, payload: any) {
    vuexContext.commit('setItems', payload)
  },
  setLocations(vuexContext: any, payload: any) {
    vuexContext.commit('setLocations', payload)
  },
}

export const getters = {
  all_items(state: any): boolean {
    return state.items
  },
  locations(state: any) {
    return state.locations
  },
}
