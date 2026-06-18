import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '~/stores/auth'

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
  onAuthStateChanged(auth, fbUser => store.setUser(fbUser))

  return { provide: { firebaseAuth: auth } }
})
