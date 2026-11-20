import {
  DEFAULT_LIST_MODE,
  LIST_MODE_STORAGE_KEY,
  normalizeListMode,
  type ListMode,
} from '~/utils/infiniteFeed'

// Una sola preferencia para todos los directorios: quien eligió "cargar más al bajar" en
// alquileres lo espera también en autos. Estado de módulo como `useThemeMode`: el servidor
// nunca la escribe (siempre pinta la paginación) y en el cliente es una sola por pestaña.
const mode = ref<ListMode>(DEFAULT_LIST_MODE)
const loaded = ref(false)

/**
 * Paginación numerada o scroll infinito, recordado en `localStorage`.
 *
 * `load()` se llama recién en el cliente (al montar, o en el `setup` de una navegación que no
 * hidrata): el HTML del servidor es siempre el de la paginación, así no hay desajuste de
 * hidratación. Hasta que cargó, `set()` no escribe nada: los controles de Vuetify emiten su
 * valor al montar y, sin esa guarda, el interruptor pisaría lo guardado con el defecto.
 */
export function useListMode() {
  const track = useTrack()

  function load() {
    if (!import.meta.client || loaded.value) return
    loaded.value = true
    try {
      mode.value = normalizeListMode(window.localStorage.getItem(LIST_MODE_STORAGE_KEY))
    } catch {
      // Modo privado o almacenamiento bloqueado: se queda el defecto.
    }
  }

  function set(next: ListMode, feed: string) {
    if (!import.meta.client || !loaded.value || next === mode.value) return
    mode.value = next
    try {
      window.localStorage.setItem(LIST_MODE_STORAGE_KEY, next)
    } catch {
      // La preferencia se pierde al recargar; la página sigue andando.
    }
    track('list_mode', { feed, mode: next })
  }

  return { mode: readonly(mode), loaded: readonly(loaded), load, set }
}
