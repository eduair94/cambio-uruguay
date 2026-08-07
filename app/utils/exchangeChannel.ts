// Classifies each rate provider by the channel a person uses to operate with it:
// an online bank/fintech account vs a walk-in casa de cambio. Powers the home
// page "online / presencial" filter so someone who only changes money online
// isn't shown the tiny interior storefronts (and vice-versa).
//
// PURE (no Vue/Nuxt imports) so it is unit-testable in plain Node and reusable
// from server code.

/** The two operating channels a provider can belong to. */
export type ExchangeChannel = 'online' | 'presencial'

/** UI filter value: `all` shows every provider regardless of channel. */
export type ExchangeChannelFilter = 'all' | ExchangeChannel

/**
 * Origins whose USD/divisa operation happens through an online account rather
 * than at a counter: banks and fintechs that require you to hold an account at
 * the institution to transact (eBROU, Itaú, BBVA, Santander, Scotiabank, OCA,
 * PREX). Everything else in the market is a physical casa de cambio, so the
 * default classification is `presencial` — a new casa scraper needs no change
 * here to be treated correctly, only a new bank/fintech does.
 */
export const ONLINE_ORIGINS: ReadonlySet<string> = new Set([
  'brou',
  'itau',
  'bbva',
  'santander',
  'scotiabank',
  'oca',
  'prex',
])

/** Channel a given origin operates through. */
export function channelForOrigin(origin: string): ExchangeChannel {
  return ONLINE_ORIGINS.has(origin) ? 'online' : 'presencial'
}

/**
 * True when an origin should be shown under the active filter. `all` always
 * passes; otherwise the origin's channel must equal the filter.
 */
export function matchesChannel(origin: string, filter: ExchangeChannelFilter): boolean {
  return filter === 'all' || channelForOrigin(origin) === filter
}

/** Narrow an arbitrary string to a valid filter value, defaulting to `all`. */
export function normalizeChannelFilter(value: unknown): ExchangeChannelFilter {
  return value === 'online' || value === 'presencial' ? value : 'all'
}
