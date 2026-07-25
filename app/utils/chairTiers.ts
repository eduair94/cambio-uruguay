export const CHAIR_TIER_ORDER = ['S', 'A', 'B', 'C', 'D'] as const
export const CHAIR_PRIORITY_IDS = [
  'overall',
  'comfort',
  'support',
  'adjustability',
  'durability',
  'value',
  'heat',
] as const

export const CHAIR_THEME_IDS = [
  'comfort',
  'ergonomics',
  'adjustability',
  'durability',
  'value',
  'support',
  'heat',
  'build',
] as const

export type ChairTier = (typeof CHAIR_TIER_ORDER)[number]
export type ChairPriority = (typeof CHAIR_PRIORITY_IDS)[number]
export type ChairTheme = (typeof CHAIR_THEME_IDS)[number]
export type ChairConfidence = 'low' | 'medium' | 'high'

export interface ChairEvidence {
  commentId: string
  postId: string
  sourceType: 'post' | 'comment'
  parentId: string | null
  depth: number
  postTitle: string
  author: string
  body: string
  excerpt: string
  sentiment: number
  themes: ChairTheme[]
  score: number
  date: string
  permalink: string
}

export interface ChairReviewPoint {
  text: string
  sourceIds: string[]
}

export interface ChairGeneralReview {
  verdict: string
  pros: ChairReviewPoint[]
  cons: ChairReviewPoint[]
}

export interface ChairPurchaseOffer {
  id: string
  seller: string
  channel: 'local-store' | 'marketplace' | 'importer' | 'comparator'
  title: string
  price: number
  currency: 'UYU' | 'USD'
  url: string
  condition: 'new' | 'refurbished' | 'used' | 'unknown'
  verifiedAt: string
  note?: string
}

export interface ChairMedia {
  url: string
  alt: string
  sourceName: string
  sourceUrl: string
}

export interface ChairThemeCount {
  id: ChairTheme
  mentions: number
  positive: number
  negative: number
}

export interface ChairTierItem {
  slug: string
  name: string
  brand: string
  model: string
  tier: ChairTier | null
  score: number
  confidence: ChairConfidence
  sources: number
  posts: number
  comments: number
  replies: number
  uniqueAuthors: number
  positive: number
  neutral: number
  negative: number
  themes: ChairThemeCount[]
  summary: string
  generalReview: ChairGeneralReview
  evidence: ChairEvidence[]
  offers: ChairPurchaseOffer[]
  image: ChairMedia | null
  /**
   * Every verified photo for the chair, lead photo first. Optional because snapshots written by
   * methodology v1 predate the field — those rows fall back to `image`, then to the local catalog.
   */
  gallery?: ChairMedia[]
}

export interface ChairTierSnapshot {
  key: string
  asOf: string
  subreddit: string
  queries: string[]
  classifierModel: string
  methodologyVersion: number
  corpus: {
    threads: number
    comments: number
    analyzed: number
    uniqueAuthors: number
  }
  tiers: ChairTierItem[]
  watchlist: ChairTierItem[]
}

export const chairTierMeta: Record<ChairTier, { color: string; icon: string; scoreFloor: number }> =
  {
    S: { color: '#ffb300', icon: 'mdi-star-four-points', scoreFloor: 82 },
    A: { color: '#26a69a', icon: 'mdi-check-decagram-outline', scoreFloor: 70 },
    B: { color: '#42a5f5', icon: 'mdi-signal-cellular-2', scoreFloor: 56 },
    C: { color: '#ab47bc', icon: 'mdi-alert-circle-outline', scoreFloor: 42 },
    D: { color: '#ef5350', icon: 'mdi-close-octagon-outline', scoreFloor: 0 },
  }

/**
 * Local photo catalog. Mirrors `classes/chairs/offers.ts` — the backend is the source of truth and
 * writes these into the snapshot, but the app cannot import from the API package, and snapshots
 * written before the field existed still need photos.
 */
const worldVigo = (id: string, alt: string, product: string): ChairMedia => ({
  url: `https://api.crowhop.pro/uploads/shopify-${id}.jpg`,
  alt,
  sourceName: 'World Vigo',
  sourceUrl: `https://www.worldvigo.com/products/${product}`,
})

