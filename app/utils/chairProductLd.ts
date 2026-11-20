import type { ChairCatalogProduct } from '~/utils/chairCatalog'

/**
 * El `Product` del JSON-LD de la ficha de una silla (`/sillas-escritorio-uruguay/<slug>`).
 *
 * Sin `aggregateRating` ni `review`, a propósito: las estrellas de una silla son un compuesto de
 * compradores de Mercado Libre y de menciones en Reddit, no de lectores de este sitio, y la guía
 * de fragmentos de reseña de Google prohíbe agregar calificaciones de otros sitios ("Don't
 * aggregate reviews or ratings from other websites") — declararlas expone a una acción manual. La
 * nota visible se queda en la página, con sus fuentes nombradas al lado.
 *
 * Y sin precio no hay `Product`: Google exige al menos uno de `offers`, `review` o
 * `aggregateRating`, y quitada la calificación sólo queda la oferta. Una silla sin precio publica
 * sólo el rastro de migas.
 */
export function chairProductJsonLd(
  product: ChairCatalogProduct,
  url: string
): Record<string, unknown> | null {
  if (!product.price) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    model: product.model || undefined,
    image: product.images.map(image => image.url).slice(0, 4),
    description: product.verdict || undefined,
    url,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'UYU',
      lowPrice: product.price.min,
      highPrice: product.price.max,
      offerCount: product.offers.length,
      availability: 'https://schema.org/InStock',
    },
  }
}
