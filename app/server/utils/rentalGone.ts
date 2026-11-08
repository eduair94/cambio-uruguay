// Lo que la ficha caída ofrece en lugar del callejón (ver utils/rentalGone.ts). Corre SÓLO cuando
// la ficha no está en el índice vigente, así que su costo es el de un 404 y no el de cada vista.
//
// La fila vieja sigue en la colección hasta la poda (unos 21 días: la más vieja tenía lastSeen
// 2026-10-17 el 8/11/2026, y había 23.049 así). Con ella se arman las MISMAS parecidas que muestra
// una ficha viva — mismo barrio, tipo y dormitorios, por cercanía de precio, sin copias — y se busca
// si la propia vivienda sigue publicada con otra clave. Si la fila ya se podó, queda lo que dice la
// clave: su barrio indexable o su departamento.
import { RentalListingModel } from '../models/RentalListing'
import {
  RENTAL_COLLATION,
  type RentalPropertyType,
  type RentalPublicProperty,
} from '../../utils/rentals'
import {
  RENTAL_GONE_SIMILAR_LIMIT,
  rentalGoneBarrioFromKey,
  rentalGoneDepartmentFromKey,
  type RentalGoneData,
  type RentalGoneLink,
} from '../../utils/rentalGone'
import { RENTAL_BARRIO_LINK_TIMEOUT_MS, resolveIndexableBarrioLink } from './rentalBarrio'
import {
  rentalPageEvidenceStages,
  rentalPageReprice,
  rentalPageSimilar,
  rentalPageSimilarKeys,
  rentalPageSimilarStages,
  type RentalPageEvidence,
} from './rentalPage'

/** La fila vieja, sólo con lo que piden las parecidas y la regla de copias; nada privado. */
export const RENTAL_GONE_PROJECTION = {
  _id: 0,
  key: 1,
  title: 1,
  department: 1,
  neighborhood: 1,
  propertyType: 1,
  bedrooms: 1,
  bathrooms: 1,
  area: 1,
  price: 1,
  currency: 1,
  priceUyu: 1,
  lastSeen: 1,
  latitude: 1,
  longitude: 1,
  'offers.source': 1,
  'offers.listingId': 1,
  'offers.title': 1,
  'offers.price': 1,
  'offers.currency': 1,
  'offers.priceUyu': 1,
  'offers.sellerName': 1,
} as const

type GoneRow = RentalPageEvidence &
  Pick<RentalPublicProperty, 'area' | 'latitude' | 'longitude' | 'lastSeen'> & {
    offers: Array<RentalPageEvidence['offers'][number] & { sellerName?: string }>
  }

const PROPERTY_TYPES = new Set<string>([
  'apartamento',
  'casa',
  'habitacion',
  'local',
  'oficina',
  'garaje',
  'terreno',
  'otro',
])
const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
const string = (value: unknown): string => (typeof value === 'string' ? value : '')

function goneRow(doc: Record<string, unknown>): GoneRow {
  const offers = (Array.isArray(doc.offers) ? doc.offers : [])
    .filter((offer): offer is Record<string, unknown> => !!offer && typeof offer === 'object')
    .map(offer => ({
      source: string(offer.source) as GoneRow['offers'][number]['source'],
      listingId: string(offer.listingId),
      title: string(offer.title),
      price: finite(offer.price) ?? 0,
      currency: (offer.currency === 'USD' ? 'USD' : 'UYU') as 'UYU' | 'USD',
      priceUyu: finite(offer.priceUyu) ?? 0,
      sellerName: string(offer.sellerName),
    }))
  return {
    key: string(doc.key),
    title: string(doc.title),
    department: string(doc.department),
    neighborhood: string(doc.neighborhood),
    propertyType: (PROPERTY_TYPES.has(string(doc.propertyType))
      ? doc.propertyType
      : 'otro') as RentalPropertyType,
    bedrooms: finite(doc.bedrooms),
    bathrooms: finite(doc.bathrooms),
    area: finite(doc.area),
    price: finite(doc.price) ?? 0,
    currency: doc.currency === 'USD' ? 'USD' : 'UYU',
    priceUyu: finite(doc.priceUyu) ?? 0,
    latitude: finite(doc.latitude),
    longitude: finite(doc.longitude),
    lastSeen: string(doc.lastSeen),
    offers,
  }
}

/** Un tope de espera que nunca rechaza: sin respuesta a tiempo, null. */
async function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<null>(resolve => {
        timer = setTimeout(() => resolve(null), ms)
      }),
    ])
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface RentalGoneOptions {
  usdUyu: number
  /** La lista de páginas de barrio indexables que la ficha ya empezó a leer en paralelo. */
  barrioLinks: Promise<ReadonlyMap<string, RentalGoneLink> | null>
  timeoutMs?: number
}

/**
 * Los datos de la ficha caída, o null cuando no hay nada que decir (ni fila ni departamento en la
 * clave). Las filas vivas que devuelve todavía no pasaron por `publicRentalAdvertisers`: eso lo hace
 * el endpoint, igual que con las parecidas de una ficha viva.
 */
export async function loadRentalGone(
  key: string,
  options: RentalGoneOptions
): Promise<RentalGoneData | null> {
  const doc = await RentalListingModel.findOne({ key })
    .select(RENTAL_GONE_PROJECTION)
    .maxTimeMS(3000)
    .lean<Record<string, unknown>>()
  if (!doc) {
    // Ya podada: lo único que queda es la clave.
    const links = await within(
      options.barrioLinks,
      options.timeoutMs ?? RENTAL_BARRIO_LINK_TIMEOUT_MS
    )
    const barrio = rentalGoneBarrioFromKey(key, links?.values() ?? [])
    const department = barrio?.department ?? rentalGoneDepartmentFromKey(key)
    if (!department) return null
    return {
      gone: {
        department,
        neighborhood: barrio?.label ?? null,
        propertyType: null,
        bedrooms: null,
        lastSeen: null,
      },
      lookalike: null,
      similar: [],
      barrioLink: barrio ? { path: barrio.path, label: barrio.label } : null,
    }
  }
  const stale = goneRow(doc)
  const priced = rentalPageReprice(stale, options.usdUyu)
  const stages = rentalPageEvidenceStages(stale as unknown as RentalPublicProperty)
  const peers = stages
    ? await RentalListingModel.aggregate<RentalPageEvidence>(stages).collation(RENTAL_COLLATION)
    : []
  const keys = rentalPageSimilarKeys(
    priced,
    peers.map(peer => rentalPageReprice(peer, options.usdUyu))
  )
  const rows = keys.length
    ? await RentalListingModel.aggregate<RentalPublicProperty>(
        rentalPageSimilarStages(keys)
      ).collation(RENTAL_COLLATION)
    : []
  const { similar, copies } = rentalPageSimilar(
    priced as unknown as RentalPublicProperty,
    rows.map(row => rentalPageReprice(row, options.usdUyu)),
    RENTAL_GONE_SIMILAR_LIMIT
  )
  const barrioLink = await resolveIndexableBarrioLink(stale.department, stale.neighborhood, {
    links: options.barrioLinks,
    timeoutMs: options.timeoutMs,
  })
  return {
    gone: {
      department: stale.department || null,
      neighborhood: stale.neighborhood || null,
      propertyType: stale.propertyType,
      bedrooms: stale.bedrooms,
      lastSeen: /^\d{4}-\d{2}-\d{2}$/.test(stale.lastSeen) ? stale.lastSeen : null,
    },
    lookalike: copies[0] ?? null,
    similar,
    barrioLink,
  }
}
