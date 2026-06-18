export default defineNuxtRouteMiddleware(() => {
  // Client-only guard: auth state lives in the browser.
  if (import.meta.server) return
  const store = useAuthStore()
  const localePath = useLocalePath()
  if (store.ready && !store.isLoggedIn) {
    store.openDialog()
    return navigateTo(localePath('/'))
  }
})
