import { rentalSavedSafeUrl } from './rentalSaved'

/** Only the finite, default catalogue sequence is an indexable search URL. */
export function rentalCatalogIndexPage(
  query: Record<string, unknown>,
  pageCount: number
): number | null {
  if (Object.keys(query).some(key => key !== 'page')) return null
  const raw = query.page
  if (raw !== undefined && (typeof raw !== 'string' || !/^[1-9]\d{0,4}$/.test(raw))) return null
  const page = raw === undefined ? 1 : Number(raw)
  return page <= Math.min(10_000, pageCount) ? page : null
}

export function rentalCatalogCanonical(base: string, page: number | null): string {
  return page !== null && page > 1 ? `${base}?page=${page}` : base
}

const RENTAL_CATALOG_META = {
  es: {
    title: 'Alquileres en Uruguay: precios y mapa',
    paginatedTitle: 'Alquileres en Uruguay',
    page: 'Página',
    description:
      'Buscá casas y apartamentos en alquiler en Uruguay. Compará fotos, precios, gastos comunes y garantías de varios portales. Explorá el mapa y servicios cercanos.',
    language: 'es-UY',
  },
  en: {
    title: 'Rentals in Uruguay: prices and map',
    paginatedTitle: 'Rentals in Uruguay',
    page: 'Page',
    description:
      'Find houses and apartments for rent in Uruguay. Compare photos, prices, fees and guarantees from several portals. Explore the map and nearby services.',
    language: 'en-US',
  },
  pt: {
    title: 'Aluguéis no Uruguai: preços e mapa',
    paginatedTitle: 'Aluguéis no Uruguai',
    page: 'Página',
    description:
      'Encontre casas e apartamentos para alugar no Uruguai. Compare fotos, preços, condomínio e garantias de vários portais. Explore o mapa e os serviços próximos.',
    language: 'pt-BR',
  },
} as const

export function rentalCatalogMetadata(locale: string, page: number) {
  const copy = locale.startsWith('en')
    ? RENTAL_CATALOG_META.en
    : locale.startsWith('pt')
      ? RENTAL_CATALOG_META.pt
      : RENTAL_CATALOG_META.es
  return {
    title: page > 1 ? `${copy.paginatedTitle} · ${copy.page} ${page}` : copy.title,
    description: page > 1 ? `${copy.page} ${page}. ${copy.description}` : copy.description,
    language: copy.language,
  }
}

export interface RentalCatalogSeoItem {
  name: string
  url: string
  image: string | null | undefined
}

/** These are the cards rendered on this page, not the entire market or hidden map markers. */
export function rentalCatalogItemList(
  items: RentalCatalogSeoItem[],
  url: string,
  page: number,
  perPage: number
) {
  return {
    '@type': 'ItemList' as const,
    '@id': `${url}#rentals`,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => {
      const image = rentalSavedSafeUrl(item.image)
      return {
        '@type': 'ListItem' as const,
        position: (page - 1) * perPage + index + 1,
        item: {
          '@type': 'RealEstateListing' as const,
          name: item.name,
          url: item.url,
          ...(image ? { image } : {}),
        },
      }
    }),
  }
}