const CHAIR_GALLERY_BY_SLUG: Record<string, ChairMedia[]> = {
  'herman-miller-aeron': [
    {
      url: 'https://f.fcdn.app/imgs/ddeaf9/bertoni.com.uy/bertuy/5020/webp/catalogo/AER1C23DWALPG1G1G1C7BK23103_AER1B23DWALPG1G1G1C7BK23103_1/1024-1024/silla-new-aeron-con-forward-tilt.jpg',
      alt: 'Silla Herman Miller New Aeron color grafito, vista tres cuartos',
      sourceName: 'Bertoni',
      sourceUrl:
        'https://bertoni.com.uy/productos/silla-new-aeron-con-forward-tilt_AER1C23DWALPG1G1G1C7BK23103_AER1B23DWALPG1G1G1C7BK23103',
    },
  ],
  'vigo-atlas': [
    worldVigo(
      'c2518bca119d47babc7277737984034e',
      'Silla VIGO Atlas negra, vista frontal',
      'silla-vigo-atlas'
    ),
    worldVigo(
      '9b6deadda5ed035fa3a2f73c750958fd',
      'Silla VIGO Atlas negra, perfil lateral',
      'silla-vigo-atlas'
    ),
    worldVigo(
      '49671498bfdf49cb718f775328dc583a',
      'Silla VIGO Atlas negra, vista tres cuartos',
      'silla-vigo-atlas'
    ),
    worldVigo(
      'f8933f11d1c921426b534a128e6165b0',
      'Silla VIGO Atlas negra, respaldo y apoyacabezas',
      'silla-vigo-atlas'
    ),
  ],
  'vigo-apolo': [
    worldVigo(
      '844a07e973d78943fea7bc871212d34d',
      'Silla Vigo Apolo negra, vista frontal',
      'vigo-apollo'
    ),
    worldVigo(
      'd67f8045e1d10d80a6b5d23658ca7880',
      'Silla Vigo Apolo negra, vista tres cuartos',
      'vigo-apollo'
    ),
    worldVigo(
      'c5c1e499dd135d1a8a70295537a2c6af',
      'Silla Vigo Apolo negra, perfil lateral',
      'vigo-apollo'
    ),
  ],
  'vigo-5k': [
    worldVigo(
      'df3814c5a0e8da90d8e513d3e56fe6cc',
      'Silla Vigo 5K negra, vista frontal',
      'vigo-5k-black'
    ),
    worldVigo(
      'a76e4afe61ecdc44c1d02b806544e012',
      'Silla Vigo 5K negra, vista tres cuartos',
      'vigo-5k-black'
    ),
    worldVigo(
      '978603f9440915d0f053b551313a4b69',
      'Silla Vigo 5K negra, perfil lateral',
      'vigo-5k-black'
    ),
    worldVigo('6fe275c2a8ab1bd3dbdcef9b85e9f6ab', 'Silla Vigo 5K negra, respaldo', 'vigo-5k-black'),
  ],
}

/**
 * Model-only slugs produced by methodology v1 ("atlas" instead of "vigo-atlas"). Brand-only groups
 * ("vigo", "herman-miller") stay out on purpose: we cannot tell which model they refer to, and a
 * photo of the wrong chair beside a verdict is worse than no photo.
 */
const CHAIR_SLUG_ALIASES: Record<string, string> = {
  aeron: 'herman-miller-aeron',
  'new-aeron': 'herman-miller-aeron',
  atlas: 'vigo-atlas',
  apolo: 'vigo-apolo',
  apollo: 'vigo-apolo',
  'vigo-apollo': 'vigo-apolo',
  '5k': 'vigo-5k',
  'vigo-5k-black': 'vigo-5k',
}

export function chairCatalogSlug(slug: string): string {
  return CHAIR_SLUG_ALIASES[slug] ?? slug
}

/** Every photo we can show for a chair, lead photo first. Empty when we have none. */
export function chairGallery(
  item: Pick<ChairTierItem, 'slug' | 'image' | 'gallery'>
): ChairMedia[] {
  if (item.gallery?.length) return item.gallery
  const catalog = CHAIR_GALLERY_BY_SLUG[chairCatalogSlug(item.slug)]
  if (catalog?.length) return catalog
  return item.image ? [item.image] : []
}

