import {
  buildRentalFilter,
  rentalOfferStages,
  rentalPublicStages,
  type RentalOffer,
  type RentalPublicProperty,
  type RentalQuery,
} from '../../utils/rentals'

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
const publicProjection = {
  _id: 0,
  ...Object.fromEntries(propertyFields.map(field => [field, 1])),
  ...Object.fromEntries(
    ['offers', 'matchingOffer'].flatMap(parent =>
      offerFields.map(field => [`${parent}.${field}`, 1])
    )
  ),
}

export function rentalDetailStages(
  key: string,
  query: RentalQuery,
  staleDays: number,
  usdUyu: number
) {
  const { filter } = buildRentalFilter(query, staleDays, usdUyu)
  return [
    ...rentalPublicStages({ ...filter, key }, staleDays),
    ...rentalOfferStages(query, usdUyu),
    { $limit: 1 },
    { $project: publicProjection },
  ]
}
