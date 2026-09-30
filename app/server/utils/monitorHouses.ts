// Las casas del monitor de competencia. `counterOnly` (el selector): sólo las que hoy publican
// precio de mostrador. Sin él (validar un guardado): todas las que conoce la API, para que una casa
// que hoy no publicó no invalide una configuración ya hecha. Tira si `/localData` no contesta; si
// no contesta `/` (antes del primer sync del día), el selector no filtra. `keep`: las casas ya
// guardadas en el monitor, que el selector ofrece siempre.
import { counterHouses } from '../../utils/competitorMonitor'

export async function loadMonitorHouses(
  opts: { counterOnly?: boolean; keep?: readonly string[] } = {}
): Promise<{ id: string; name: string }[]> {
  const baseURL = useRuntimeConfig().apiBaseServer
  const local = await $fetch<Record<string, { name?: string }>>('/localData', {
    baseURL,
    timeout: 8000,
  })
  if (!opts.counterOnly) return counterHouses(local, [])
  const rows = await $fetch<unknown>('/', { baseURL, timeout: 8000 }).catch(() => [])
  return counterHouses(local, Array.isArray(rows) ? rows : [], opts.keep)
}
