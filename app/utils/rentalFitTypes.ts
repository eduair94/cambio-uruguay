import type { RentalOffer, RentalPublicProperty } from './rentals'

export type FitMode = 'walking' | 'bicycling' | 'transit' | 'driving'
export interface FitDestination {
  id: string
  label: string
  kind: 'work' | 'study' | 'other'
  lat: number
  lng: number
  days: number
  mode: FitMode
  /** A user-chosen straight-line proximity target, never a travel-time estimate. */
  targetKm: number
}
export interface FitPerson {
  id: string
  label: string
  incomeUyu: number
  remoteDays: number
  destinations: FitDestination[]
}
export interface RentalFitInput {
  people: FitPerson[]
  housingBudgetUyu: number
  otherExpensesUyu: number
  savingsUyu: number
  transportUyu: number
  department: string
  types: ('casa' | 'apartamento')[]
  minBedrooms: number
  minArea: number
  pets: boolean
  parking: boolean
  furnished: boolean
  hideReported: boolean
  includeOverBudget: boolean
  priority: 'balanced' | 'budget' | 'commute'
}
/** Cached public advert fields plus an evidence-checked point; no private source evidence. */
export interface RentalFitCandidate {
  property: RentalPublicProperty
  point: { lat: number; lng: number } | null
}
export interface RentalFitTrip {
  personId: string
  destinationId: string
  distanceKm: number | null
  withinTarget: boolean | null
}
export interface RentalFitResult {
  property: RentalPublicProperty
  offer: RentalOffer
  point: { lat: number; lng: number } | null
  score: number
  budgetScore: number
  commuteScore: number | null
  complete: boolean
  rentUyu: number
  expensesUyu: number | null
  monthlyUyu: number | null
  remainingUyu: number | null
  incomeShare: number | null
  overBudget: boolean
  weeklyDistanceKm: number | null
  worstPersonDistanceKm: number | null
  trips: RentalFitTrip[]
  reasons: ('within_budget' | 'near_destinations' | 'remote_household' | 'balanced_commutes')[]
  warnings: (
    | 'unknown_expenses'
    | 'unknown_location'
    | 'over_budget'
    | 'low_remaining'
    | 'reported'
  )[]
}
export interface RentalFitResponse {
  generatedAt: string
  usdUyu: number
  scanned: number
  matched: number
  complete: number
  incomplete: number
  results: RentalFitResult[]
}
