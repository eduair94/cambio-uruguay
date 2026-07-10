// Canonicalization for /historico/[origin]/[currency]/[[type]].
//
// A casa quotes the same currency several ways. BILLETE, CABLE, TRANSFERENCIA and
// INTERBANCARIO are alternate views of the same page and fold into the base
// /historico/{origin}/{currency}, so Google consolidates their signals instead of
// splitting them across near-duplicates.
//
// eBROU is the exception: it is a distinct product with its own rate, and
// /historico/brou/usd/ebrou earns 10,717 impressions of its own. It stays
// self-canonical.
//
// PURE (no Vue/Nuxt runtime) so it is unit-testable in plain Node.

/** Type segments that are their own page, not a duplicate view of the base. */
export const SELF_CANONICAL_HISTORY_TYPES: ReadonlySet<string> = new Set(['ebrou'])

/**
 * The canonical path for a history detail route.
 *
 * @param origin the casa id, e.g. `'brou'`.
 * @param currency the currency segment as routed, e.g. `'usd'`.
 * @param type the optional `[[type]]` segment as it appeared in the URL.
 * @returns the base path for a duplicate view, or the self path (preserving the
 *   segment's original case, so the canonical equals the URL actually visited).
 */
export function historyDetailCanonicalPath(
  origin: string,
  currency: string,
  type?: string | null
): string {
  const base = `/historico/${origin}/${currency}`
  const raw = String(type ?? '').trim()
  if (!raw) return base
  return SELF_CANONICAL_HISTORY_TYPES.has(raw.toLowerCase()) ? `${base}/${raw}` : base
}
