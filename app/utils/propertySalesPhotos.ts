import type { PropertyPhotoRef } from './photoViewer'
import { propertySaleSourceName } from './propertySalesMessages'
import type { PropertySaleListing, PropertySaleSummary } from './propertySales'

/**
 * Las fotos de un aviso de venta para el visor.
 *
 * `PropertySaleSummary` —lo que viaja en el directorio— no tiene `images`: la galería sólo existe
 * en la ficha (`/api/property-sales/ficha/<key>`). Por eso la firma acepta las dos formas y la
 * tarjeta aporta apenas su portada hasta que alguien abre el visor.
 */
export function propertySalePhotoRefs(
  property: PropertySaleListing | PropertySaleSummary
): PropertyPhotoRef[] {
  const sourceName = propertySaleSourceName(property.source)
  const gallery = 'images' in property && Array.isArray(property.images) ? property.images : []
  const seen = new Set<string>()
  return [property.image, ...gallery].flatMap(url => {
    if (typeof url !== 'string' || !url || seen.has(url) || seen.size >= 24) return []
    seen.add(url)
    return [{ url, sourceName, sourceUrl: property.url }]
  })
}
