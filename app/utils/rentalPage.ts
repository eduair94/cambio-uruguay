import type { RentalPropertyType, RentalPublicProperty } from './rentals'

export interface RentalMarketScope {
  department: string
  neighborhood: string
  propertyType: RentalPropertyType
  bedrooms: number
}

/** Asking rents from other currently visible properties, excluding common expenses. */
export interface RentalPageMarket {
  status: 'available' | 'insufficient' | 'not_comparable'
  minimumSample: number
  sampleSize: number
  medianRentUyu: number | null
  p25RentUyu: number | null
  p75RentUyu: number | null
  differencePercent: number | null
  scope: RentalMarketScope | null
}

export interface RentalPageResponse {
  property: RentalPublicProperty
  usdUyu: number
  canonicalPath: string
  seo: {
    indexable: boolean
    reasons: string[]
    /** Omitted from sitemap/structured data until real content-change tracking exists. */
    contentUpdatedAt: null
  }
  market: RentalPageMarket
  similar: RentalPublicProperty[]
}
