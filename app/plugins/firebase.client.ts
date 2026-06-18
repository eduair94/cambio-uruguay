import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '~/stores/auth'
import { useAuthFetch } from '~/composables/useAuthFetch'
import { hydrateFavorites, resetFavoritesState } from '~/composables/useFavoritesState'

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

  onAuthStateChanged(auth, async fbUser => {
    store.setUser(fbUser)
    if (fbUser) {
      await authFetch('/api/me/profile').catch(() => {})
      await hydrateFavorites(authFetch)
    } else {
      resetFavoritesState()
    }
  })

  return { provide: { firebaseAuth: auth } }
})
