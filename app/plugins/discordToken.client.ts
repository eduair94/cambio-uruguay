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

    const scrub = (key: string) => {
      url.searchParams.delete(key)
      window.history.replaceState({}, '', url.toString())
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
