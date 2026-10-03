// Los datos de utils/propertyInsight.ts#buildPropertyInsight para una ficha de alquiler o de venta.
//
// Las dos operaciones leen lo mismo con reglas propias: qué coordenada es del aviso (alquiler: la
// política de rentalNearbyOrigin, la misma que usan los servicios cercanos y el orden por distancia;
// venta: `geo.precision` exacta o aproximada), en qué moneda se compara (alquiler en pesos sin gastos
// comunes, venta en dólares) y qué superficie vale para el $/m². Nunca se usa una coordenada que no
// sea propia del aviso, ni una que mande quien pide.
import {
  buildPropertyInsight,
  PROPERTY_INSIGHT_RADII_KM,
  type PropertyInsight,
  type PropertyInsightListing,
} from '../../utils/propertyInsight'
import { haversineKm } from '../../utils/nearbyRates'
import { rentalNearbyOrigin } from '../../utils/propertyNearby'
import { rentalDistanceStages } from '../../utils/rentalDistance'
import { rentalPricePerM2 } from '../../utils/rentalPricePerM2'
import { rentalPropertyPath } from '../../utils/rentalPresentation'
import { rentalSavedSafeUrl } from '../../utils/rentalSaved'
import {
  RENTAL_COLLATION,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalPublicStages,
  type RentalPublicProperty,
} from '../../utils/rentals'
import {
  PROPERTY_SALES_COLLATION,
  propertySalePath,
  type PropertySaleSummary,
} from '../../utils/propertySales'
import { propertySalesVisibleFilter } from '../../utils/propertySalesQuery'
import { propertySaleLivingArea, propertySalePricePerM2 } from '../../utils/propertySalePricePerM2'
import { PropertySaleCatalogModel } from '../models/PropertySaleCatalog'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import { loadPropertySalesMeta } from './propertySales'
import { propertySaleSummaryProjection, publicPropertySaleSummary } from './propertySalesPublic'
import {
  RENTAL_PAGE_STALE_DAYS,
  rentalPageConflicts,
  rentalPageReprice,
  unambiguousRentalPeers,
  type RentalPageEvidence,
} from './rentalPage'

const MAX_RADIUS_KM = PROPERTY_INSIGHT_RADII_KM[PROPERTY_INSIGHT_RADII_KM.length - 1]
/** Tope de filas por lectura: alcanza para el barrio más poblado a 5 km. */
const MAX_PEERS = 2_500
/** ~5,5 km de latitud; en longitud, a la latitud de Uruguay, ~5,5 km con 0,06°. */
const BOX_LAT = 0.05
const BOX_LNG = 0.06

// ---------------------------------------------------------------------------------------------
// Alquiler
// ---------------------------------------------------------------------------------------------

type RentalRow = RentalPageEvidence &
  Pick<RentalPublicProperty, 'area' | 'latitude' | 'longitude'> & {
    distanceKm?: number | null
    offers: Array<RentalPageEvidence['offers'][number] & { image?: string | null }>
    matchingOffer?: RentalPageEvidence['matchingOffer'] & { image?: string | null }
  }

const RENTAL_FIELDS = [
  'key',
  'title',
  'department',
  'neighborhood',
  'propertyType',
  'bedrooms',
  'bathrooms',
  'area',
  'price',
  'currency',
  'priceUyu',
]
const RENTAL_OFFER_FIELDS = [
  'source',
  'listingId',
  'title',
  'price',
  'currency',
  'priceUyu',
  'image',
]

