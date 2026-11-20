/**
 * Escribe la query de la página actual en la URL sin navegar.
 *
 * Para el estado de un formulario que se refleja en la URL (el conversor de la home) para poder
 * compartirlo. Con `router.push({ query })` cada toque cambiaba `currentRoute`: se recalculaba
 * cada `RouterLink` de la página (~200 en la home), corrían los hooks de ruta de Nuxt y quedaba
 * una entrada de historial por monto probado — medido el 2026-11-19 a 4x de CPU, un toque en un
 * monto rápido costaba 1.072 ms y `history.length` crecía en uno por toque.
 *
 * Copia lo que hace `usePreciosQuerySync`: `history.replaceState` actualizando también
 * `state.current`, que es lo que vue-router vuelve a escribir en la entrada antes del próximo
 * push; sin eso, volver atrás desde otra página traería la URL vieja.
 *
 * La query REEMPLAZA a la de la URL, igual que `router.push({ query })`: las claves `undefined`
 * se omiten. Devuelve si escribió algo; con la URL igual no toca el historial.
 */
export function replaceQueryInPlace(query: Record<string, string | null | undefined>): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.append(name, value)
  }
  const search = params.toString()
  const { pathname, hash } = window.location
  const next = `${pathname}${search ? `?${search}` : ''}${hash}`
  const current = `${pathname}${window.location.search}${hash}`
  if (next === current) return false
  const state = window.history.state
  window.history.replaceState(
    state && typeof state === 'object' ? { ...state, current: next } : state,
    '',
    next
  )
  return true
}
