import { toSeries } from '~/utils/dollarSeries'
import { computeMomentum, computeRecords, type Momentum, type Records } from '~/utils/rateStats'

/** Lazy BCU USD trend (momentum + records). Safe on the home critical path. */
export function useDollarTrend() {
  const { getEvolutionData } = useApiService()

  const { data, pending } = useLazyAsyncData(
    'dollar-trend-bcu-usd',
    async () => {
      const res = await getEvolutionData('bcu', 'USD', undefined, 6)
      const series = toSeries((res?.data as any)?.evolution)
      return series
    },
    { default: () => [] }
  )

  const momentum = computed<Momentum>(() => computeMomentum(data.value ?? []))
  const records = computed<Records>(() => computeRecords(data.value ?? []))
  return { momentum, records, pending }
}
