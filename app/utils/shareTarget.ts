import { normalizeSharePath } from './sharedLinks'

const ORIGIN = 'https://cambio-uruguay.com'

/** Old callers pass a canonical without filters. Preserve current filters when it is this page. */
export function currentSharePath(currentPath: string, explicitUrl?: string): string | null {
  if (!explicitUrl) return normalizeSharePath(currentPath)
  try {
    const explicit = new URL(explicitUrl, ORIGIN)
    if (explicit.origin !== ORIGIN) return null
    const current = new URL(currentPath, ORIGIN)
    if (explicit.pathname === current.pathname && !explicit.search) {
      return normalizeSharePath(currentPath)
    }
    return normalizeSharePath(`${explicit.pathname}${explicit.search}${explicit.hash}`)
  } catch {
    return null
  }
}
