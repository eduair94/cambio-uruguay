import { defineStore } from 'pinia'
import type { CartItem, CartSettings } from '~/utils/importCart'
import {
  CART_STORAGE_KEY,
  DEFAULT_CART_SETTINGS,
  mergeCarts,
  sanitizeStoredCart,
  type StoredCart,
} from '~/utils/cartMerge'

type AuthFetch = <T>(url: string, opts?: any) => Promise<T>

/**
 * Reactive import-cart state for `/herramientas/carrito-importacion`.
 *
 * Anonymous users get a localStorage-backed cart; on login the local cart is
 * merged into the account cart (see {@link mergeCarts}) and changes are debounced
 * back to `/api/me/cart`. Pure (de)serialization + merge logic lives in
 * `utils/cartMerge` and is unit-tested there; this store is the Vue wiring.
 */
export const useImportCartStore = defineStore('importCart', () => {
  const items = ref<CartItem[]>([])
  const settings = reactive<CartSettings>({ ...DEFAULT_CART_SETTINGS })
  const loggedIn = ref(false)

  let pushFn: ((cart: StoredCart) => Promise<unknown>) | null = null
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  let localLoaded = false

  const snapshot = (): StoredCart => ({ items: [...items.value], settings: { ...settings } })

  function applyStored(cart: StoredCart) {
    items.value = cart.items
    Object.assign(settings, DEFAULT_CART_SETTINGS, cart.settings)
  }

  /** Hydrate from localStorage (anonymous). Idempotent, client-only. */
  function loadLocal() {
    if (localLoaded || !import.meta.client) return
    localLoaded = true
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      if (raw) applyStored(sanitizeStoredCart(JSON.parse(raw)))
    } catch {
      /* corrupt storage -> start empty */
    }
  }

  function persistLocal() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(snapshot()))
    } catch {
      /* quota / private mode -> ignore */
    }
  }

  function schedulePush() {
    if (!loggedIn.value || !pushFn) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushFn?.(snapshot()).catch(() => {})
    }, 800)
  }

  watch(
    [items, settings],
    () => {
      persistLocal()
      schedulePush()
    },
    { deep: true }
  )

  // --- mutations -----------------------------------------------------------
  function addItem(item: CartItem) {
    const idx = items.value.findIndex(x => x.id === item.id)
    if (idx >= 0) items.value.splice(idx, 1, item)
    else items.value.push(item)
  }
  function updateItem(id: string, patch: Partial<CartItem>) {
    const idx = items.value.findIndex(x => x.id === id)
    if (idx >= 0) items.value.splice(idx, 1, { ...items.value[idx]!, ...patch })
  }
  function removeItem(id: string) {
    items.value = items.value.filter(x => x.id !== id)
  }
  function clear() {
    items.value = []
  }

  // --- account sync --------------------------------------------------------
  /** On login: merge local + account carts, adopt the result, push it back. */
  async function hydrateFromAccount(authFetch: AuthFetch) {
    loadLocal()
    loggedIn.value = true
    pushFn = cart => authFetch('/api/me/cart', { method: 'PUT', body: cart })
    try {
      const remote = sanitizeStoredCart(await authFetch<unknown>('/api/me/cart'))
      const merged = mergeCarts(snapshot(), remote)
      applyStored(merged)
      await pushFn(merged)
    } catch {
      /* offline / not configured -> keep local cart */
    }
  }

  /** On logout: stop syncing; keep the local cart for the anonymous session. */
  function onLogout() {
    loggedIn.value = false
    pushFn = null
    if (pushTimer) clearTimeout(pushTimer)
  }

  return {
    items,
    settings,
    loggedIn,
    loadLocal,
    addItem,
    updateItem,
    removeItem,
    clear,
    hydrateFromAccount,
    onLogout,
  }
})
