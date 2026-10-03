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
    // Sin collation: el índice único de `key` no la tiene, y con ella cada vista escanea la colección.
    .option({ maxTimeMS: 3000 })
  // Sólo viviendas: una habitación o un local no tienen "parecidas" por dormitorios ni $/m².
  if (
    !row ||
    !['apartamento', 'casa'].includes(row.propertyType) ||
    rentalPageConflicts(row).length
  )
    return null
  const origin = rentalNearbyOrigin(row)
  // La identidad es evidencia privada: se usa para decidir y no viaja más allá de esta función.
  const subjectRow: RentalRow = {
    ...row,
    offers: row.offers.map(({ identity: _identity, ...offer }) => offer),
  }
  const subject = rentalListing(subjectRow, usdUyu)
  // Sin dormitorios no hay "parecidas"; sin coordenada ni barrio no hay "cerca": en los dos casos el
  // bloque diría "0 viviendas parecidas", que es falso, así que no se muestra.
  if (!subject || !row.department?.trim() || subject.bedrooms === null) return null
  if (!origin && !row.neighborhood?.trim()) return null

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
          // Los más cercanos primero ANTES del tope: si no, en el centro el corte se lleva los de 300 m.
          { $sort: { distanceKm: 1, key: 1 } },
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

/** Lo mínimo para comparar: el detalle (título, foto) se pide después, sólo de las elegidas. */
const SALE_LITE_PROJECTION = {
  _id: 0,
  key: 1,
  propertyType: 1,
  bedrooms: 1,
  bathrooms: 1,
  neighborhood: 1,
  locality: 1,
  conditions: 1,
  'price.amount': 1,
  'price.currency': 1,
  'areas.built': 1,
  'areas.total': 1,
  'areas.reported': 1,
  'geo.lat': 1,
  'geo.lng': 1,
  'geo.precision': 1,
} as const
/** Filas livianas que se leen por consulta: una ciudad entera cabe, después se ordena por distancia. */
const MAX_SALE_LITE = 12_000

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** Una fila liviana como resumen mínimo, con los mismos nombres que el público. */
function saleLite(doc: Record<string, any>): PropertySaleSummary {
  const geo =
    finite(doc.geo?.lat) !== null && finite(doc.geo?.lng) !== null
      ? { lat: doc.geo.lat, lng: doc.geo.lng, precision: doc.geo.precision }
      : null
  return {
    key: String(doc.key ?? ''),
    title: '',
    image: null,
    propertyType: doc.propertyType === 'casa' ? 'casa' : 'apartamento',
    bedrooms: finite(doc.bedrooms),
    bathrooms: finite(doc.bathrooms),
    neighborhood: String(doc.neighborhood ?? ''),
    locality: String(doc.locality ?? ''),
    conditions: Array.isArray(doc.conditions) ? doc.conditions : [],
    price: {
      amount: finite(doc.price?.amount) ?? 0,
      currency: doc.price?.currency === 'UYU' ? 'UYU' : 'USD',
    },
    areas: {
      built: finite(doc.areas?.built),
      total: finite(doc.areas?.total),
      reported: finite(doc.areas?.reported),
      land: null,
      terrace: null,
    },
    geo,
  } as unknown as PropertySaleSummary
}

const excluded = (summary: PropertySaleSummary) =>
  !!summary.conditions?.some(condition => SALE_INSIGHT_EXCLUDED_CONDITIONS.has(condition))

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
  // Ocupada, a reformar o en pozo: el bloque dice que esas no se comparan, así que tampoco se juzga.
  if (excluded(summary) || summary.bedrooms === null) return null
  const origin = located(summary)
  // Sin coordenada, la zona es el barrio o, si no hay, la localidad; y se compara por ESE campo en
  // los dos lados (un vecino con barrio y localidad no puede quedar afuera por tener barrio).
  const zoneField: 'neighborhood' | 'locality' | null = summary.neighborhood
    ? 'neighborhood'
    : summary.locality
      ? 'locality'
      : null
  const zoneOf = (item: PropertySaleSummary) =>
    zoneField === 'locality' ? item.locality : item.neighborhood || item.locality
  const subjectListing = saleListing(summary, usdUyu, origin)
  if (!subjectListing || !summary.department) return null
  if (!origin && !zoneField) return null
  const subject = { ...subjectListing, neighborhood: zoneOf(summary) }
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
      : { [zoneField!]: zoneField === 'locality' ? summary.locality : summary.neighborhood }),
  })
    .select(SALE_LITE_PROJECTION)
    .limit(MAX_SALE_LITE)
    .collation(PROPERTY_SALES_COLLATION)
    .maxTimeMS(4000)
    .lean()
  const peers = docs
    .map(doc => saleLite(doc as Record<string, any>))
    // Ocupada, a reformar o en pozo son otro mercado: ni comparan ni se ofrecen como alternativa.
    .filter(item => !excluded(item))
    .map(item => {
      const listing = saleListing(item, usdUyu, origin)
      return listing ? { ...listing, neighborhood: zoneOf(item) } : null
    })
    .filter((item): item is PropertyInsightListing => !!item)
    .filter(item => !origin || (item.distanceKm !== null && item.distanceKm <= MAX_RADIUS_KM))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.key.localeCompare(b.key))
    .slice(0, MAX_PEERS)
  const insight = buildPropertyInsight({ subject, peers, located: !!origin, unit: 'USD' })
  if (!insight.picks.length) return insight
  // El detalle (título, foto) sólo de las elegidas.
  const full = await PropertySaleCatalogModel.find({
    ...propertySalesVisibleFilter(),
    key: { $in: insight.picks.map(item => item.listing.key) },
  })
    .select(propertySaleSummaryProjection)
    .maxTimeMS(3000)
    .lean()
  const byKey = new Map(full.map(doc => [String(doc.key), publicPropertySaleSummary(doc)]))
  insight.picks = insight.picks.flatMap(item => {
    const detail = byKey.get(item.listing.key)
    if (!detail) return []
    return [
      {
        ...item,
        listing: {
          ...item.listing,
          title: detail.title,
          image: rentalSavedSafeUrl(detail.image),
        },
      },
    ]
  })
  return insight
}
