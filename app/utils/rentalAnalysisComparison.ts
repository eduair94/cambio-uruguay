import type { RentalZone } from './rentalZoneTypes'

export const rentalAnalysisLocationName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

/** Match an explicit location only; a commercial alias or a nearby polygon is not evidence. */
export function rentalAnalysisContext(
  zones: readonly RentalZone[],
  department: string,
  neighborhood: string
): RentalZone | null {
  if (!department || !neighborhood) return null
  const matches = zones.filter(
    zone =>
      rentalAnalysisLocationName(zone.ref.department) === rentalAnalysisLocationName(department) &&
      rentalAnalysisLocationName(zone.ref.neighborhood) === rentalAnalysisLocationName(neighborhood)
  )
  return matches.length === 1 ? matches[0]! : null
}

export function rentalAnalysisIncome(
  monthly: number | null | undefined,
  allocation: number,
  extraCosts = 0
): number | null {
  if (
    monthly == null ||
    !Number.isFinite(monthly) ||
    monthly <= 0 ||
    !Number.isFinite(allocation) ||
    allocation <= 0 ||
    allocation > 100 ||
    !Number.isFinite(extraCosts) ||
    extraCosts < 0
  )
    return null
  return (monthly + extraCosts) / (allocation / 100)
}
