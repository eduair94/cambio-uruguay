import { toSeries } from '~/utils/dollarSeries'
import { computeMomentum, computeRecords, type Momentum, type Records } from '~/utils/rateStats'

/** Lazy BCU USD trend (momentum + records). Safe on the home critical path. */
export function useDollarTrend() {
  const { getEvolutionData } = useApiService()

  const { data, pending, execute } = useLazyAsyncData(
    'dollar-trend-bcu-usd',
    async () => {
      // BILLETE (cash USD) gives exactly one quote per day; the untyped feed
      // returns several types per date, which made the day-over-day momentum and
      // sparkline compare same-day quotes instead of consecutive days.
      const res = await getEvolutionData('bcu', 'USD', 'BILLETE', 6)
      const series = toSeries((res?.data as any)?.evolution)
      return series
    },
    { default: () => [] }
  )

  // useLazyAsyncData does not auto-run when first registered after hydration —
  // e.g. inside <ClientOnly> on the home page — so the handler never fired and
  // the trend stayed empty. Kick it off on mount when no data has loaded yet,
  // which is a no-op on the trend pages where the auto path already ran.
  if (import.meta.client) {
    onMounted(() => {
      if (!data.value?.length) execute()
    })
  }

  const momentum = computed<Momentum>(() => computeMomentum(data.value ?? []))
  const records = computed<Records>(() => computeRecords(data.value ?? []))
  return { momentum, records, pending }
}
