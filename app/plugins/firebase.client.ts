import { useAuthStore } from '~/stores/auth'
import {
  hasStoredFirebaseSession,
  isAuthHandoffUrl,
  loadFirebaseAuth,
  setFirebaseStarter,
} from '~/services/firebaseLazy'

// The Firebase SDK is not part of this plugin, nor of the entry chunk: see services/firebaseLazy.ts.
// A visitor without a saved session gets a resolved, signed-out auth store and no SDK until they
// act on auth (the login dialog, a magic link, the Discord hand-off). One with a saved session
// gets the SDK loaded right away, as its own chunk, to restore that session.
export default defineNuxtPlugin({
  name: 'firebase',
  setup(nuxtApp) {
    const cfg = useRuntimeConfig().public.firebase
    if (!cfg?.apiKey) return // not configured -> auth simply stays disabled

    const store = useAuthStore()
    // undefined until a state is applied; null once applied as signed out.
    let appliedUid: string | null | undefined

    function signedOutWithoutSdk() {
      // Firebase already reported (the visitor opened the login dialog meanwhile): it wins.
      if (appliedUid !== undefined) return
      appliedUid = null
      store.setUser(null)
    }

    setFirebaseStarter(async api => {
      const { createAuthStateSync } = await import('~/services/firebaseAuthSync')
      const sync = createAuthStateSync(nuxtApp)
      api.initFirebaseApp(cfg)
      api.onAuthStateChanged(api.fbAuth(), fbUser => {
        const uid = fbUser?.uid ?? null
        // A visitor already resolved as signed out who loads the SDK later (opening the login
        // dialog) gets a second "signed out" from Firebase: nothing changed, so nothing to redo.
        if (uid === null && appliedUid === null) return
        appliedUid = uid
        return sync(fbUser)
      })
    })

    const sessionCheck = isAuthHandoffUrl(window.location.href)
      ? Promise.resolve(true)
      : hasStoredFirebaseSession()
    void sessionCheck.then(hasSession => {
      // A visitor who never signed in here: the signed-out state Firebase would report anyway
      // (the account stores start signed out, so there is nothing to reset).
      if (!hasSession) return signedOutWithoutSdk()
      // The SDK chunk did not load: resolve as signed out rather than leave callers waiting.
      return loadFirebaseAuth().then(() => undefined, signedOutWithoutSdk)
    })
  },
})
