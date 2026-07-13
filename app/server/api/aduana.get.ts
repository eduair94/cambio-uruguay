// The customs guide, proxied from the backend and cached at the edge.
//
// Fallback in cascade: live backend -> whatever the cache still holds -> the embedded baseline. The
// page must never render an empty shell: somebody arrives here because a package is stuck, and a
// blank page is worse than a slightly stale one.
import { ADUANA_FALLBACK, type PublicAduanaPayload } from '../utils/aduanaFallback'

export default defineCachedEventHandler(
  async (): Promise<PublicAduanaPayload> => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<PublicAduanaPayload>(`${base}/aduana`, { timeout: 8000 })
      if (!res?.problems?.length) return ADUANA_FALLBACK
      return res
    } catch {
      return ADUANA_FALLBACK
    }
  },
  { maxAge: 60 * 30, name: 'aduana', getKey: () => 'all' }
)
