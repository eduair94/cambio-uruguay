import { onBeforeUnmount, watch } from 'vue'

/**
 * Refleja el estado de una tabla en la query string, para que un filtro se
 * pueda compartir y sobreviva a un recargar.
 *
 * Con `history.replaceState` y NO con `router.replace`: el scrollBehavior de
 * Nuxt, ante un cambio de query en la misma ruta, salta al ancla de la URL
 * (`#buscador`) o al tope de la página si el ancla desaparece — o sea, en cada
 * tecla del buscador. Se actualiza también `state.current`, que es lo que
 * vue-router vuelve a escribir en la entrada antes del próximo push: sin eso,
 * volver atrás desde otra página traería la URL sin filtros.
 */
export function usePreciosQuerySync(source: () => Record<string, string>, delayMs = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null

  const write = (query: Record<string, string>) => {
    const search = new URLSearchParams(query).toString()
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (next === current) return
    const state = window.history.state
    window.history.replaceState(
      state && typeof state === 'object' ? { ...state, current: next } : state,
      '',
      next
    )
  }

  watch(
    source,
    query => {
      if (!import.meta.client) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => write(query), delayMs)
    },
    { deep: true }
  )

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })
}
