import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '~/stores/auth'
import { useAuthFetch } from '~/composables/useAuthFetch'
import { hydrateFavorites, resetFavoritesState } from '~/composables/useFavoritesState'
import { useImportCartStore } from '~/stores/importCart'
import { useWatchlistStore } from '~/stores/watchlist'
import { useBankosCardsStore } from '~/stores/bankosCards'
import { useBankosFavoritesStore } from '~/stores/bankosFavorites'
import { readPushDevice, revokeBrowserPush } from '~/stores/firebaseMessagingApi'
import { usePushNotifications } from '~/composables/usePushNotifications'

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig().public.firebase
  if (!cfg?.apiKey) return // not configured -> auth simply stays disabled

  if (!getApps().length) {
    initializeApp({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      appId: cfg.appId,
      messagingSenderId: cfg.messagingSenderId,
    })
  }

  const auth = getAuth()
  const store = useAuthStore()
  const { authFetch } = useAuthFetch()
  const push = usePushNotifications()

  const cart = useImportCartStore()
  const watchlist = useWatchlistStore()
  const bankosCards = useBankosCardsStore()
  const bankosFavorites = useBankosFavoritesStore()

  onAuthStateChanged(auth, async fbUser => {
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
  })

  return { provide: { firebaseAuth: auth } }
})
