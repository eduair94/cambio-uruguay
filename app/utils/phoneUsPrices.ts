// app/utils/phoneUsPrices.ts
//
// US list prices (WITHOUT sales tax) for the current iPhone lineup, used by the "¿me conviene
// traerlo de EE.UU.?" calculator (see `./phoneImport.ts`). These are Apple's own US storefront
// prices — the number a private buyer actually pays at an Apple Store or apple.com/us — not a
// Uruguayan reseller's price and not an average.
//
// Source: https://www.apple.com/shop/buy-iphone, read by hand on 2026-09-16 20:30 UTC.
// Keys follow the same brand-family-storage convention `classes/phones/identify.ts` produces
// for the celulares catalogue (storage spelled `256gb`/`1tb`/`2tb`, never `1024gb`), so a future
// page can join this table against that catalogue by key without re-deriving it.
//
// This table is a manually maintained snapshot, NOT synced automatically from Apple: it does not
// move when a UY reseller changes its price, and it goes stale the moment Apple changes a US list
// price (a new lineup launch, or a mid-cycle price change on an existing model). Re-read
// apple.com/shop/buy-iphone by hand when that happens and bump PHONE_US_PRICES_VERIFIED_AT.
export const PHONE_US_PRICES_VERIFIED_AT = '2026-09-16'
export const PHONE_US_PRICES_SOURCE = 'https://www.apple.com/shop/buy-iphone'

/** US list price in USD, WITHOUT sales tax, keyed by phone model key (see file header). */
export const PHONE_US_PRICES: Readonly<Record<string, number>> = Object.freeze({
  'apple-iphone-18-pro-256gb': 1199,
  'apple-iphone-18-pro-512gb': 1399,
  'apple-iphone-18-pro-1tb': 1799,
  'apple-iphone-18-pro-2tb': 2399,
  'apple-iphone-18-pro-max-256gb': 1299,
  'apple-iphone-18-pro-max-512gb': 1499,
  'apple-iphone-18-pro-max-1tb': 1899,
  'apple-iphone-18-pro-max-2tb': 2499,
  'apple-iphone-air-256gb': 1099,
  'apple-iphone-air-512gb': 1299,
  'apple-iphone-air-1tb': 1699,
  'apple-iphone-17-256gb': 899,
  'apple-iphone-17-512gb': 1099,
  'apple-iphone-17e-256gb': 699,
  'apple-iphone-17e-512gb': 899,
  'apple-iphone-16-128gb': 799,
})

/** A US sales-tax scenario the reader can pick — the state/county the phone is bought in. */
export interface PhoneUsSalesTaxOption {
  id: string
  label: string
  /** Percentage rate applied on top of `PHONE_US_PRICES`. */
  pct: number
  source: string | null
}

/**
 * US sales-tax scenarios offered by the calculator. Not exhaustive — sales tax is set per state
 * (and, in Florida, per county on top as a "discretionary surtax") — just the two ends a reader
 * actually needs to compare: the rate at the Miami-Dade Apple Store most Uruguayan buyers visit
 * (Dolphin Mall / Aventura / Brickell City Centre are all Miami-Dade County), and 0% for the
 * handful of US states with no sales tax at all (Oregon, Montana, New Hampshire, Delaware,
 * Alaska — none of them a realistic Apple-Store stop for a Uruguayan traveler, but the honest
 * floor of the range).
 */
export const PHONE_US_SALES_TAX: readonly PhoneUsSalesTaxOption[] = [
  {
    id: 'miami-dade',
    label: 'Florida, Miami-Dade (7 %)',
    pct: 7,
    source: 'https://floridarevenue.com/taxes/taxesfees/Pages/discretionary.aspx',
  },
  { id: 'sin-impuesto', label: 'Estado sin impuesto de venta (0 %)', pct: 0, source: null },
] as const
