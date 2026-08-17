import { defineCachedEventHandler } from '#imports'
import {
  buildBranchPages,
  canonicalCasaName,
  type Branch,
  type BranchPage,
} from '../../utils/branches'
import { buildLocations, type MapBranch } from '../utils/locations'
import extra from '../data/extra-locations.json'

/** What a casa/bank contributes to a branch page beyond its branches. */
export interface BranchCasa {
  origin: string
  name: string
  website: string
  maps: string
  bcu: string
  departments: string[]
}

export interface BranchDirectory {
  branches: BranchPage[]
  casas: Record<string, BranchCasa>
  /**
   * Origins quoting a public (non-interbank) USD price right now.
   *
   * Lives here so the `/casa/:origin/comprar-dolares` route guard can decide
   * whether that page exists with ONE cached request, instead of pulling the
   * whole market payload inside `validate` on every navigation.
   */
  quotesUsd: string[]
  /**
   * Every currency each origin quotes publicly, by ISO code.
   *
   * Same job as {@link quotesUsd} for the currency slices: 44 casas quote the
   * dollar but only five the guaraní, so the guard needs the per-casa list to
   * decide whether `/casa/:origin/guarani` exists at all.
   */
  quotes: Record<string, string[]>
  /**
   * Today's public USD cash quote per origin.
   *
   * Here so a page that is NOT about the rate can still put the number in its
   * meta description. Search Console is unambiguous about why that matters: the
   * pages whose description carries today's buy/sell run at ~1,4% CTR while the
   * ones with a generic sentence sit at 0,03–0,2% from the same positions.
   */
  usd: Record<string, { buy: number; sell: number }>
}

/**
 * The per-branch page directory: every physical counter in the BCU feed, slugged
 * and enriched with its casa's display name.
 *
 * One cached endpoint rather than each page re-deriving the index, because the
 * slug set must be IDENTICAL for the page (`/sucursal/:slug`), the directory
 * (`/sucursal`) and the XML sitemap — three independent derivations of the same
 * slug rule is exactly how a sitemap starts advertising 404s.
 *
 * Cached 30 minutes: branch addresses change on the order of months, and the
 * upstream feed is itself cached.
 */
export default defineCachedEventHandler(
  async (): Promise<BranchDirectory> => {
    const config = useRuntimeConfig()
    const base = config.apiBaseServer || config.public.apiBase

    let rawBranches: unknown[] = []
    try {
      rawBranches = await $fetch<unknown[]>('/locations', { baseURL: base })
    } catch (err) {
      console.error('[/api/branches] locations fetch failed:', err)
      rawBranches = []
    }

    let localData: Record<string, Partial<BranchCasa>> = {}
    try {
      localData = await $fetch<Record<string, Partial<BranchCasa>>>('/localData', { baseURL: base })
    } catch (err) {
      console.error('[/api/branches] localData fetch failed:', err)
      localData = {}
    }

    // Same merge the map uses, so a branch that shows on /mapa also has a page.
    const merged = buildLocations(rawBranches as MapBranch[], extra as MapBranch[])

    const casaNames: Record<string, string> = {}
    const casas: Record<string, BranchCasa> = {}
    for (const [origin, house] of Object.entries(localData)) {
      // `canonicalCasaName` fixes the two brands the feed spells without their
      // accent, so every family renders "Itaú" rather than "Itau".
      const name = canonicalCasaName(origin, house?.name)
      if (name) casaNames[origin] = name
      casas[origin] = {
        origin,
        name,
        website: String(house?.website ?? ''),
        maps: String(house?.maps ?? ''),
        bcu: String(house?.bcu ?? ''),
        departments: Array.isArray(house?.departments) ? house.departments : [],
      }
    }

    // Public USD quotes: both sides present, and NOT the wholesale interbank
    // reference. The `isInterBank` flag alone is not enough — the feed currently
    // returns Cambio La Favorita's "Dólar Interbancario" row with the flag unset
    // and only `type: 'INTERBANCARIO'` to go on. Trusting the flag would have
    // opened a "comprar dólares" page for a price no member of the public can
    // take, which is exactly what `buildUsdComparison` filters out downstream.
    const quotesUsd: string[] = []
    const quotes: Record<string, string[]> = {}
    const usd: Record<string, { buy: number; sell: number }> = {}
    try {
      const rows = await $fetch<
        Array<{
          origin?: string
          code?: string
          type?: string
          buy?: number
          sell?: number
          isInterBank?: boolean
        }>
      >('/', { baseURL: base })
      for (const row of rows ?? []) {
        if (!row?.origin || !row.code || row.isInterBank) continue
        if (String(row.type ?? '').toUpperCase() === 'INTERBANCARIO') continue
        if (!(Number(row.buy) > 0) || !(Number(row.sell) > 0)) continue
        const codes = quotes[row.origin] ?? (quotes[row.origin] = [])
        if (!codes.includes(row.code)) codes.push(row.code)
        if (row.code === 'USD') {
          if (!quotesUsd.includes(row.origin)) quotesUsd.push(row.origin)
          // Keep the cheapest sell when a casa publishes several USD boards, the
          // same tie-break `buildUsdComparison` applies.
          const previous = usd[row.origin]
          if (!previous || Number(row.sell) < previous.sell) {
            usd[row.origin] = { buy: Number(row.buy), sell: Number(row.sell) }
          }
        }
      }
    } catch (err) {
      console.error('[/api/branches] rates fetch failed:', err)
    }

    const branches = buildBranchPages(merged as Branch[], casaNames)

    return { branches, casas, quotesUsd, quotes, usd }
  },
  { maxAge: 1800, name: 'branches', getKey: () => 'all' }
)
