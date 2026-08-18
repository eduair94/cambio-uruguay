// GET /api/bankos/discounts?banks=itau,brou
// Returns the discount-stores for the chosen banks — live from Bankos, or the backend snapshot if
// Bankos is down. All the heavy lifting (fetch, cache, fallback, flatten) is in server/utils/bankos.
import { getRawCatalog, flattenForBanks, brandCountForBanks } from '../../utils/bankos'
import { BANKOS_BANKS, type BankosDiscountsResponse } from '../../../utils/bankos'

const VALID = new Set(BANKOS_BANKS.map(b => b.id))

export default defineEventHandler(async (event): Promise<BankosDiscountsResponse> => {
  const q = getQuery(event)
  const raw = String(q.banks ?? '').trim()
  const banks = [
    ...new Set(
      raw
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(b => VALID.has(b))
    ),
  ]

  // No card selected yet: don't wake the (cold-starting) upstream just to return nothing.
  if (banks.length === 0) {
    return {
      source: 'cache',
      generatedAt: null,
      banks: [],
      brandsCount: 0,
      locationsCount: 0,
      items: [],
    }
  }

  const { catalog, source } = await getRawCatalog()
  const items = flattenForBanks(catalog.data, banks)

  // 30 min at the edge — matches the in-process catalog TTL; discounts change ~daily.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=1800')

  return {
    source,
    generatedAt: catalog.generatedAt,
    banks,
    brandsCount: brandCountForBanks(catalog.data, banks),
    locationsCount: items.length,
    items,
  }
})
