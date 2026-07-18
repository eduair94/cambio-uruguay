// Quarterly AI analysis for /mapa-de-temas, proxied from the backend (pm2 `currency-temas-analysis`
// regenerates it every 90 days). Zero Gemini here: this route forwards and falls back to an empty
// analysis when the backend is unreachable — the page then renders from live demand alone.
import { emptyTemasAnalysis, type TemasAnalysis } from '../../utils/temasAnalysis'

export default defineCachedEventHandler(
  async (): Promise<TemasAnalysis> => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<TemasAnalysis>(`${base}/temas-analysis`, { timeout: 8000 })
      return res && Array.isArray(res.overview) ? res : emptyTemasAnalysis()
    } catch {
      return emptyTemasAnalysis()
    }
  },
  {
    maxAge: 60 * 60, // 1h — the underlying data only changes every 90 days
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'temas-analysis-v1',
    getKey: () => 'live',
  }
)
