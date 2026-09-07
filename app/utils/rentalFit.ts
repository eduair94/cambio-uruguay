import { haversineKm } from './nearbyRates'
import { parseRentalReferencePoint, normalizeRentalReferenceLabel } from './rentalDistance'
import { rentalAvailabilityHidden } from './rentalAvailability'
import { RENTAL_STALE_DAYS, rentalCommonExpensesUyu } from './rentals'
import type {
  FitDestination,
  FitPerson,
  RentalFitCandidate,
  RentalFitInput,
  RentalFitResponse,
  RentalFitResult,
} from './rentalFitTypes'

const invalid = () => new Error('Invalid household rental criteria')
const ownObject = (value: unknown): Record<string, unknown> => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw invalid()
  return value as Record<string, unknown>
}
const number = (value: unknown, max: number, fallback?: number): number => {
  if (value === undefined && fallback !== undefined) return fallback
  if (typeof value !== 'number' && typeof value !== 'string') throw invalid()
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim())) throw invalid()
  const result = Number(value)
  if (!Number.isFinite(result) || result < 0 || result > max) throw invalid()
  return result
}
const amount = (value: unknown, fallback = 0) => number(value, 10_000_000, fallback)
const boolean = (value: unknown): boolean => {
  if (value === undefined) return false
  if (typeof value !== 'boolean') throw invalid()
  return value
}
const label = (value: unknown): string => {
  if (value === undefined) return ''
  if (typeof value !== 'string' || value.length > 500) throw invalid()
  return normalizeRentalReferenceLabel(value).slice(0, 100)
}
const id = (value: unknown, used: Set<string>): string => {
  if (
    typeof value !== 'string' ||
    !/^[a-z0-9][\w-]{0,63}$/i.test(value) ||
    ['constructor', 'prototype'].includes(value) ||
    used.has(value)
  )
    throw invalid()
  used.add(value)
  return value
}
const choice = <T extends string>(value: unknown, values: readonly T[], fallback?: T): T => {
  if (value === undefined && fallback !== undefined) return fallback
  if (typeof value !== 'string' || !values.includes(value as T)) throw invalid()
  return value as T
}

/** Reject an invalid household as a whole; never silently remove a person's destination. */
export function normalizeRentalFitInput(value: unknown): RentalFitInput {
  try {
    const raw = ownObject(value)
    if (!Array.isArray(raw.people) || raw.people.length < 1 || raw.people.length > 8)
      throw invalid()
    const personIds = new Set<string>()
    const destinationIds = new Set<string>()
    const people: FitPerson[] = Array.from(raw.people, value => {
      const person = ownObject(value)
      const destinations = person.destinations === undefined ? [] : person.destinations
      if (!Array.isArray(destinations) || destinations.length > 4) throw invalid()
      return {
        id: id(person.id, personIds),
        label: label(person.label),
        incomeUyu: amount(person.incomeUyu),
        remoteDays: number(person.remoteDays, 7, 0),
        destinations: Array.from(destinations, value => {
          const destination = ownObject(value)
          const point = parseRentalReferencePoint({
            refLat: destination.lat,
            refLng: destination.lng,
          })
          const targetKm = number(destination.targetKm, 300)
          if (!point || targetKm <= 0) throw invalid()
          return {
            id: id(destination.id, destinationIds),
            label: label(destination.label),
            kind: choice(destination.kind, ['work', 'study', 'other'] as const),
            ...point,
            days: number(destination.days, 7),
            mode: choice(destination.mode, ['walking', 'bicycling', 'transit', 'driving'] as const),
            targetKm,
          }
        }),
      }
    })
    const housingBudgetUyu = amount(raw.housingBudgetUyu)
    if (housingBudgetUyu <= 0) throw invalid()
    const types = raw.types === undefined ? ['apartamento', 'casa'] : raw.types
    if (!Array.isArray(types) || types.length < 1 || types.length > 2) throw invalid()
    const minBedrooms = number(raw.minBedrooms, 20, 0)
    if (!Number.isInteger(minBedrooms)) throw invalid()
    return {
      people,
      housingBudgetUyu,
      otherExpensesUyu: amount(raw.otherExpensesUyu),
      savingsUyu: amount(raw.savingsUyu),
      transportUyu: amount(raw.transportUyu),
      department: label(raw.department),
      types: [
        ...new Set(Array.from(types, type => choice(type, ['apartamento', 'casa'] as const))),
      ].sort(),
      minBedrooms,
      minArea: number(raw.minArea, 100_000, 0),
      pets: boolean(raw.pets),
      parking: boolean(raw.parking),
      furnished: boolean(raw.furnished),
      hideReported: boolean(raw.hideReported),
      includeOverBudget: boolean(raw.includeOverBudget),
      priority: choice(raw.priority, ['balanced', 'budget', 'commute'] as const, 'balanced'),
    }
  } catch {
    // Caller-visible errors never echo household finances, labels, coordinates or hostile input.
    throw invalid()
  }
}

