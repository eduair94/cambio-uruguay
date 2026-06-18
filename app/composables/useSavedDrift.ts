import type { CurrencyCode } from '~/utils/currencyPages'

export interface SavedRateRef {
  label: string
  currency: CurrencyCode
  rateKind: 'bestBuy' | 'bestSell'
  value: number
}

export interface DriftResult {
  value: number | null // current rate
  pct: number | null // percentage change vs snapshot
}

/** Pure: percentage drift of `current` vs the snapshot `rate.value`. */
export function computeDrift(rate: SavedRateRef, current: number | null): DriftResult {
  if (current == null) return { value: null, pct: null }
  if (!rate.value) return { value: current, pct: null }
  return { value: current, pct: ((current - rate.value) / rate.value) * 100 }
}

/** Live drift using today's best rates from useExchangeRates. */
export function useSavedDrift() {
  const { bestBuy, bestSell } = useExchangeRates()
  const currentRate = (rate: SavedRateRef): number | null =>
    rate.rateKind === 'bestBuy' ? bestBuy(rate.currency) : bestSell(rate.currency)

  const driftForItem = (rates: SavedRateRef[]) =>
    rates.map(rate => ({ rate, ...computeDrift(rate, currentRate(rate)) }))

  return { driftForItem, currentRate }
}
