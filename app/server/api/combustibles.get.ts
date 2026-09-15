// Passthrough cacheado de GET /combustibles del API público, con el baseline horneado si no
// responde: la página se renderiza en SSR con números siempre.
//
// Media hora de caché porque el precio lo fija un decreto mensual: ni el job ni el sitio ganan
// nada consultando más seguido, y el `staleMaxAge` de doce horas cubre un reinicio del backend
// sin que la página pierda el dato vivo y caiga al baseline.
import type { FuelResponse } from '../../utils/fuelPrices'
import { FUEL_FALLBACK } from '../utils/combustiblesFallback'

export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer
    return $fetch<FuelResponse>(`${base}/combustibles`, { timeout: 12000 }).catch(
      () => FUEL_FALLBACK
    )
  },
  { maxAge: 60 * 30, staleMaxAge: 60 * 60 * 12, name: 'combustibles', getKey: () => 'combustibles' }
)