const compareKey = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
const scoreForBurden = (burden: number) => 100 / (1 + burden)
const hasIncomeDeficit = (result: RentalFitResult) =>
  result.remainingUyu !== null && result.remainingUyu < 0
const compareResults = (a: RentalFitResult, b: RentalFitResult) =>
  Number(b.complete) - Number(a.complete) ||
  // Preserve all manually allowed options, but prefer housing that leaves the entered
  // reserves covered. Missing income is neutral, never interpreted as inability to pay.
  (a.complete && b.complete ? Number(hasIncomeDeficit(a)) - Number(hasIncomeDeficit(b)) : 0) ||
  b.score - a.score ||
  compareKey(a.property.key, b.property.key)

function chooseOffer(
  candidate: RentalFitCandidate,
  input: RentalFitInput,
  usdUyu: number,
  cutoff: string
) {
  return candidate.property.offers
    .filter(offer => {
      if (
        typeof offer.lastSeen !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(offer.lastSeen) ||
        !Number.isFinite(Date.parse(offer.lastSeen)) ||
        offer.lastSeen < cutoff ||
        !nonnegative(offer.priceUyu) ||
        offer.priceUyu === 0 ||
        (input.pets && offer.petsAllowed !== true) ||
        (input.furnished && offer.furnished !== true) ||
        (input.parking && (!nonnegative(offer.parkingSpaces) || offer.parkingSpaces < 1))
      )
        return false
      const reported = offer.availability ?? candidate.property.availability
      return !input.hideReported || !rentalAvailabilityHidden(reported, 'hide_any')
    })
    .map(offer => {
      const expensesUyu = rentalCommonExpensesUyu(offer, usdUyu)
      const total = expensesUyu === null ? null : offer.priceUyu + expensesUyu
      const monthlyUyu = total !== null && Number.isFinite(total) ? total : null
      return { offer, expensesUyu, monthlyUyu }
    })
    .filter(({ offer, monthlyUyu }) =>
      input.includeOverBudget ? true : (monthlyUyu ?? offer.priceUyu) <= input.housingBudgetUyu
    )
    .sort((a, b) => {
      if (a.monthlyUyu === null && b.monthlyUyu !== null) return 1
      if (b.monthlyUyu === null && a.monthlyUyu !== null) return -1
      return (
        (a.monthlyUyu ?? a.offer.priceUyu) - (b.monthlyUyu ?? b.offer.priceUyu) ||
        compareKey(a.offer.source, b.offer.source) ||
        compareKey(a.offer.listingId, b.offer.listingId)
      )
    })[0]
}

/**
 * All distances are straight-line comparisons with user-selected targets. Mode/remote days
 * supply context only: they never invent a route, speed, timetable or days spent on site.
 * Each person's onsite destinations are weighted by explicit visits, not by their income.
 */
function commute(candidate: RentalFitCandidate, people: FitPerson[]) {
  const point = candidate.point
    ? parseRentalReferencePoint({ refLat: candidate.point.lat, refLng: candidate.point.lng })
    : null
  const distances = (destinations: FitDestination[]) =>
    destinations.map(destination => ({
      destination,
      distanceKm: point ? haversineKm(point, destination) : null,
    }))
  const perPerson = people.map(person => ({ person, destinations: distances(person.destinations) }))
  const active = perPerson.filter(row => row.destinations.some(row => row.destination.days > 0))
  const trips = perPerson.flatMap(({ person, destinations }) =>
    destinations.map(({ destination, distanceKm }) => ({
      personId: person.id,
      destinationId: destination.id,
      distanceKm,
      withinTarget: distanceKm === null ? null : distanceKm <= destination.targetKm,
    }))
  )
  if (!active.length || !point)
    return {
      point,
      trips,
      activePeople: active.length,
      allWithinTarget: false,
      commuteScore: null,
      weeklyDistanceKm: active.length ? null : 0,
      worstPersonDistanceKm: null,
    }
  const burdens = perPerson.map(({ destinations }) => {
    const onsite = destinations.filter(row => row.destination.days > 0)
    const visits = onsite.reduce((sum, row) => sum + row.destination.days, 0)
    if (!visits) return { ratio: 0, distance: 0, weekly: 0 }
    return {
      ratio:
        onsite.reduce(
          (sum, row) => sum + (row.distanceKm! / row.destination.targetKm) * row.destination.days,
          0
        ) / 7,
      distance:
        onsite.reduce((sum, row) => sum + row.distanceKm! * row.destination.days, 0) / visits,
      // Independent return trips, not a claimed itinerary through several destinations.
      weekly: onsite.reduce((sum, row) => sum + row.distanceKm! * 2 * row.destination.days, 0),
    }
  })
  // Seven scales weekly visits to an average calendar-day burden, not a workweek
  // assumption. Keep remote members at zero so reducing visits to zero cannot
  // worsen the mean by unexpectedly removing someone from its denominator.
  const mean = burdens.reduce((sum, row) => sum + row.ratio, 0) / people.length
  const worst = Math.max(...burdens.map(row => row.ratio))
  return {
    point,
    trips,
    activePeople: active.length,
    allWithinTarget: active.every(row =>
      row.destinations.every(
        ({ destination, distanceKm }) =>
          destination.days === 0 || distanceKm! <= destination.targetKm
      )
    ),
    commuteScore: scoreForBurden((mean + worst) / 2),
    weeklyDistanceKm: burdens.reduce((sum, row) => sum + row.weekly, 0),
    worstPersonDistanceKm: Math.max(...burdens.map(row => row.distance)),
  }
}

