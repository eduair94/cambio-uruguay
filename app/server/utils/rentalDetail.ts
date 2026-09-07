import {
  buildRentalFilter,
  rentalOfferStages,
  rentalPublicStages,
  type RentalOffer,
  type RentalPublicProperty,
  type RentalQuery,
} from '../../utils/rentals'
import {
  publicAdvertiserMetadata,
  publicAdvertiserProjection,
} from '../../utils/propertyAdvertiser'

const propertyFields: Array<keyof RentalPublicProperty> = [
  'key',
  'title',
  'propertyType',
  'department',
  'neighborhood',
  'address',
  'latitude',
  'longitude',
  'bedrooms',
  'bathrooms',
  'area',
  'parkingSpaces',
  'furnished',
  'petsAllowed',
  'guarantees',
  'priceUyu',
  'price',
  'currency',
  'sources',
  'freshAt',
  'firstSeen',
  'lastSeen',
]

const offerFields: Array<keyof RentalOffer> = [
  'source',
  'listingId',
  'url',
  'title',
  'price',
  'currency',
  'priceUyu',
  'commonExpenses',
  'commonExpensesCurrency',
  'sellerName',
  'sellerType',
  'image',
  'parkingSpaces',
  'furnished',
  'petsAllowed',
  'guarantees',
  'publishedAt',
  'firstSeen',
  'lastSeen',
]

/** Offers are Mixed in storage; an explicit allowlist also excludes future internal fields. */
export const rentalPublicPropertyProjection = {
  _id: 0,
  ...Object.fromEntries(propertyFields.map(field => [field, 1])),
  ...Object.fromEntries(
    ['offers', 'matchingOffer'].flatMap(parent =>
      offerFields.map(field => [`${parent}.${field}`, 1])
    )
  ),
  ...publicAdvertiserProjection('offers'),
  ...publicAdvertiserProjection('matchingOffer'),
}

/** Rich source text/photos belong on an opened property, never on each search-result card. */
export const rentalExpandedPropertyProjection = {
  ...rentalPublicPropertyProjection,
  ...publicAdvertiserProjection('offers', true),
  ...publicAdvertiserProjection('matchingOffer', true),
  ...Object.fromEntries(
    ['offers', 'matchingOffer'].flatMap(parent =>
      [
        'description',
        'images',
        'builtArea',
        'totalArea',
        'landArea',
        'terraceArea',
        'amenities',
        'guaranteeText',
      ].map(field => [`${parent}.details.${field}`, 1])
    )
  ),
}

/** Run after the Mongo projection: source URLs and every nested field are revalidated. */
export function publicRentalAdvertisers<T extends RentalPublicProperty>(property: T): T {
  const offer = (row: RentalOffer) => ({ ...row, ...publicAdvertiserMetadata(row) })
  return {
    ...property,
    offers: property.offers.map(offer),
    ...(property.matchingOffer ? { matchingOffer: offer(property.matchingOffer) } : {}),
  }
}

export function rentalDetailStages(
  key: string,
  query: RentalQuery,
  staleDays: number,
  usdUyu: number,
  excludedAdvertIds: readonly string[] = []
) {
  const { filter } = buildRentalFilter(query, staleDays, usdUyu)
  return [
    ...rentalPublicStages({ ...filter, key }, staleDays, excludedAdvertIds),
    ...rentalOfferStages(query, usdUyu),
    { $limit: 1 },
    { $project: rentalExpandedPropertyProjection },
  ]
}
