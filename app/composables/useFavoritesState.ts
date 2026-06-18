// App-wide reactive set of "type:key" favorite ids, hydrated once after login.
const _set = reactive(new Set<string>())
let _hydrated = false

export function useFavoritesState() {
  return _set
}

export async function hydrateFavorites(authFetch: <T>(u: string, o?: any) => Promise<T>) {
  if (_hydrated) return
  _hydrated = true
  try {
    const list = await authFetch<Array<{ type: string; key: string }>>('/api/me/favorites')
    list.forEach(f => _set.add(`${f.type}:${f.key}`))
  } catch {
    _hydrated = false
  }
}

export function resetFavoritesState() {
  _set.clear()
  _hydrated = false
}
