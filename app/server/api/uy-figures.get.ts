// Uruguay's key national figures, proxied from the backend (pm2 `currency-figures` generates
// them daily) and cached at the edge. Zero business logic, zero Gemini: this route only forwards
// and falls back to the verified baseline when the backend is unreachable.
import { UY_FIGURES_FALLBACK, type UyFigures } from '../utils/uyFiguresFallback'

export default defineCachedEventHandler(
  async (): Promise<UyFigures> => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<UyFigures>(`${base}/uy-figures`, { timeout: 8000 })
      return res?.salarioMinimo ? res : UY_FIGURES_FALLBACK
    } catch {
      return UY_FIGURES_FALLBACK
    }
  },
  {
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24 * 7,
    // Bumped from uy-figures-v1: the old cached payloads (fs useStorage-backed) are still live
    // and this proxy's shape/source changed enough to not trust stale entries under the old key.
    name: 'uy-figures-v2',
    getKey: () => 'live',
  }
)
