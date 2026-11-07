// What a Firebase auth-state change does to the rest of the app: push-device consent, the
// account profile and the account copies of favorites, cart, watchlist and Bankos cards.
//
// Loaded together with the Firebase SDK (plugins/firebase.client.ts), never on page load: the
// stores it hydrates pull in catalogues (the watchlist board alone brings utils/debitCards.ts),
// and a visitor without a saved session never needs any of it.
import type { NuxtApp } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useAuthFetch } from '~/composables/useAuthFetch'
import { hydrateFavorites, resetFavoritesState } from '~/composables/useFavoritesState'
import { useImportCartStore } from '~/stores/importCart'
import { useWatchlistStore } from '~/stores/watchlist'
import { useBankosCardsStore } from '~/stores/bankosCards'
import { useBankosFavoritesStore } from '~/stores/bankosFavorites'
import { readPushDevice, revokeBrowserPush } from '~/services/firebaseMessagingApi'
import { usePushNotifications } from '~/composables/usePushNotifications'

export function createAuthStateSync(nuxtApp: NuxtApp): (fbUser: any | null) => Promise<void> {
  return nuxtApp.runWithContext(() => {
    const store = useAuthStore()
    const { authFetch } = useAuthFetch()
    const push = usePushNotifications()

    const cart = useImportCartStore()
    const watchlist = useWatchlistStore()
    const bankosCards = useBankosCardsStore()
    const bankosFavorites = useBankosFavoritesStore()

    return async (fbUser: any | null) => {
      store.setUser(fbUser)
      const device = readPushDevice()
      if (device && device.uid !== fbUser?.uid) {
        // Account changes must not silently reuse a previous account's device consent.
        if (!(await revokeBrowserPush(null))) store.error = 'push/revocation-failed'
      } else if (
        device &&
        fbUser &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        // Refresh only an explicitly registered device. This never opens a permission prompt.
        await push.enablePush().catch(() => {})
      }
      if (fbUser) {
        await authFetch('/api/me/profile').catch(() => {})
        await hydrateFavorites(authFetch)
        await cart.hydrateFromAccount(authFetch)
        await watchlist.hydrateFromAccount(authFetch)
        await bankosCards.hydrateFromAccount(authFetch)
        await bankosFavorites.hydrateFromAccount(authFetch)
      } else {
        resetFavoritesState()
        cart.onLogout()
        watchlist.onLogout()
        bankosCards.onLogout()
        bankosFavorites.onLogout()
      }
    }
  })
}
