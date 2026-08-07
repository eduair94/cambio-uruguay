// Classifies each *quote* by the channel a person needs in order to take it:
// an account at the institution (online) vs a counter you can walk up to
// without being a client (presencial). Powers the home page "online /
// presencial" filter and the operation column of the /casas-de-cambio table.
//
// The channel is a property of the ROW (origin + rate `type`), NOT of the
// origin. Banks publish two very different quotes under the same origin:
//
//   brou      type ''              -> pizarra de sucursal, anyone can walk in
//   brou      type 'EBROU'         -> only through eBROU, needs an account
//   santander type ''              -> mostrador
//   santander type 'TRANSFERENCIA' -> only for account holders
//
// Classifying by origin (as the first version did) hid three real walk-in
// quotes behind the "presencial" filter and could surface a counter quote
// under "online". See tests/unit/exchangeChannel.test.ts.
//
// PURE (no Vue/Nuxt imports) so it is unit-testable in plain Node and reusable
// from server code.

import { departmentsInclude } from './departments'

/** Kind of institution behind an origin. Mirrors `CasaReputation.category`. */
export type OriginCategory = 'casa' | 'banco' | 'fintech'

/** The two operating channels a quote can belong to. */
export type ExchangeChannel = 'online' | 'presencial'

/** UI filter value: `all` shows every quote regardless of channel. */
export type ExchangeChannelFilter = 'all' | ExchangeChannel

/**
 * Institution kind per origin. Anything absent is a walk-in casa de cambio, so
 * a new casa scraper needs no change here — only a new bank/fintech does.
 *
 * Kept as a small literal (rather than importing the 2 800-line
 * `casasDirectory` reputation dataset into the home-page bundle). The
 * `exchangeChannel` unit test asserts it stays in sync with
 * `CASAS_REPUTATION[].category`, so the two can never silently drift.
 */
export const ORIGIN_CATEGORY: Readonly<Record<string, OriginCategory>> = {
  brou: 'banco',
  itau: 'banco',
  bbva: 'banco',
  santander: 'banco',
  scotiabank: 'banco',
  oca: 'fintech',
  prex: 'fintech',
}

/**
 * Rate `type` values that can only be taken through the institution's digital
 * channel, which in turn requires holding an account there:
 * - `EBROU`   — BROU's online-only dollar (eBROU / app).
 * - `TRANSFERENCIA` — bank rate applied to an account-to-account operation
 *   (Itaú, Santander, Scotiabank, BBVA).
 *
 * `INTERBANCARIO` / `FONDO/CABLE` are wholesale references, not retail
 * channels; they are filtered out upstream as interbank rows.
 */
export const ACCOUNT_ONLY_TYPES: ReadonlySet<string> = new Set(['EBROU', 'TRANSFERENCIA'])

/**
 * Casas de cambio that let you actually *transact* online (not merely publish
 * a board), per their own service listing in `casasDirectory`:
 * - `cambio18`    — "cambio online por transferencia bancaria"
 * - `cambio_minas`— "operaciones por WhatsApp: servicio DolarBank"
 * - `fortex`      — "cotización y solicitud de cambio online" (pickup in branch)
 *
 * These stay in the `presencial` bucket because the filter's contract is
 * "do I need an account at this institution?" and none of them require one.
 * The set only drives an informational "también online" badge. Casas that just
 * quote over WhatsApp are deliberately excluded — quoting is not transacting.
 */
export const ONLINE_CAPABLE_CASAS: ReadonlySet<string> = new Set([
  'cambio18',
  'cambio_minas',
  'fortex',
])

/** Institution kind for a given origin; unknown origins are walk-in casas. */
export function categoryForOrigin(origin: string): OriginCategory {
  return ORIGIN_CATEGORY[origin] ?? 'casa'
}

/**
 * Channel a single quote belongs to.
 *
 * `online` means "you must hold an account at this institution to get this
 * price": every account-only rate type, plus every fintech quote (Prex and OCA
 * only price for their own cardholders). Everything else — including the
 * branch pizarra of a bank — is `presencial`: a counter anyone can use.
 */
export function channelForRate(origin: string, type?: string | null): ExchangeChannel {
  if (ACCOUNT_ONLY_TYPES.has(type ?? '')) return 'online'
  if (categoryForOrigin(origin) === 'fintech') return 'online'
  return 'presencial'
}

/**
 * True when a quote should be shown under the active filter. `all` always
 * passes; otherwise the quote's channel must equal the filter.
 */
export function matchesChannel(
  origin: string,
  type: string | null | undefined,
  filter: ExchangeChannelFilter
): boolean {
  return filter === 'all' || channelForRate(origin, type) === filter
}

/**
 * True when at least one of an origin's quotes survives the filter. Used to
 * decide whether a house stays selectable when the channel changes — an origin
 * like `brou` belongs to BOTH channels through different rate types.
 */
export function originHasChannel(
  origin: string,
  rows: ReadonlyArray<{ origin: string; type?: string | null }>,
  filter: ExchangeChannelFilter
): boolean {
  if (filter === 'all') return true
  return rows.some(r => r.origin === origin && matchesChannel(r.origin, r.type, filter))
}

/** True when a casa also sells online without requiring an account with it. */
export function isOnlineCapableCasa(origin: string): boolean {
  return ONLINE_CAPABLE_CASAS.has(origin)
}

/**
 * True when someone standing in `department` can actually take this quote.
 *
 * Reach follows the channel, not the branch list: an online quote is national
 * (eBROU, a bank transfer and the Prex app work the same from Rivera as from
 * Montevideo — Prex publishes no branches at all), while a counter quote needs
 * a branch in that department.
 *
 * Filtering purely on the branch list would hide every online provider the
 * moment a department is picked, which is the opposite of the truth.
 */
export function servesDepartment(
  origin: string,
  type: string | null | undefined,
  departments: readonly string[] | undefined | null,
  department: string
): boolean {
  if (channelForRate(origin, type) === 'online') return true
  return departmentsInclude(departments, department)
}

/** Narrow an arbitrary string to a valid filter value, defaulting to `all`. */
export function normalizeChannelFilter(value: unknown): ExchangeChannelFilter {
  return value === 'online' || value === 'presencial' ? value : 'all'
}

/** How a quote is operated, for the comparison table's "Operación" column. */
export type OperationKind = 'cash' | 'transfer' | 'app'

/**
 * Operation behind a quote: cash over a counter, a bank transfer between
 * accounts, or a fintech app balance. Drives the operation column and the
 * "requires an account" chip, so a `TRANSFERENCIA` price is never silently
 * compared against walk-in cash.
 */
export function operationForRate(origin: string, type?: string | null): OperationKind {
  const t = type ?? ''
  if (t === 'TRANSFERENCIA') return 'transfer'
  if (t === 'EBROU') return 'app'
  if (categoryForOrigin(origin) === 'fintech') return 'app'
  return 'cash'
}

/** True when taking this quote requires being a client of the institution. */
export function requiresAccount(origin: string, type?: string | null): boolean {
  return channelForRate(origin, type) === 'online'
}
