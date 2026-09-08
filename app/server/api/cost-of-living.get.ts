// Live cost-of-living model for the /herramientas/costo-de-vida tool, proxied from the backend
// (pm2 `currency-costs` generates the volatile figures daily) and applied to this app's
// COST_MODEL. Zero Gemini here: this route forwards, merges (applyCostOverrides — arithmetic, not
// AI) and falls back to the pure baseline when the backend is unreachable.
//
// The `inFlight` background-refresh dance is gone: the backend cron is the only refresher now,
// and a GET handler must not spend Gemini calls — it no longer even can, it has no key.
//
// Tres endpoints y no uno, porque las tres piezas viven en tres jobs distintos:
//   * `/cost-of-living`  (pm2 currency-costs)   — salario, boleto, alquileres
//   * `/uy-figures`      (pm2 currency-figures) — el IPC interanual, que es lo único que
//     permite reexpresar la línea de comida a precios de hoy en vez de servir el nivel de
//     diciembre
//   * `/precios/basket`  (pm2 currency-precios) — la canasta de góndola MEDIDA, que NO
//     reemplaza la línea de comida (el catálogo del SIPC no tiene leche, pan fresco ni
//     legumbres) sino que la acompaña para que sea auditable
//
// Cada uno falla por su cuenta: si el de precios se cae, el modelo sale igual.
import {
  applyCostOverrides,
  baselineCosts,
  type LiveCosts,
  type LiveCostsResponse,
} from '../utils/costsMerge'

export interface MeasuredBasket {
  day: string | null
  basketVersion: number | null
  basketItems: number | null
  qualifiedStores: number | null
  nationalRatio: number | null
}

export interface CostOfLivingPayload extends LiveCosts {
  basket: MeasuredBasket | null
}

export default defineCachedEventHandler(
  async (): Promise<CostOfLivingPayload> => {
    const base = useRuntimeConfig().apiBaseServer

    const [costs, figures, basket] = await Promise.all([
      $fetch<LiveCostsResponse>(`${base}/cost-of-living`, { timeout: 8000 }).catch(() => null),
      $fetch<{ inflacionAnual?: number }>(`${base}/uy-figures`, { timeout: 8000 }).catch(
        () => null
      ),
      $fetch<Record<string, unknown>>(`${base}/precios/basket`, { timeout: 8000 }).catch(
        () => null
      ),
    ])

    // El IPC se inyecta en el mismo sobre de cifras vivas: `applyCostOverrides` es
    // la única capa que toca COST_MODEL, y meterlo por otro lado crearía una
    // segunda aritmética sobre la misma tabla.
    //
    // El sobre se arma incluso cuando `/cost-of-living` no contesta: la línea de
    // comida sólo necesita el IPC, y si la caída de un endpoint la devolviera al
    // nivel de precios de diciembre, la página empeoraría en silencio.
    const hasInflation = typeof figures?.inflacionAnual === 'number'
    const merged: LiveCostsResponse | null =
      costs || hasInflation
        ? {
            figures: {
              ...(costs?.figures ?? {}),
              ...(hasInflation ? { inflacionAnual: figures!.inflacionAnual } : {}),
            },
            asOf: costs?.asOf ?? new Date().toISOString(),
            updated: [...(costs?.updated ?? []), ...(hasInflation ? ['inflacionAnual'] : [])],
            sources: costs?.sources ?? [],
          }
        : null

    const model = merged ? applyCostOverrides(merged) : baselineCosts()

    return {
      ...model,
      basket:
        basket && typeof basket.day === 'string'
          ? {
              day: basket.day,
              basketVersion: (basket.basketVersion as number) ?? null,
              basketItems: (basket.basketItems as number) ?? null,
              qualifiedStores: (basket.qualifiedStores as number) ?? null,
              nationalRatio: (basket.nationalRatio as number) ?? null,
            }
          : null,
    }
  },
  {
    maxAge: 60 * 60, // 1h
    staleMaxAge: 60 * 60 * 24 * 7,
    // Bumped from cost-of-living-v3: el payload ahora trae `food` y `basket`, y no conviene
    // servir entradas viejas con la forma anterior.
    name: 'cost-of-living-v4',
    getKey: () => 'live',
  }
)
