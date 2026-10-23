import type { EvolutionResponse } from '../types/api'

export interface ComparisonLoadResult {
  series: EvolutionResponse[]
  failedOrigins: string[]
  emptyOrigins: string[]
}

type FetchEvolution = (
  origin: string,
  currency: string
) => Promise<{ data: unknown; error: unknown }>

/** A failed request is unavailable information, never evidence of an empty history. */
export async function loadComparisonEvolutions(
  origins: readonly string[],
  currency: string,
  fetchEvolution: FetchEvolution
): Promise<ComparisonLoadResult> {
  const outcomes = await Promise.all(
    origins.map(async origin => {
      try {
        const response = await fetchEvolution(origin, currency)
        const data = response.data as Partial<EvolutionResponse> | null
        if (
          response.error ||
          !data ||
          data.origin !== origin ||
          data.code !== currency ||
          !Array.isArray(data.evolution)
        ) {
          return { origin, series: null }
        }
        return { origin, series: data as EvolutionResponse }
      } catch {
        return { origin, series: null }
      }
    })
  )

  const result: ComparisonLoadResult = { series: [], failedOrigins: [], emptyOrigins: [] }
  for (const outcome of outcomes) {
    if (!outcome.series) result.failedOrigins.push(outcome.origin)
    else if (outcome.series.evolution.length === 0) result.emptyOrigins.push(outcome.origin)
    else result.series.push(outcome.series)
  }
  return result
}
