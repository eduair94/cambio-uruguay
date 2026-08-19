import { defineStore } from 'pinia'
import { BANKOS_FAVORITES_STORAGE_KEY, mergeFavoriteIds, sanitizeFavoriteIds } from '~/utils/bankos'

type AuthFetch = <T>(url: string, opts?: any) => Promise<T>

/**
 * Favourite discount stores (by Bankos `locationId`) for /descuentos-con-tarjeta-uruguay.
 *
 * Same contract as {@link useBankosCardsStore}: localStorage while anonymous, unioned with the
 * account's list on login and debounce-synced to `/api/me/bankos-favorites`, so the shortlist
 * follows the reader from phone to laptop.
 */
export const useBankosFavoritesStore = defineStore('bankosFavorites', () => {
  const favorites = ref<string[]>([])
  const loggedIn = ref(false)

  let pushFn: ((ids: string[]) => Promise<unknown>) | null = null
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  let localLoaded = false

  const has = computed(() => {
    const set = new Set(favorites.value)
    return (locationId: string) => set.has(locationId)
  })

  function loadLocal() {
    if (localLoaded || !import.meta.client) return
    localLoaded = true
    try {
      const raw = window.localStorage.getItem(BANKOS_FAVORITES_STORAGE_KEY)
      if (raw) favorites.value = sanitizeFavoriteIds(JSON.parse(raw))
    } catch {
      /* corrupt storage -> start empty */
    }
  }

  function persistLocal() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(BANKOS_FAVORITES_STORAGE_KEY, JSON.stringify(favorites.value))
    } catch {
      /* quota / private mode -> ignore */
    }
  }

  function schedulePush() {
    if (!loggedIn.value || !pushFn) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushFn?.([...favorites.value]).catch(() => {})
    }, 800)
  }

  watch(
    favorites,
    () => {
      persistLocal()
      schedulePush()
    },
    { deep: true }
  )

  function toggle(locationId: string) {
    favorites.value = favorites.value.includes(locationId)
      ? favorites.value.filter(id => id !== locationId)
      : sanitizeFavoriteIds([...favorites.value, locationId])
  }
  function clear() {
    favorites.value = []
  }

  async function hydrateFromAccount(authFetch: AuthFetch) {
    loadLocal()
    loggedIn.value = true
    pushFn = ids =>
      authFetch('/api/me/bankos-favorites', { method: 'PUT', body: { favorites: ids } })
    try {
      const remote = await authFetch<{ favorites: string[] }>('/api/me/bankos-favorites')
      const merged = mergeFavoriteIds(favorites.value, remote?.favorites)
      favorites.value = merged
      await pushFn(merged)
    } catch {
      /* offline / not configured -> keep the local list */
    }
  }

  function onLogout() {
    loggedIn.value = false
    pushFn = null
    if (pushTimer) clearTimeout(pushTimer)
  }

  return { favorites, loggedIn, has, loadLocal, toggle, clear, hydrateFromAccount, onLogout }
})
