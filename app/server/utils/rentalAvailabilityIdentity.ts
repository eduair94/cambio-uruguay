import { RENTAL_STALE_DAYS, type RentalOffer } from '../../utils/rentals'
import { rentalAvailabilityAdvertId } from '../../utils/rentalAvailability'

/** Private, minimal own-advert evidence. Never includes canonical property fields or contacts. */
export interface RentalAvailabilityEvidence {
  version: 1
  department: string
  locality: string
  neighborhood: string
  propertyType: string
  street: string
  streetNumber: string
  units: string[]
  floors: string[]
  buildings: string[]
  positions: string[]
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
}

export type RentalAvailabilityOffer = RentalOffer & { identity?: unknown }
export interface RentalAvailabilityOwner {
  key: string
  offer: RentalAvailabilityOffer
  evidence: RentalAvailabilityEvidence
}
export interface RentalAvailabilityOwnerRow {
  key: string
  offers: RentalAvailabilityOffer[]
}

function text(value: unknown): string {
  return typeof value === 'string'
    ? value
        .toLowerCase()
        .normalize('NFD')
        .replace(/n\u0303/g, 'ñ')
        .replace(/[\u0300-\u036F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : ''
}
const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
const unique = (values: string[]) => [...new Set(values)].sort()
const identifier = (value: string) => value.replace(/^0+(?=\d)/, '').replace(/\s+/g, '')
const ordinals: Record<string, string> = {
  primer: '1',
  primero: '1',
  segundo: '2',
  tercer: '3',
  tercero: '3',
  cuarto: '4',
  quinto: '5',
  sexto: '6',
  septimo: '7',
  octavo: '8',
  noveno: '9',
  decimo: '10',
}
const quantities: Record<string, string> = {
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
}

export function availabilityEvidence(offer: RentalAvailabilityOffer): RentalAvailabilityEvidence {
  const raw = record(offer.identity)
  const own = raw.version === 1 ? raw : {}
  const description = text(own.description || offer.details?.description)
  const title = text(offer.title)
  const content = [title, description, text(own.address)].join('\n')
  const units: string[] = [],
    floors: string[] = [],
    buildings: string[] = [],
    positions: string[] = []
  for (const match of content.matchAll(
    /\b(?:apto|apt|apartamento|unidad)(?![a-z])\.?\s?(?:(?:n(?:ro|umero)?\.?|no\.)\s?(?:[°ºo]\s?)?)?[:#-]?\s?(\d{1,4}(?:\s?[a-z])?|[a-z])\b/g
  )) {
    const tail = content.slice((match.index || 0) + match[0].length)
    const from = content.slice((match.index || 0) + match[0].length - match[1]!.length)
    const value = match[1]!.trim()
    if (
      /^\s*(?:dor|dors|dorm|dorms|dormitorios?|habitaciones?|ba[ñn]os?|amb|ambs|ambientes?|m2|m²|metros)\b/.test(
        tail
      )
    )
      continue
    if (
      /^\d+(?:[.,]\d+)*\s*(?:m(?:2|²)|mts?(?:2|²)?|metros|pesos?|dolares?|usd|uyu|u\s*\$\s*s|\$u?)(?=$|[\s.,;:!?/)\]-])/.test(
        from
      )
    )
      continue
    if (/^\d{1,4}\s*[-–—/oya]\s*\d{1,4}(?!\d)|^\d+(?:[.,]\d+)?\s*%/.test(from)) continue
    const explicit = /\bunidad\b|\bn(?:ro|umero)?\.?\s*[°ºo]?|#/.test(
      match[0].slice(0, -match[1]!.length)
    )
    if (/^[1-6]\s*d$/.test(value) && !explicit) continue
    if (/^[a-z]$/.test(value) && !/^\s*(?:$|[,;:.-]|(?:piso|torre|bloque|block)\b)/.test(tail))
      continue
    units.push(identifier(value))
  }
  for (const match of content.matchAll(
    /\bpiso\s*(?:n(?:ro|umero)?\.?\s*(?:[°º]\s*)?)?(\d{1,2})\b|\b(\d{1,2})(?:[°º]|er|ro|do|to|mo|vo|no)?\s+piso\b/g
  ))
    floors.push(String(Number(match[1] ?? match[2])))
  for (const [word, value] of Object.entries(ordinals)) {
    if (new RegExp(`\\b(?:${word} piso|piso ${word})\\b`).test(content)) floors.push(value)
    const position = content.match(
      new RegExp(
        `\\b${word} de (?:los? )?(\\d{1,2}|dos|tres|cuatro|cinco|seis) (?:apartamentos|unidades)\\b`
      )
    )
    if (position) positions.push(`${value}/${quantities[position[1]!] || position[1]}`)
  }
  // A two-storey house naturally mentions both ground and upper floors; floor evidence is useful
  // only as a contradiction when each observation identifies a single floor.
  if (/\bplanta baja\b|\bpb\b/.test(content)) floors.push('0')
  for (const match of content.matchAll(
    /\b(?:torre|bloque|block)\s*(?:[-:#]\s*)?(\d{1,3}|[a-z])\b/g
  ))
    buildings.push(identifier(match[1]!))
  const header = title.replace(/^(?:alquiler|alquilo|se alquila)\s+(?:de\s+)?/, '')
  const titleType = /^(?:apartamento|apto|monoambiente|penthouse|duplex|loft)\b/.test(header)
    ? 'apartamento'
    : /^(?:casa|chalet)\b/.test(header)
      ? 'casa'
      : ''
  const address = text(own.address)
  const exact =
    own.addressHidden !== true &&
    !/\b(?:aprox|aproximado|aproximadamente|proximo|cerca|entre|esquina|esq|altura|cuadra)\b|\bs\s*\/\s*n\b|\d\s*[-–/]\s*\d/.test(
      address
    )
  const streetNumber = text(own.streetNumber)
  return {
    version: 1,
    department: text(own.department),
    locality: text(own.locality),
    neighborhood: text(own.neighborhood),
    propertyType:
      text(own.propertyType) === 'otro' ? titleType : text(own.propertyType) || titleType,
    street: exact ? text(own.street) : '',
    streetNumber: exact && /^\d{1,5}(?: bis)?$/.test(streetNumber) ? streetNumber : '',
    units: unique(units),
    floors: unique(floors),
    buildings: unique(buildings),
    positions: unique(positions),
    bedrooms: number(own.bedrooms),
    bathrooms: number(own.bathrooms),
    area: number(own.area),
  }
}

/** Missing fields do not establish a contradiction. Price, photos and scrape dates are irrelevant. */
export function compatibleAvailabilityEvidence(
  saved: RentalAvailabilityEvidence,
  current: RentalAvailabilityEvidence
): boolean {
  if (saved?.version !== 1 || current?.version !== 1) return false
  for (const field of [
    'department',
    'locality',
    'neighborhood',
    'propertyType',
    'street',
    'streetNumber',
  ] as const)
    if (saved[field] && current[field] && saved[field] !== current[field]) return false
  for (const field of ['units', 'floors', 'buildings', 'positions'] as const) {
    const a = saved[field] || [],
      b = current[field] || []
    if (a.length === 1 && b.length === 1 && a[0] !== b[0]) return false
    if (a.length && b.length && !a.some(value => b.includes(value))) return false
    if (a.some(value => !b.includes(value)) && b.some(value => !a.includes(value))) return false
  }
  for (const field of ['bedrooms', 'bathrooms'] as const)
    if (saved[field] != null && current[field] != null && saved[field] !== current[field])
      return false
  if (
    saved.area &&
    current.area &&
    Math.abs(saved.area - current.area) > Math.max(5, Math.min(saved.area, current.area) * 0.15)
  )
    return false
  return true
}

export function resolveAvailabilityOwners(
  rows: RentalAvailabilityOwnerRow[],
  now = new Date()
): Map<string, RentalAvailabilityOwner> {
  const cutoff = new Date(now.getTime() - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
  const owners = new Map<string, RentalAvailabilityOwner>()
  const ambiguous = new Set<string>()
  for (const row of rows)
    for (const offer of row.offers || []) {
      const advertId = rentalAvailabilityAdvertId(offer.source, offer.listingId)
      if (
        !advertId ||
        typeof offer.lastSeen !== 'string' ||
        offer.lastSeen < cutoff ||
        !(
          typeof offer.priceUyu === 'number' &&
          Number.isFinite(offer.priceUyu) &&
          offer.priceUyu > 0
        )
      )
        continue
      const evidence = availabilityEvidence(offer)
      const previous = owners.get(advertId)
      if (
        previous &&
        (previous.key !== row.key || !compatibleAvailabilityEvidence(previous.evidence, evidence))
      )
        ambiguous.add(advertId)
      else owners.set(advertId, { key: row.key, offer, evidence })
    }
  for (const id of ambiguous) owners.delete(id)
  return owners
}
