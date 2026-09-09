// Las tasas que justifican el orden del plan de vida, en un sobre.
//
// Dos endpoints del backend, cada uno con su propio job y su propia cadencia:
//   * `/financing-rates` (pm2 currency-financing, SEMANAL, lunes 10:20 UTC) —
//     plazo fijo, fondo en pesos, inflación
//   * `/debt-relief` (pm2 currency-debt-relief, MENSUAL, día 1 a las 10:13 UTC)
//     — las tasas medias de usura del BCU
//
// Ninguna es diaria, y está bien: la grilla del BCU rige por ventana trimestral
// móvil y las tasas de referencia se mueven en semanas. Pero implica que el
// `asOf` de la deuda casi siempre va a tener semanas de antigüedad, así que la
// página muestra la fecha en vez de dar a entender que es de hoy.
//
// Cada uno falla por su cuenta: lo que no llega queda en null y la cascada
// declara qué comparación no pudo hacer, en vez de ordenar sin evidencia.
import { projectLifePlanRates } from '../utils/lifePlanRates'
import type { LifePlanRates } from '../../utils/lifePlan'

export default defineCachedEventHandler(
  async (): Promise<LifePlanRates> => {
    const base = useRuntimeConfig().apiBaseServer
    const [financing, debt] = await Promise.all([
      $fetch<unknown>(`${base}/financing-rates`, { timeout: 8000 }).catch(() => null),
      $fetch<unknown>(`${base}/debt-relief`, { timeout: 8000 }).catch(() => null),
    ])
    return projectLifePlanRates(financing, debt)
  },
  {
    // Una hora, aunque los jobs de origen corran semanal y mensual: el caché
    // corto no cuesta nada y evita servir un sobre viejo tras un refresco.
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'life-plan-rates',
    getKey: () => 'live',
  }
)
