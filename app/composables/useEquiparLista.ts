import {
  EQUIPAR_LISTA_MAX,
  equiparListaValida,
  type EquiparListaLine,
} from '~/utils/equiparProductos'

const STORAGE_KEY = 'cu_equipar_lista'

/**
 * The reader's list for /equipar-casa-uruguay: snapshots of the listings they picked, in the
 * browser only (same shape as usePropertySaleFavorites). Nothing here reaches a server: the list
 * is theirs, and "mi lista" is `noindex` for the same reason.
 *
 * `ready` flips after the first mount reads storage, so SSR renders the empty state and the client
 * fills it in without a hydration mismatch. Every storage access sits in a try/catch: private
 * browsing and a full quota must degrade to "the list forgets", never to a broken page.
 */
export function useEquiparLista() {
  const lines = useState<EquiparListaLine[]>('equipar-lista', () => [])
  const ready = useState('equipar-lista-ready', () => false)
  const limited = ref(false)
  const storageFailed = ref(false)

  onMounted(() => {
    if (ready.value) return
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(stored)) {
        const seen = new Set<string>()
        lines.value = stored
          .filter(equiparListaValida)
          .filter(line => (seen.has(line.listingId) ? false : (seen.add(line.listingId), true)))
          .slice(0, EQUIPAR_LISTA_MAX)
      }
    } catch {
      /* Private browsing and malformed local data must not block the directory. */
    }
    ready.value = true
  })

  function persist(next: EquiparListaLine[]) {
    lines.value = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      storageFailed.value = false
    } catch {
      storageFailed.value = true
    }
  }

  const has = (listingId: string) => lines.value.some(line => line.listingId === listingId)

  function add(line: EquiparListaLine) {
    if (has(line.listingId)) return
    limited.value = lines.value.length >= EQUIPAR_LISTA_MAX
    if (limited.value) return
    persist([...lines.value, line])
  }

  function remove(listingId: string) {
    persist(lines.value.filter(line => line.listingId !== listingId))
  }

  function toggle(line: EquiparListaLine) {
    if (has(line.listingId)) remove(line.listingId)
    else add(line)
  }

  /** Replaces lines wholesale (after a price refresh), keeping the reader's order. */
  function replace(next: EquiparListaLine[]) {
    persist(next.filter(equiparListaValida).slice(0, EQUIPAR_LISTA_MAX))
  }

  function clear() {
    persist([])
  }

  return { lines, ready, limited, storageFailed, has, add, remove, toggle, replace, clear }
}
