// Shapes and maths for /equipar-casa-uruguay.
//
// `app/utils` is a FLAT auto-import namespace, so every export here is prefixed `equipar*` — a bare
// `plan()` or `TIERS` would collide with another page's helper the day someone adds one.

export type EquiparTier = 'S' | 'A' | 'B' | 'C'
export type EquiparRegime = 'modelo' | 'commodity'
export type EquiparRoom = 'cocina' | 'dormitorio' | 'bano' | 'living' | 'limpieza'

export interface EquiparBand {
  p25: number
  median: number
  p75: number
  min: number
  n: number
}

export interface EquiparOffer {
  seller: string
  title: string
  url: string
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  condition: 'new' | 'used'
  source: 'store' | 'mercadolibre' | 'facebook'
  observedAt: string
}

export interface EquiparProduct {
  slug: string
  name: string
  brand: string
  model: string
  image: string | null
  offers: EquiparOffer[]
  bestPriceUyu: number
  sellers: number
}

export interface EquiparItemDoc {
  key: string
  category: string
  categoryLabel: string
  variant: string
  variantLabel: string
  room: EquiparRoom
  tier: EquiparTier
  /** Position in the published necessity order. The planner buys in exactly this order. */
  rank: number
  regime: EquiparRegime
  reason: string
  usedOk: boolean
  usedNote?: string
  quantity: number
  newBand: EquiparBand | null
  usedBand: EquiparBand | null
  usedSavingPct: number | null
  products: EquiparProduct[]
  offers: EquiparOffer[]
  suspectDropped: number
  observedAt: string | null
  firstSeen: string
  lastSeen: string
}

export interface EquiparBasketLine {
  itemKey: string
  label: string
  variantLabel: string
  tier: EquiparTier
  quantity: number
  unitPriceUyu: number
  totalUyu: number
  condition: 'new' | 'used'
}

export interface EquiparBasket {
  key: 'minima' | 'decente' | 'completa'
  label: string
  tiers: EquiparTier[]
  lines: EquiparBasketLine[]
  totalUyu: number
  totalUsd: number | null
  missing: Array<{ itemKey: string; label: string; tier: EquiparTier }>
  complete: boolean
}

export interface EquiparMetaDoc {
  key: string
  generatedAt: string
  usdUyu: number
  listings: number
  items: number
  runs: Array<{
    key: string
    label: string
    adapter: string
    listings: number
    ok: boolean
    note: string
  }>
  baskets: EquiparBasket[]
  uncovered: string[]
}

export interface EquiparResponse {
  meta: EquiparMetaDoc | null
  items: EquiparItemDoc[]
}

export const EQUIPAR_TIER_ORDER: Record<EquiparTier, number> = { S: 0, A: 1, B: 2, C: 3 }

export const EQUIPAR_TIERS: EquiparTier[] = ['S', 'A', 'B', 'C']

/** What the money actually buys for one item, given whether the reader accepts second-hand. */
export function equiparUnitPrice(
  item: EquiparItemDoc,
  acceptUsed: boolean
): { priceUyu: number; condition: 'new' | 'used' } | null {
  // The registry decides where used is sane. A mattress is the one place in this catalogue where
  // the cheap option is the wrong advice, and the row says so.
  if (acceptUsed && item.usedOk && item.usedBand) {
    return { priceUyu: item.usedBand.median, condition: 'used' }
  }
  if (item.newBand) return { priceUyu: item.newBand.p25, condition: 'new' }
  if (item.usedOk && item.usedBand) return { priceUyu: item.usedBand.median, condition: 'used' }
  return null
}

export interface EquiparPlanLine {
  item: EquiparItemDoc
  quantity: number
  unitPriceUyu: number
  totalUyu: number
  condition: 'new' | 'used'
  /** Did the money reach this line? */
  afforded: boolean
}

export interface EquiparPlan {
  lines: EquiparPlanLine[]
  spentUyu: number
  leftoverUyu: number
  /** Everything the budget did not reach, in the order it would have been bought. */
  missingUyu: number
  /** The first line the money did not cover — where the budget runs out. */
  cutAt: EquiparPlanLine | null
  budgetUyu: number
}

/**
 * Walks the catalogue in necessity order and spends the budget until it runs out.
 *
 * The order is tier, then the published rank — the SAME order the tier table prints. Two orders
 * that look sensible are both wrong here: cheapest-first buys six small things instead of the
 * fridge, and most-expensive-first buys the mattress and drops the fridge. Either way the planner
 * would be choosing which essential to sacrifice on a criterion the page never states. Sorting by
 * the published rank means the plan is readable straight off the table above it.
 */
export function equiparPlan(options: {
  items: EquiparItemDoc[]
  budgetUyu: number
  acceptUsed: boolean
  /** Item keys the reader already owns. */
  owned?: Set<string>
  /** Tiers to buy. Defaults to everything except "can wait months". */
  tiers?: EquiparTier[]
}): EquiparPlan {
  const tiers = options.tiers ?? ['S', 'A', 'B']
  const owned = options.owned ?? new Set<string>()

  // One row per category: the catalogue has several variants of each and buying three fridges is
  // not a plan. The cheapest priced variant stands for the category.
  const byCategory = new Map<
    string,
    { item: EquiparItemDoc; priceUyu: number; condition: 'new' | 'used' }
  >()
  for (const item of options.items) {
    if (!tiers.includes(item.tier)) continue
    if (owned.has(item.key) || owned.has(item.category)) continue
    const priced = equiparUnitPrice(item, options.acceptUsed)
    if (!priced) continue
    const current = byCategory.get(item.category)
    if (!current || priced.priceUyu < current.priceUyu) {
      byCategory.set(item.category, {
        item,
        priceUyu: priced.priceUyu,
        condition: priced.condition,
      })
    }
  }

  const ordered = [...byCategory.values()].sort(
    (a, b) =>
      EQUIPAR_TIER_ORDER[a.item.tier] - EQUIPAR_TIER_ORDER[b.item.tier] ||
      (a.item.rank ?? 999) - (b.item.rank ?? 999) ||
      a.item.category.localeCompare(b.item.category)
  )

  let remaining = options.budgetUyu
  const lines: EquiparPlanLine[] = []
  let cutAt: EquiparPlanLine | null = null

  for (const entry of ordered) {
    const quantity = entry.item.quantity || 1
    const totalUyu = entry.priceUyu * quantity
    const afforded = totalUyu <= remaining
    if (afforded) remaining -= totalUyu
    const line: EquiparPlanLine = {
      item: entry.item,
      quantity,
      unitPriceUyu: entry.priceUyu,
      totalUyu,
      condition: entry.condition,
      afforded,
    }
    if (!afforded && !cutAt) cutAt = line
    lines.push(line)
  }

  const spentUyu = lines.filter(line => line.afforded).reduce((sum, line) => sum + line.totalUyu, 0)
  const missingUyu = lines
    .filter(line => !line.afforded)
    .reduce((sum, line) => sum + line.totalUyu, 0)

  return {
    lines,
    spentUyu,
    leftoverUyu: remaining,
    missingUyu,
    cutAt,
    budgetUyu: options.budgetUyu,
  }
}

export const equiparMoney = (value: number): string =>
  `$${Math.round(value).toLocaleString('es-UY')}`
