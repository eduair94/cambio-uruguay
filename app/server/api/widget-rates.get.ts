// Las cotizaciones del widget embebible (/widget): mejor precio del mercado y pizarra del BROU de
// las cuatro monedas que ofrece, resueltas juntas en UNA clave de caché de 10 minutos. Cada iframe
// pide su combinación de monedas y fuente, pero todos leen esta misma respuesta: mil sitios con el
// widget no son mil lecturas de la API. Las reglas viven en utils/widgetRates.ts.
import type { ExchangeRate } from '../../types/api'
import { buildWidgetRates, type WidgetRatesPayload } from '../../utils/widgetRates'

export default defineCachedEventHandler(
  async (): Promise<WidgetRatesPayload> => {
    const apiBase = useRuntimeConfig().public.apiBase as string
    const rates = await $fetch<ExchangeRate[]>('/', {
      baseURL: apiBase,
      timeout: 2500,
      retry: 0,
    }).catch(() => [] as ExchangeRate[])
    return buildWidgetRates(rates)
  },
  { maxAge: 60 * 10, staleMaxAge: 60 * 60, name: 'widget-rates', getKey: () => 'all' }
)
