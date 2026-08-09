import { defineStore } from 'pinia'
import {
  DEFAULT_WATCHLIST,
  MAX_CARDS,
  MAX_ORIGINS,
  WATCHLIST_SNAPSHOT_KEY,
  WATCHLIST_STORAGE_KEY,
  isConfigured,
  mergeWatchlists,
  sanitizeWatchlist,
  type WatchDirection,
  type Watchlist,
  type WatchZone,
} from '~/utils/watchlist'
import {
  sanitizeStoredSnapshot,
  shouldRefreshSnapshot,
  takeSnapshot,
  type BoardRow,
  type StoredSnapshot,
  type WatchSnapshot,
} from '~/utils/watchlistBoard'

type AuthFetch = <T>(url: string, opts?: any) => Promise<T>

/**
 * The personal watchlist behind `/mi-lista`.
 *
 * Anonymous users get a localStorage-backed list — no login anywhere in the
 * flow, which is the point: the people this serves (interior, a single city, a
 * barrio) should not have to open an account to keep their own shortlist. When
 * a session does exist the list is merged with the account copy and debounced
 * back to `/api/me/watchlist`, exactly as `stores/importCart.ts` does.
 *
 * All the rules live in `utils/watchlist` + `utils/watchlistBoard` (pure and
 * unit-tested); this store is only the Vue/localStorage wiring.
 */
export const useWatchlistStore = defineStore('watchlist', () => {
  const list = ref<Watchlist>({ ...DEFAULT_WATCHLIST })
  const loggedIn = ref(false)
  /** Prices frozen on a previous visit — the baseline for the drift column. */
  const baseline = ref<WatchSnapshot>({})

  let storedSnapshot: StoredSnapshot | null = null
  let pushFn: ((w: Watchlist) => Promise<unknown>) | null = null
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  let localLoaded = false

  const configured = computed(() => isConfigured(list.value))

  /** Hydrate from localStorage (anonymous). Idempotent, client-only. */
  function loadLocal() {
    if (localLoaded || !import.meta.client) return
    localLoaded = true
    try {
      const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY)
      if (raw) list.value = sanitizeWatchlist(JSON.parse(raw))
    } catch {
      /* corrupt storage -> start from the defaults */
    }
    try {
      const rawSnap = window.localStorage.getItem(WATCHLIST_SNAPSHOT_KEY)
      storedSnapshot = rawSnap ? sanitizeStoredSnapshot(JSON.parse(rawSnap)) : null
      baseline.value = storedSnapshot?.prices ?? {}
    } catch {
      storedSnapshot = null
    }
  }

  function persistLocal() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list.value))
    } catch {
      /* quota / private mode -> the in-memory list still works this session */
    }
  }

  function schedulePush() {
    if (!loggedIn.value || !pushFn) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushFn?.(list.value).catch(() => {})
    }, 800)
  }

  watch(
    list,
    () => {
      persistLocal()
      schedulePush()
    },
    { deep: true }
  )

  // --- mutations -----------------------------------------------------------
  function setZone(zone: WatchZone | null) {
    list.value = sanitizeWatchlist({ ...list.value, zone })
  }

  function toggleOrigin(origin: string) {
    const origins = list.value.origins.includes(origin)
      ? list.value.origins.filter(o => o !== origin)
      : [...list.value.origins, origin].slice(0, MAX_ORIGINS)
    list.value = { ...list.value, origins }
  }

  function setOrigins(origins: string[]) {
    list.value = sanitizeWatchlist({ ...list.value, origins })
  }

  function toggleCard(id: string) {
    const cards = list.value.cards.includes(id)
      ? list.value.cards.filter(c => c !== id)
      : [...list.value.cards, id].slice(0, MAX_CARDS)
    list.value = { ...list.value, cards }
  }

  function setCurrencies(currencies: string[]) {
    list.value = sanitizeWatchlist({ ...list.value, currencies })
  }

  function setDirection(direction: WatchDirection) {
    list.value = { ...list.value, direction }
  }

  function setAmount(amountUsd: number) {
    list.value = sanitizeWatchlist({ ...list.value, amountUsd })
  }

  /** Adopt a list that arrived through a `?l=` share link. */
  function replace(next: Watchlist) {
    list.value = sanitizeWatchlist(next)
  }

  function reset() {
    list.value = { ...DEFAULT_WATCHLIST }
    if (import.meta.client) {
      try {
        window.localStorage.removeItem(WATCHLIST_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
  }

  // --- drift ---------------------------------------------------------------
  /**
   * Freeze today's prices as the next visit's baseline, but only once the
   * stored one has aged out — otherwise a reload would wipe the very deltas the
   * board exists to show.
   */
  function commitSnapshot(rows: readonly BoardRow[]) {
    if (!import.meta.client || !rows.length) return
    const now = Date.now()
    if (!shouldRefreshSnapshot(storedSnapshot, now)) return
    const next: StoredSnapshot = { at: now, prices: takeSnapshot(rows) }
    storedSnapshot = next
    try {
      window.localStorage.setItem(WATCHLIST_SNAPSHOT_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  // --- account sync --------------------------------------------------------
  /** On login: merge the local and account lists, adopt the result, push it back. */
  async function hydrateFromAccount(authFetch: AuthFetch) {
    loadLocal()
    loggedIn.value = true
    pushFn = w => authFetch('/api/me/watchlist', { method: 'PUT', body: w })
    try {
      const remote = await authFetch<unknown>('/api/me/watchlist')
      const merged = mergeWatchlists(list.value, remote)
      list.value = merged
      await pushFn(merged)
    } catch {
      /* offline / not configured -> keep the local list */
    }
  }

  /** On logout: stop syncing; the local list stays for the anonymous session. */
  function onLogout() {
    loggedIn.value = false
    pushFn = null
    if (pushTimer) clearTimeout(pushTimer)
  }

  return {
    list,
    baseline,
    loggedIn,
    configured,
    loadLocal,
    setZone,
    toggleOrigin,
    setOrigins,
    toggleCard,
    setCurrencies,
    setDirection,
    setAmount,
    replace,
    reset,
    commitSnapshot,
    hydrateFromAccount,
    onLogout,
  }
})
