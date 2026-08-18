import { defineStore } from 'pinia'
import {
  BANKOS_CARDS,
  BANKOS_CARDS_STORAGE_KEY,
  mergeCardIds,
  sanitizeCardIds,
} from '~/utils/bankos'

type AuthFetch = <T>(url: string, opts?: any) => Promise<T>

/**
 * The user's selected Bankos cards for `/descuentos-con-tarjeta-uruguay`.
 *
 * Anonymous: localStorage only. On login the local selection is UNIONED with the account's saved
 * one (login never drops a card the user picked while logged out — {@link mergeCardIds}) and changes
 * are debounced to `/api/me/bankos-cards`. Mirrors {@link useImportCartStore}.
 */
export const useBankosCardsStore = defineStore('bankosCards', () => {
  const cards = ref<string[]>([])
  const loggedIn = ref(false)

  let pushFn: ((ids: string[]) => Promise<unknown>) | null = null
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  let localLoaded = false

  function loadLocal() {
    if (localLoaded || !import.meta.client) return
    localLoaded = true
    try {
      const raw = window.localStorage.getItem(BANKOS_CARDS_STORAGE_KEY)
      if (raw) cards.value = sanitizeCardIds(JSON.parse(raw))
    } catch {
      /* corrupt storage -> start empty */
    }
  }

  function persistLocal() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(BANKOS_CARDS_STORAGE_KEY, JSON.stringify(cards.value))
    } catch {
      /* quota / private mode -> ignore */
    }
  }

  function schedulePush() {
    if (!loggedIn.value || !pushFn) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushFn?.([...cards.value]).catch(() => {})
    }, 800)
  }

  watch(
    cards,
    () => {
      persistLocal()
      schedulePush()
    },
    { deep: true }
  )

  // --- mutations -----------------------------------------------------------
  function setCards(next: string[]) {
    cards.value = sanitizeCardIds(next)
  }
  function toggle(id: string) {
    cards.value = cards.value.includes(id)
      ? cards.value.filter(c => c !== id)
      : sanitizeCardIds([...cards.value, id])
  }
  function selectAll() {
    cards.value = BANKOS_CARDS.map(c => c.id)
  }
  function clear() {
    cards.value = []
  }

  // --- account sync --------------------------------------------------------
  /** On login: union local + account selection, adopt it, push back. */
  async function hydrateFromAccount(authFetch: AuthFetch) {
    loadLocal()
    loggedIn.value = true
    pushFn = ids => authFetch('/api/me/bankos-cards', { method: 'PUT', body: { cards: ids } })
    try {
      const remote = await authFetch<{ cards: string[] }>('/api/me/bankos-cards')
      const merged = mergeCardIds(cards.value, remote?.cards)
      cards.value = merged
      await pushFn(merged)
    } catch {
      /* offline / not configured -> keep local selection */
    }
  }

  /** On logout: stop syncing; keep the local selection for the anonymous session. */
  function onLogout() {
    loggedIn.value = false
    pushFn = null
    if (pushTimer) clearTimeout(pushTimer)
  }

  return {
    cards,
    loggedIn,
    loadLocal,
    setCards,
    toggle,
    selectAll,
    clear,
    hydrateFromAccount,
    onLogout,
  }
})