function rentalListing(row: RentalRow, usdUyu: number): PropertyInsightListing | null {
  const priced = rentalPageReprice(row, usdUyu) as RentalRow
  if (!(priced.priceUyu > 0)) return null
  const offer = priced.matchingOffer ?? priced.offers[0]
  return {
    key: priced.key,
    path: rentalPropertyPath(priced.key),
    title: String(priced.title ?? ''),
    image: rentalSavedSafeUrl(offer?.image),
    propertyType: priced.propertyType,
    bedrooms: priced.bedrooms ?? null,
    bathrooms: priced.bathrooms ?? null,
    area: typeof priced.area === 'number' ? priced.area : null,
    price: priced.priceUyu,
    shown: {
      amount: offer?.price ?? priced.price,
      currency: (offer?.currency ?? priced.currency) === 'USD' ? 'USD' : 'UYU',
    },
    pricePerM2: rentalPricePerM2({
      propertyType: priced.propertyType,
      area: typeof priced.area === 'number' ? priced.area : null,
      bedrooms: priced.bedrooms ?? null,
      priceUyu: priced.priceUyu,
    }),
    neighborhood: String(priced.neighborhood ?? ''),
    distanceKm: typeof row.distanceKm === 'number' ? row.distanceKm : null,
  }
}

export async function loadRentalInsight(key: string): Promise<PropertyInsight | null> {
  await connectDb()
  const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' }).select({ usdUyu: 1 }).lean()
  const usdUyu = Number(meta?.usdUyu) || 0
  const [row] = await RentalListingModel.aggregate<
    RentalRow & { offers: Array<{ identity?: Record<string, unknown> }> }
  >([
    ...rentalPublicStages({ key }, RENTAL_PAGE_STALE_DAYS),
    { $limit: 1 },
    {
      $project: {
        _id: 0,
        latitude: 1,
        longitude: 1,
        ...Object.fromEntries(RENTAL_FIELDS.map(field => [field, 1])),
        ...Object.fromEntries(RENTAL_OFFER_FIELDS.map(field => [`offers.${field}`, 1])),
        'offers.identity.version': 1,
        'offers.identity.latitude': 1,
        'offers.identity.longitude': 1,
        'offers.identity.addressHidden': 1,
      },
    },
  ])
    .collation(RENTAL_COLLATION)
    .option({ maxTimeMS: 3000 })
  if (!row || rentalPageConflicts(row).length) return null
  const origin = rentalNearbyOrigin(row)
  // La identidad es evidencia privada: se usa para decidir y no viaja más allá de esta función.
  const subjectRow: RentalRow = {
    ...row,
    offers: row.offers.map(({ identity: _identity, ...offer }) => offer),
  }
  const subject = rentalListing(subjectRow, usdUyu)
  if (!subject || !row.department?.trim()) return null

  const query = normalizeRentalQuery({
    department: row.department,
    type: row.propertyType,
    ...(origin || !row.neighborhood?.trim() ? {} : { neighborhoods: [row.neighborhood] }),
  })
  const { filter } = buildRentalFilter(query, RENTAL_PAGE_STALE_DAYS, 0)
  const peers = await RentalListingModel.aggregate<RentalRow>([
    ...rentalPublicStages(
      {
        ...filter,
        key: { $ne: key },
        ...(origin
          ? {
              latitude: { $gte: origin.lat - BOX_LAT, $lte: origin.lat + BOX_LAT },
              longitude: { $gte: origin.lng - BOX_LNG, $lte: origin.lng + BOX_LNG },
            }
          : {}),
      },
      RENTAL_PAGE_STALE_DAYS
    ),
    ...(origin
      ? [
          ...rentalDistanceStages({ refLat: origin.lat, refLng: origin.lng }),
          { $match: { distanceKm: { $ne: null, $lte: MAX_RADIUS_KM } } },
        ]
      : []),
    { $limit: MAX_PEERS },
    {
      $project: {
        _id: 0,
        distanceKm: 1,
        ...Object.fromEntries(RENTAL_FIELDS.map(field => [field, 1])),
        ...Object.fromEntries(RENTAL_OFFER_FIELDS.map(field => [`offers.${field}`, 1])),
      },
    },
  ])
    .collation(RENTAL_COLLATION)
    .option({ maxTimeMS: 4000 })
  const clean = unambiguousRentalPeers(subjectRow, peers).filter(
    peer => !rentalPageConflicts(peer).length
  )
  return buildPropertyInsight({
    subject,
    peers: clean
      .map(peer => rentalListing(peer, usdUyu))
      .filter((item): item is PropertyInsightListing => !!item),
    located: !!origin,
    unit: 'UYU',
  })
}

