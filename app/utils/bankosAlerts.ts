// Pure logic for the "new discount" push alerts on /descuentos-con-tarjeta-uruguay.
// No Vue, no I/O, no Firebase — the scheduled task (server/tasks/bankos/alerts.ts) supplies the
// catalog, the stored state and the sender, so every decision here is unit-testable.

/** Stable identity of one discount: an issuer discounting a brand. */
export function discountPairKey(bankId: string, brandId: string): string {
  return `${bankId}::${brandId}`
}

export function parsePairKey(key: string): { bankId: string; brandId: string } | null {
  const i = key.indexOf('::')
  if (i <= 0) return null
  return { bankId: key.slice(0, i), brandId: key.slice(i + 2) }
}

/** Every (bank, brand) discount currently in the catalog. */
export function currentPairs(bankBrands: Record<string, Record<string, unknown>>): string[] {
  const out: string[] = []
  for (const [bankId, brands] of Object.entries(bankBrands ?? {})) {
    for (const brandId of Object.keys(brands ?? {})) out.push(discountPairKey(bankId, brandId))
  }
  return out
}

/** Pairs present now that were not in `seen`. Order-independent. */
export function newPairs(current: string[], seen: string[]): string[] {
  const known = new Set(seen)
  return current.filter(p => !known.has(p))
}

export interface BankNews {
  bankId: string
  brandIds: string[]
}

/** Group fresh pairs by issuer, so one user gets one message per issuer at most. */
export function groupByBank(pairs: string[]): BankNews[] {
  const byBank = new Map<string, string[]>()
  for (const p of pairs) {
    const parsed = parsePairKey(p)
    if (!parsed) continue
    if (!byBank.has(parsed.bankId)) byBank.set(parsed.bankId, [])
    byBank.get(parsed.bankId)!.push(parsed.brandId)
  }
  return [...byBank.entries()]
    .map(([bankId, brandIds]) => ({ bankId, brandIds: brandIds.sort() }))
    .sort((a, b) => b.brandIds.length - a.brandIds.length || a.bankId.localeCompare(b.bankId))
}

/**
 * What one subscriber should be told, given the issuers THEY carry.
 *
 * Returns null when nothing they hold changed — the task must never send an empty push.
 */
export function notificationFor(
  news: BankNews[],
  userBankIds: string[],
  bankName: (bankId: string) => string,
  brandName: (brandId: string) => string,
  maxBrandsInBody = 3
): { title: string; body: string } | null {
  const mine = news.filter(n => userBankIds.includes(n.bankId) && n.brandIds.length > 0)
  if (!mine.length) return null

  const total = mine.reduce((n, x) => n + x.brandIds.length, 0)
  const banks = mine.map(m => bankName(m.bankId))
  const bankList =
    banks.length === 1
      ? banks[0]!
      : `${banks.slice(0, -1).join(', ')} y ${banks[banks.length - 1]!}`

  const names = mine.flatMap(m => m.brandIds.map(brandName)).filter(Boolean)
  const shown = names.slice(0, maxBrandsInBody)
  const rest = names.length - shown.length
  const tail = rest > 0 ? ` y ${rest} más` : ''

  return {
    title:
      total === 1
        ? `Nuevo descuento con ${bankList}`
        : `${total} descuentos nuevos con ${bankList}`,
    body: shown.length ? `${shown.join(', ')}${tail}.` : 'Abrí el mapa para verlos.',
  }
}

/**
 * Cap how much state we keep: the seen set is a dedupe ledger, not an archive. The catalog holds
 * ~1.8k pairs, so this bound is generous and still stops unbounded growth if the feed churns ids.
 */
export const MAX_SEEN_PAIRS = 20_000

export function trimSeen(pairs: string[]): string[] {
  const unique = [...new Set(pairs)]
  return unique.length > MAX_SEEN_PAIRS ? unique.slice(unique.length - MAX_SEEN_PAIRS) : unique
}
