// Consume the Discord login hand-off. The callback route redirects to
// /cuenta?ct=<firebase-custom-token> (or ?authError=discord); sign in with the
// token, then scrub the query so it isn't shared or re-used.
import { fbAuth, signInWithCustomToken } from '~/stores/firebaseAuthApi'

export default defineNuxtPlugin(() => {
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
    signInWithCustomToken(fbAuth(), ct)
      .catch(() => {
        auth.error = 'discord-login-failed'
      })
      .finally(() => scrub('ct'))
  }
})