// ---------------------------------------------------------------------------------------------
// Venta
// ---------------------------------------------------------------------------------------------

const SALE_INSIGHT_EXCLUDED_CONDITIONS = new Set<string>([
  'occupied',
  'needs_renovation',
  'project',
])

const located = (summary: PropertySaleSummary) =>
  summary.geo && ['approximate', 'exact'].includes(summary.geo.precision) ? summary.geo : null

function saleListing(
  summary: PropertySaleSummary,
  usdUyu: number,
  origin: { lat: number; lng: number } | null
): PropertyInsightListing | null {
  const amount = summary.price?.amount
  if (!(amount > 0)) return null
  const priceUsd =
    summary.price.currency === 'USD' ? amount : usdUyu > 0 ? amount / usdUyu : Number.NaN
  if (!(priceUsd > 0)) return null
  const area = propertySaleLivingArea(summary.areas)
  const point = located(summary)
  return {
    key: summary.key,
    path: propertySalePath(summary.key),
    title: summary.title,
    image: rentalSavedSafeUrl(summary.image),
    propertyType: summary.propertyType,
    bedrooms: summary.bedrooms,
    bathrooms: summary.bathrooms,
    area,
    price: Math.round(priceUsd),
    shown: { amount, currency: summary.price.currency === 'USD' ? 'USD' : 'UYU' },
    pricePerM2: propertySalePricePerM2({
      propertyType: summary.propertyType,
      bedrooms: summary.bedrooms,
      area,
      priceUsd,
    }),
    neighborhood: summary.neighborhood || summary.locality,
    distanceKm: origin && point ? haversineKm(origin, { lat: point.lat, lng: point.lng }) : null,
  }
}

export async function loadPropertySaleInsight(key: string): Promise<PropertyInsight | null> {
  await connectDb()
  const [row, meta] = await Promise.all([
    PropertySaleCatalogModel.findOne({ ...propertySalesVisibleFilter(), key })
      .select(propertySaleSummaryProjection)
      .maxTimeMS(3000)
      .lean(),
    loadPropertySalesMeta(),
  ])
  if (!row) return null
  const usdUyu = meta?.usdUyu || 0
  const summary = publicPropertySaleSummary(row)
  const origin = located(summary)
  const subject = saleListing(summary, usdUyu, origin)
  if (!subject || !summary.department) return null
  const zone = summary.neighborhood
    ? { neighborhood: summary.neighborhood }
    : summary.locality
      ? { locality: summary.locality }
      : null
  if (!origin && !zone) return null
  const docs = await PropertySaleCatalogModel.find({
    ...propertySalesVisibleFilter(),
    department: summary.department,
    propertyType: summary.propertyType,
    key: { $ne: key },
    ...(origin
      ? {
          'geo.precision': { $in: ['approximate', 'exact'] },
          'geo.lat': { $gte: origin.lat - BOX_LAT, $lte: origin.lat + BOX_LAT },
          'geo.lng': { $gte: origin.lng - BOX_LNG, $lte: origin.lng + BOX_LNG },
        }
      : zone),
  })
    .select(propertySaleSummaryProjection)
    .limit(MAX_PEERS)
    .collation(PROPERTY_SALES_COLLATION)
    .maxTimeMS(4000)
    .lean()
  const peers = docs
    .map(doc => publicPropertySaleSummary(doc))
    // Ocupada, a reformar o en pozo son otro mercado: ni comparan ni se ofrecen como alternativa.
    .filter(
      item => !item.conditions?.some(condition => SALE_INSIGHT_EXCLUDED_CONDITIONS.has(condition))
    )
    .map(item => saleListing(item, usdUyu, origin))
    .filter((item): item is PropertyInsightListing => !!item)
    .filter(item => !origin || (item.distanceKm !== null && item.distanceKm <= MAX_RADIUS_KM))
  return buildPropertyInsight({ subject, peers, located: !!origin, unit: 'USD' })
}
