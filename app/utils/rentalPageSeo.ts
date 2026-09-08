import { rentalPhotos, rentalStreet } from './rentalPresentation'
import { rentalSavedSafeUrl } from './rentalSaved'
import type { RentalPublicProperty } from './rentals'

interface RentalPageSchemaOptions {
  property: RentalPublicProperty
  canonical: string
  locale: string
  title: string
  description: string
  uncertain: boolean
  breadcrumbs: { name: string; url: string }[]
  photoCaption: (title: string, position: number) => string
  photoCredit: (source: ReturnType<typeof rentalPhotos>[number]['source']) => string
}

/** Page, property and original adverts are different entities; readings do not prove availability. */
export function rentalPageSchema(options: RentalPageSchemaOptions) {
  const { property, canonical, locale, title, description, uncertain } = options
  const listingId = `${canonical}#listing`
  const propertyId = `${canonical}#property`
  const breadcrumbId = `${canonical}#breadcrumbs`
  const photos = rentalPhotos(property).map((photo, index) => ({
    '@type': 'ImageObject',
    '@id': `${canonical}#photo-${index + 1}`,
    url: photo.url,
    contentUrl: photo.url,
    caption: options.photoCaption(photo.title || property.title, index + 1),
    creditText: options.photoCredit(photo.source),
    isBasedOn: photo.sourceUrl,
  }))
  const imageRefs = photos.map(photo => ({ '@id': photo['@id'] }))
  const address = rentalStreet(property)
  const residential = ['apartamento', 'casa', 'habitacion'].includes(property.propertyType)
  // Generic "area" can be land or total area. Only an uncontradicted built area is floor space.
  const builtAreas = property.offers
    .map(offer => offer.details?.builtArea)
    .filter((area): area is number => typeof area === 'number' && Number.isFinite(area) && area > 0)
  const builtArea =
    builtAreas.length && builtAreas.every(area => area === builtAreas[0]) ? builtAreas[0] : null
  const nonnegativeInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0
  const safeOffers = property.offers.filter(
    offer => rentalSavedSafeUrl(offer.url) && Number.isFinite(offer.price) && offer.price > 0
  )
  const propertyEntity = {
    '@type':
      property.propertyType === 'apartamento'
        ? 'Apartment'
        : property.propertyType === 'casa'
          ? 'House'
          : property.propertyType === 'habitacion'
            ? 'Accommodation'
            : 'Place',
    '@id': propertyId,
    name: property.title,
    mainEntityOfPage: { '@id': listingId },
    ...(photos.length ? { image: imageRefs } : {}),
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'UY',
      ...(property.department ? { addressRegion: property.department } : {}),
      ...(property.neighborhood ? { addressLocality: property.neighborhood } : {}),
      ...(address ? { streetAddress: address } : {}),
    },
    ...(residential && nonnegativeInteger(property.bedrooms)
      ? { numberOfBedrooms: property.bedrooms }
      : {}),
    ...(residential && nonnegativeInteger(property.bathrooms)
      ? { numberOfBathroomsTotal: property.bathrooms }
      : {}),
    ...(residential && builtArea
      ? { floorSize: { '@type': 'QuantitativeValue', value: builtArea, unitCode: 'MTK' } }
      : {}),
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: options.breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      },
      {
        // An ambiguous grouping remains useful to readers, but does not establish one dwelling.
        '@type': uncertain ? 'WebPage' : 'RealEstateListing',
        '@id': listingId,
        url: canonical,
        name: title,
        description,
        inLanguage: locale,
        breadcrumb: { '@id': breadcrumbId },
        ...(photos.length ? { image: imageRefs, primaryImageOfPage: imageRefs[0] } : {}),
        ...(!uncertain
          ? {
              mainEntity: { '@id': propertyId },
              about: { '@id': propertyId },
              offers: safeOffers.map(offer => ({
                '@type': 'Offer',
                url: offer.url,
                price: offer.price,
                priceCurrency: offer.currency,
                itemOffered: { '@id': propertyId },
                businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: offer.price,
                  priceCurrency: offer.currency,
                  referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
                },
              })),
            }
          : {}),
      },
      ...(!uncertain ? [propertyEntity] : []),
      ...photos,
    ],
  }
}
