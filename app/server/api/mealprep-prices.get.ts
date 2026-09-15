// Los precios de los ingredientes del planificador de viandas, proyectados del
// catálogo del SIPC (`GET /precios/articles`, mediana nacional del día).
//
// Se proyecta acá y no en el navegador a propósito: el catálogo son 213
// artículos y la página necesita ~50 precios. La proyección es la función pura
// `priceIngredients` (testeada contra el catálogo real), así que esta ruta no
// tiene lógica propia — la lección de `basketProjection.ts`.
//
// Si el backend no contesta, devuelve los estimados fechados con `day: null`:
// la página renderiza igual y dice que ningún precio está medido.
import { estimatedPrices, priceIngredients } from '../../utils/mealprep/pricing'
import type { PriceMap } from '../../utils/mealprep/types'

export interface MealprepPricesResponse {
  day: string | null
  prices: PriceMap
}

export default defineCachedEventHandler(
  async (): Promise<MealprepPricesResponse> => {
    const base = useRuntimeConfig().apiBaseServer
    const catalogue = await $fetch<any>(`${base}/precios/articles`, { timeout: 9000 }).catch(
      () => null
    )
    const articles = Array.isArray(catalogue?.articles) ? catalogue.articles : []
    const day = typeof catalogue?.day === 'string' ? catalogue.day : null
    if (!articles.length || !day) return { day: null, prices: estimatedPrices() }
    return { day, prices: priceIngredients(articles, day) }
  },
  {
    // El job del SIPC corre una vez al día.
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 6,
    name: 'mealprep-prices',
    getKey: () => 'all',
  }
)
