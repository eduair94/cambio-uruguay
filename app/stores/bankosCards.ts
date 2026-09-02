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
  /** Opt-in to the daily "new discount" push. Account-only: it needs a device token to notify. */
  const notify = ref(false)

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

  /**
   * NUNCA escribe antes de haber leído. Esa condición es el arreglo de un bug que borraba la
   * selección de todo el mundo en cada visita.
   *
   * Qué pasaba: la página usa el store durante el SSR, así que pinia serializa `cards: []` en el
   * payload; al hidratar, el cliente le asigna ese `[]` al ref, el watcher de abajo dispara, y
   * `persistLocal` pisaba el localStorage con "[]" — todo antes de que `loadLocal()` (que corre en
   * onMounted) alcanzara a leerlo. Medido en producción con un hook sobre Storage.setItem: la
   * escritura del "[]" ocurría a los 1.379 ms. Y como sin tarjetas seleccionadas la página no
   * dibuja el mapa ni llama a /api/bankos/*, el efecto era que cada visitante que volvía se
   * encontraba el producto vacío y tenía que elegir las tarjetas otra vez.
   */
  function persistLocal() {
    if (!import.meta.client || !localLoaded) return
    try {
      window.localStorage.setItem(BANKOS_CARDS_STORAGE_KEY, JSON.stringify(cards.value))
    } catch {
      /* quota / private mode -> ignore */
    }
  }

  /** Persist the alert opt-in immediately — it is a deliberate click, not a debounced edit. */
  async function setNotify(value: boolean) {
    notify.value = value
    if (pushFn) await pushFn([...cards.value]).catch(() => {})
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
    pushFn = ids =>
      authFetch('/api/me/bankos-cards', {
        method: 'PUT',
        body: { cards: ids, notify: notify.value },
      })
    try {
      const remote = await authFetch<{ cards: string[]; notify?: boolean }>('/api/me/bankos-cards')
      const merged = mergeCardIds(cards.value, remote?.cards)
      cards.value = merged
      notify.value = !!remote?.notify
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
    notify,
    setNotify,
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
