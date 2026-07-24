import type {
  PreferentialRateBand,
  PreferentialRateProvider,
  PreferentialRateSnapshot,
  PreferentialRatesCatalog,
} from '../types/api'

export interface AppliedPreferentialRate extends PreferentialRateBand {
  provider: string
  displayName: string
  source: string
  requiresAuthentication: boolean
  scrapedAt: string
  publishedBuy: number
  publishedSell: number
}

export interface PreferentialExchangeItem {
  origin: string
  code: string
  buy: number
  sell: number
  condition?: string
  preferentialRate?: AppliedPreferentialRate
}

const snapshotForDate = (
  provider: PreferentialRateProvider,
  date: string
): PreferentialRateSnapshot | null => {
  if (provider.current?.date === date) return provider.current
  return provider.history.find(snapshot => snapshot.date === date) ?? null
}

export const selectPreferentialRate = (
  rates: PreferentialRateBand[],
  currency: string,
  amount: number
): PreferentialRateBand | null => {
  const normalizedCurrency = currency.trim().toUpperCase()
  return (
    rates.find(
      rate =>
        rate.currency === normalizedCurrency &&
        amount >= rate.minAmount &&
        (rate.maxAmount === null || amount < rate.maxAmount)
    ) ?? null
  )
}

/**
 * Applies amount bands without provider-specific branches. A provider joins the
 * comparison by exposing the shared catalog contract and using the same id as
 * its public exchange-rate `origin`.
 */
export function applyPreferentialRates<T extends PreferentialExchangeItem>(
  rows: T[],
  catalog: PreferentialRatesCatalog | null | undefined,
  date: string,
  currency: string,
  amount: number,
  quoteCurrency = 'UYU'
): T[] {
  if (
    !catalog?.providers?.length ||
    !date ||
    quoteCurrency !== 'UYU' ||
    currency === 'UYU' ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return rows.map(row => ({ ...row, preferentialRate: undefined }))
  }

  const providerRates = new Map<string, AppliedPreferentialRate>()
  for (const provider of catalog.providers) {
    const snapshot = snapshotForDate(provider, date)
    if (!snapshot) continue
    const band = selectPreferentialRate(snapshot.rates, currency, amount)
    if (!band) continue

    providerRates.set(provider.provider, {
      ...band,
      provider: provider.provider,
      displayName: provider.displayName,
      source: provider.source,
      requiresAuthentication: provider.requiresAuthentication,
      scrapedAt: snapshot.scrapedAt,
      publishedBuy: 0,
      publishedSell: 0,
    })
  }

  return rows.map(row => {
    const selected = providerRates.get(row.origin)
    if (!selected || row.code !== currency || row.buy <= 0 || row.sell <= 0) {
      return { ...row, preferentialRate: undefined }
    }
    const preferentialRate = {
      ...selected,
      publishedBuy: row.buy,
      publishedSell: row.sell,
    }
    return {
      ...row,
      buy: selected.buy,
      sell: selected.sell,
      condition: 'preferentialRates.condition',
      preferentialRate,
    }
  })
}
