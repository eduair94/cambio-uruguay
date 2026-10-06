/**
 * Whether Leaflet can still take this element as a map container.
 *
 * A map component imports Leaflet lazily, and by the time the import resolves the visitor may have
 * left the page: the ref is null ("Map container not found"), the element was detached, or another
 * init already owns it (Leaflet stamps `_leaflet_id`: "Map container is already initialized").
 * Each of those used to throw from an async mount hook nobody awaits.
 */
export function mapContainerAvailable(
  element: unknown
): element is HTMLElement & { _leaflet_id?: number } {
  if (!element || typeof element !== 'object') return false
  const candidate = element as { isConnected?: unknown; _leaflet_id?: unknown }
  return candidate.isConnected === true && candidate._leaflet_id == null
}
