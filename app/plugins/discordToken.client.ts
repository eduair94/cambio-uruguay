// Consume the Discord login hand-off. The callback route redirects to
// /cuenta?ct=<firebase-custom-token> (or ?authError=discord); sign in with the
// token, then scrub the query so it isn't shared or re-used.
import { loadFirebaseAuth } from '~/services/firebaseLazy'

export default defineNuxtPlugin({
  name: 'discord-token',
  // The firebase plugin registers how the SDK starts; loading it before that would skip
  // initializeApp. (Alphabetically this file runs first.)
  dependsOn: ['firebase'],
  setup() {
    if (import.meta.server) return
    const url = new URL(window.location.href)
    const ct = url.searchParams.get('ct')
    const authError = url.searchParams.get('authError')
    const auth = useAuthStore()

    // Through the router, once the app is up. A raw history.replaceState left the token in
    // vue-router's current route: the next navigation wrote /cuenta?ct=<token> back into that
    // history entry and Back showed it again, after GA had started (adversarial review,
    // 2026-11-08). Before app:created the router also re-applies the boot URL, so earlier is moot.
    const router = useRouter()
    const scrub = (key: string) => {
      onNuxtReady(() => {
        const current = router.currentRoute.value
        // `undefined` drops the key from the URL (vue-router).
        const query = { ...current.query, [key]: undefined }
        void router.replace({ path: current.path, query, hash: current.hash }).catch(() => {})
      })
    }

    if (authError === 'discord') {
      auth.error = 'auth.discordError'
      scrub('authError')
    }

    if (ct) {
      loadFirebaseAuth()
        .then(fb => fb.signInWithCustomToken(fb.fbAuth(), ct))
        .catch(() => {
          auth.error = 'discord-login-failed'
        })
        .finally(() => scrub('ct'))
    }
  },
})