/** Comparative 0–100 scores, never probabilities or a universal affordability threshold. */
export function rankRentalFits(
  candidates: RentalFitCandidate[],
  input: RentalFitInput,
  usdUyu: number
): Pick<RentalFitResponse, 'matched' | 'complete' | 'incomplete' | 'results'> {
  const criteria = normalizeRentalFitInput(input)
  const cutoff = new Date(Date.now() - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
  const income = criteria.people.reduce((sum, person) => sum + person.incomeUyu, 0)
  const reserved = criteria.otherExpensesUyu + criteria.savingsUyu + criteria.transportUyu
  const results: RentalFitResult[] = []
  let matched = 0,
    complete = 0
  for (const candidate of candidates) {
    const property = candidate.property
    if (
      !['casa', 'apartamento'].includes(property.propertyType) ||
      !criteria.types.includes(property.propertyType as 'casa' | 'apartamento') ||
      (criteria.department && fold(property.department) !== fold(criteria.department)) ||
      (criteria.minBedrooms > 0 &&
        (!nonnegative(property.bedrooms) || property.bedrooms < criteria.minBedrooms)) ||
      (criteria.minArea > 0 && (!nonnegative(property.area) || property.area < criteria.minArea))
    )
      continue
    const selected = chooseOffer(candidate, criteria, usdUyu, cutoff)
    if (!selected) continue
    const { offer, expensesUyu, monthlyUyu } = selected
    const travel = commute(candidate, criteria.people)
    const overBudget = (monthlyUyu ?? offer.priceUyu) > criteria.housingBudgetUyu
    const remainingUyu = monthlyUyu !== null && income > 0 ? income - monthlyUyu - reserved : null
    // Missing expenses cannot turn a cheap lower bound into a favorable budget score.
    const budgetScore =
      monthlyUyu === null ? 0 : scoreForBurden(monthlyUyu / criteria.housingBudgetUyu)
    const budgetWeight =
      criteria.priority === 'budget' ? 0.75 : criteria.priority === 'commute' ? 0.25 : 0.5
    const score = travel.activePeople
      ? budgetScore * budgetWeight + (travel.commuteScore ?? 0) * (1 - budgetWeight)
      : budgetScore
    const reasons: RentalFitResult['reasons'] = []
    const warnings: RentalFitResult['warnings'] = []
    if (monthlyUyu !== null && !overBudget) reasons.push('within_budget')
    if (!travel.activePeople) reasons.push('remote_household')
    if (travel.allWithinTarget) reasons.push('near_destinations')
    if (travel.activePeople > 1 && travel.allWithinTarget) reasons.push('balanced_commutes')
    if (monthlyUyu === null) warnings.push('unknown_expenses')
    if (travel.activePeople && !travel.point) warnings.push('unknown_location')
    if (overBudget) warnings.push('over_budget')
    if (remainingUyu !== null && remainingUyu < 0) warnings.push('low_remaining')
    if (rentalAvailabilityHidden(offer.availability ?? property.availability, 'hide_any'))
      warnings.push('reported')
    const result: RentalFitResult = {
      property,
      offer,
      point: travel.point,
      score,
      budgetScore,
      commuteScore: travel.commuteScore,
      complete: monthlyUyu !== null && (!travel.activePeople || travel.point !== null),
      rentUyu: offer.priceUyu,
      expensesUyu,
      monthlyUyu,
      remainingUyu,
      incomeShare: monthlyUyu !== null && income > 0 ? monthlyUyu / income : null,
      overBudget,
      weeklyDistanceKm: travel.weeklyDistanceKm,
      worstPersonDistanceKm: travel.worstPersonDistanceKm,
      trips: travel.trips,
      reasons,
      warnings,
    }
    matched++
    if (result.complete) complete++
    // Evaluate the full universe, but retain only its best 24: up to 32 trips per home
    // must not accumulate into millions of objects in the shared server worker.
    const position = results.findIndex(existing => compareResults(result, existing) < 0)
    if (position >= 0) results.splice(position, 0, result)
    else if (results.length < 24) results.push(result)
    if (results.length > 24) results.pop()
  }
  return {
    matched,
    complete,
    incomplete: matched - complete,
    results,
  }
}