export function chairMedia(
  item: Pick<ChairTierItem, 'slug' | 'image' | 'gallery'>
): ChairMedia | null {
  return chairGallery(item)[0] ?? null
}

export function groupChairTiers(
  items: readonly ChairTierItem[]
): Array<{ tier: ChairTier; items: ChairTierItem[] }> {
  return CHAIR_TIER_ORDER.map(tier => ({
    tier,
    items: items.filter(item => item.tier === tier),
  })).filter(group => group.items.length)
}

export function priorityAffinity(item: ChairTierItem, priority: ChairPriority): number {
  if (priority === 'overall') return item.score
  const theme = item.themes.find(row => row.id === priority)
  if (!theme) return -1
  const net = theme.positive - theme.negative
  return theme.mentions * 10 + net * 4
}

export function sortChairsForPriority(
  items: readonly ChairTierItem[],
  priority: ChairPriority
): ChairTierItem[] {
  return [...items].sort(
    (a, b) =>
      priorityAffinity(b, priority) - priorityAffinity(a, priority) ||
      b.score - a.score ||
      (b.sources ?? b.comments) - (a.sources ?? a.comments) ||
      a.name.localeCompare(b.name)
  )
}

export function sentimentPercentages(item: ChairTierItem): {
  positive: number
  neutral: number
  negative: number
} {
  const total = item.positive + item.neutral + item.negative
  if (!total) return { positive: 0, neutral: 100, negative: 0 }
  const positive = Math.round((item.positive / total) * 100)
  const negative = Math.round((item.negative / total) * 100)
  return { positive, negative, neutral: Math.max(0, 100 - positive - negative) }
}

export interface ChairBudgetOption {
  chair: ChairTierItem
  offer: ChairPurchaseOffer
  convertedPrice: number
}

export function convertChairOfferPrice(
  offer: ChairPurchaseOffer,
  currency: 'UYU' | 'USD',
  usdUyuRate: number | null
): number | null {
  if (offer.currency === currency) return offer.price
  if (!usdUyuRate || usdUyuRate <= 0) return null
  return offer.currency === 'USD' ? offer.price * usdUyuRate : offer.price / usdUyuRate
}

/**
 * Lowest offer we have for one chair, ranked in the currency the visitor is reading. Offers we
 * cannot express in that currency (a USD tag with no live rate) are left out of the ranking rather
 * than compared as bare numbers; if that empties the list, the cheapest raw price wins so the
 * "from" price never disappears just because the rate failed to load.
 */
export function cheapestChairOffer(
  chair: Pick<ChairTierItem, 'offers'>,
  currency: 'UYU' | 'USD',
  usdUyuRate: number | null
): ChairPurchaseOffer | null {
  const offers = chair.offers ?? []
  if (!offers.length) return null
  const comparable = offers
    .map(offer => ({ offer, price: convertChairOfferPrice(offer, currency, usdUyuRate) }))
    .filter((row): row is { offer: ChairPurchaseOffer; price: number } => row.price !== null)
  if (comparable.length) {
    return comparable.sort((a, b) => a.price - b.price)[0]!.offer
  }
  return [...offers].sort((a, b) => a.price - b.price)[0]!
}

export function affordableChairOffers(
  chairs: readonly ChairTierItem[],
  budget: number,
  currency: 'UYU' | 'USD',
  usdUyuRate: number | null
): ChairBudgetOption[] {
  const tierRank: Record<ChairTier, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 }
  return chairs
    .flatMap(chair =>
      (chair.offers ?? [])
        .map(offer => ({
          chair,
          offer,
          convertedPrice: convertChairOfferPrice(offer, currency, usdUyuRate),
        }))
        .filter(
          (option): option is ChairBudgetOption =>
            option.convertedPrice !== null && option.convertedPrice <= budget
        )
    )
    .sort(
      (a, b) =>
        tierRank[a.chair.tier!] - tierRank[b.chair.tier!] ||
        b.chair.score - a.chair.score ||
        (b.chair.sources ?? b.chair.comments) - (a.chair.sources ?? a.chair.comments) ||
        a.convertedPrice - b.convertedPrice
    )
}
