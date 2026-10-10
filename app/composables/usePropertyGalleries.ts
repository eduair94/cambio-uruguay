import type { PropertyGallerySource, PropertyPhotoRef } from '~/utils/photoViewer'
import { isPlaceholderPhoto } from '~/utils/photoPlaceholders'
import { rentalPhotoRefs } from '~/utils/rentalPresentation'
import { propertySalePhotoRefs } from '~/utils/propertySalesPhotos'
import type { RentalPropertyDetailResponse } from '~/utils/rentals'
import type { PropertySaleDetailResponse } from '~/utils/propertySales'

/**
 * Full property galleries, read once per property and per browser tab.
 *
 * A card carousel that runs past its preview photos and the viewer opened from that same card ask
 * for the same gallery: one read serves both. Only the browser ever writes here — the server
 * renders the cards with the preview the list already sent — so this module-level cache cannot
 * leak from one visitor's request into another's.
 */
const galleries = shallowReactive(new Map<string, PropertyPhotoRef[]>())
const pending = new Map<string, Promise<PropertyPhotoRef[]>>()
/**
 * Portal "no photo" cards found while loading (`isPlaceholderPhoto`). Shared, so the carousel, the
 * viewer and the property grid drop the same images and keep numbering every photo the same way.
 */
const placeholders = shallowReactive(new Set<string>())

export function propertyGalleryId(source: PropertyGallerySource): string {
  return `${source.kind}:${source.key}`
}

async function read(source: PropertyGallerySource): Promise<PropertyPhotoRef[]> {
  if (source.kind === 'rental') {
    const detail = await $fetch<RentalPropertyDetailResponse>(
      `/api/rentals/propiedad/${encodeURIComponent(source.key)}`,
      { query: source.params, retry: 0 }
    )
    return detail?.property ? rentalPhotoRefs(detail.property) : []
  }
  const detail = await $fetch<PropertySaleDetailResponse>(
    `/api/property-sales/ficha/${encodeURIComponent(source.key)}`,
    { retry: 0 }
  )
  return detail?.property ? propertySalePhotoRefs(detail.property) : []
}

export function usePropertyGalleries() {
  /**
   * The gallery, from the cache or a single shared read. A failure resolves to an empty list:
   * whoever asked keeps the photos it already had.
   */
  function load(source: PropertyGallerySource): Promise<PropertyPhotoRef[]> {
    const id = propertyGalleryId(source)
    const cached = galleries.get(id)
    if (cached) return Promise.resolve(cached)
    if (import.meta.server) return Promise.resolve([])
    const inflight = pending.get(id)
    if (inflight) return inflight
    const request = read(source)
      .then(refs => {
        // A property without a gallery of its own does not replace the cover with nothing.
        if (refs.length) galleries.set(id, refs)
        return refs
      })
      .catch(() => [] as PropertyPhotoRef[])
      .finally(() => pending.delete(id))
    pending.set(id, request)
    return request
  }

  function cached(source: PropertyGallerySource | null | undefined): PropertyPhotoRef[] | null {
    return source ? (galleries.get(propertyGalleryId(source)) ?? null) : null
  }

  /** Call from an image's `load`: a portal's "no photo" card leaves every list at once. */
  function checkLoaded(url: string, image: HTMLImageElement | null) {
    if (image?.naturalWidth && isPlaceholderPhoto(url, image.naturalWidth, image.naturalHeight)) {
      placeholders.add(url)
    }
  }

  /** The photos worth showing: everything but the placeholders found so far. */
  function real<T extends { url: string }>(photos: readonly T[]): T[] {
    return placeholders.size ? photos.filter(photo => !placeholders.has(photo.url)) : [...photos]
  }

  return { load, cached, checkLoaded, real }
}
