/** An asking-price comparison, never a transaction valuation or a promised saving. */
export type OpportunityOperation = 'rent' | 'sale'
export type OpportunityCurrency = 'UYU' | 'USD'
export type OpportunitySource = 'mercadolibre' | 'infocasas' | 'facebook' | 'casasweb' | 'elpais'
export type OpportunityAreaBasis = 'built' | 'total' | 'reported'

export interface OpportunityMoney {
  amount: number
  currency: OpportunityCurrency
}

export interface OpportunityArea {
  value: number
  basis: OpportunityAreaBasis
}

export type OpportunityRisk =
  | 'temporary'
  | 'partial_price'
  | 'occupied'
  | 'needs_renovation'
  | 'restricted_rights'
  | 'project'
  | 'multiple_units'
  | 'price_on_request'
  | 'extra_purchase_costs'
  | 'special_layout'
  | 'location_conflict'
  | 'attribute_conflict'

/** INTERNAL input: every field belongs to this advert; descriptions/addresses are not public output. */
export interface OpportunityListing {
  /** Operation-qualified source advert ID, e.g. sale:infocasas:123. */
  id: string
  operation: OpportunityOperation
  propertyKey?: string
  source: OpportunitySource
  listingId: string
  url: string
  title: string
  image: string | null
  sellerName: string
  department: string
  /** Explicit source locality; the adapter may use Montevideo for that department only. */
  locality: string
  neighborhood: string
  propertyType: 'apartamento' | 'casa'
  bedrooms: number | null
  bathrooms: number | null
  area: OpportunityArea | null
  price: OpportunityMoney
  /** Zero must be explicitly published. Unknown expenses stay null, including houses. */
  expenses: OpportunityMoney | null
  lastSeen: string
  publishedAt: string | null
  /** Sanitized own-source prose, used for exclusions only. Never returned by analyze. */
  description: string
  parkingSpaces: number | null
  furnished: true | null
  /** Explicit plot size, used only to reject materially different house lots. */
  landArea?: number | null
  /** Original structured facility labels; internal compatibility checks only. */
  amenities?: string[]
  /** Original structured exclusions; never inferred from a different property/offer. */
  riskFlags?: OpportunityRisk[]
  /** Private sample-independence evidence. Hidden addresses must be omitted. */
  address?: string
}

export interface OpportunityPublicListing {
  id: string
  operation: OpportunityOperation
  propertyKey?: string
  source: OpportunitySource
  listingId: string
  url: string
  title: string
  image: string | null
  sellerName: string
  department: string
  locality: string
  neighborhood: string
  propertyType: 'apartamento' | 'casa'
  bedrooms: number
  bathrooms: number
  area: OpportunityArea
  price: OpportunityMoney
  expenses: OpportunityMoney | null
  /** Snapshot conversion: rent plus known common expenses in UYU, or sale asking price in USD. */
  comparisonPrice: number
  lastSeen: string
  publishedAt: string | null
}

export type OpportunityCaution =
  | 'asking_prices_only'
  | 'availability_unverified'
  | 'condition_unverified'
  | 'parking_unverified'
  | 'furnishing_unverified'
  | 'land_area_unverified'
  | 'single_source'
  | 'total_area_basis'

export interface OpportunityComparable extends OpportunityPublicListing {
  /** Explicit measured differences, not monetary adjustments. */
  differences: { areaPercent: number }
}

export interface OpportunityAnalysis {
  pricingBasis: 'monthly_total' | 'asking_price'
  currency: OpportunityCurrency
  median: number
  q25: number
  q75: number
  /** (Q75-Q25)/median. A descriptive dispersion measure, not a confidence interval. */
  spread: number
  /** Positive means the subject asks less than the comparison median. */
  gapPct: number
  /** Positive means the subject also asks less than the lower quartile. */
  conservativeGapPct: number
  /** A second guard: small units must not win solely because their total price is smaller. */
  perAreaGapPct: number
  distinctN: number
  sellersN: number
  sources: OpportunitySource[]
  oldestLastSeen: string
  newestLastSeen: string
  areaBasis: 'built' | 'total'
  areaMin: number
  areaMax: number
  /** Evidence strength; not a probability that this is below transaction value. */
  confidence: 'supported' | 'limited'
}

export interface OpportunityItem {
  subject: OpportunityPublicListing
  analysis: OpportunityAnalysis
  /** At most ten; all are members of the actual sample used for these statistics. */
  comparables: OpportunityComparable[]
  cautions: OpportunityCaution[]
}

export type OpportunityExclusion =
  | 'invalid_identity'
  | 'duplicate_id'
  | 'stale'
  | 'missing_location'
  | 'missing_attributes'
  | 'area_basis_unknown'
  | 'invalid_price'
  | 'expenses_unknown'
  | 'risky_terms'
  | 'suspected_copy'
  | 'insufficient_comparables'
  | 'seller_concentration'
  | 'high_dispersion'
  | 'not_below_reference'
  | 'extreme_discount'

export interface OpportunityOperationStats {
  input: number
  eligible: number
  analyzed: number
  shortlisted: number
  /** Includes qualified results beyond the bounded public result limit. */
  qualified: number
  excluded: Partial<Record<OpportunityExclusion, number>>
  risks: Partial<Record<OpportunityRisk, number>>
}

export interface OpportunityAnalysisResult {
  version: 1
  algorithm: 'local-asking-comparables-v1'
  generatedAt: string
  usdUyu: number
  items: OpportunityItem[]
  stats: Record<OpportunityOperation, OpportunityOperationStats>
}

export interface OpportunityAnalysisOptions {
  /** Required clock and conversion snapshot keep reruns deterministic. */
  now: string
  usdUyu: number
  /** Default and maximum: 2,000 per operation. */
  maxItemsPerOperation?: number
}
