// Passthrough cacheado de GET /combustibles del API público, con el baseline horneado si no
// responde: la página se renderiza en SSR con números siempre.
//
// Media hora de caché porque el precio lo fija un decreto mensual: ni el job ni el sitio ganan
// nada consultando más seguido, y el `staleMaxAge` de doce horas cubre un reinicio del backend
// sin que la página pierda el dato vivo y caiga al baseline.
import type { FuelResponse } from '../../utils/fuelPrices'
import { FUEL_FALLBACK } from '../utils/combustiblesFallback'

export default defineCachedEventHandler(
  async (): Promise<FuelResponse> => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<FuelResponse>(`${base}/combustibles`, { timeout: 12000 })
      // No alcanza con que no tire: un 200 flaco (sin precio vigente o sin histórico) se quedaría
      // media hora en caché y dejaría la página en guiones. La forma se valida antes de aceptarlo.
      return res?.latest?.super95 != null && Array.isArray(res.rows) && res.rows.length > 0
        ? res
        : FUEL_FALLBACK
    } catch {
      return FUEL_FALLBACK
    }
  },
  { maxAge: 60 * 30, staleMaxAge: 60 * 60 * 12, name: 'combustibles', getKey: () => 'combustibles' }
)
