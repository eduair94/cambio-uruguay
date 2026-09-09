<!--
  Vista previa de fotos de una propiedad, desde cualquier listado: alquileres, oportunidades y
  ventas. Ver las fotos no debería costar una navegación — al cerrar, la búsqueda, el scroll y los
  filtros siguen donde estaban.

  Ningún listado manda la galería en el payload de la búsqueda, y es a propósito
  (`rentalPublicPropertyProjection`, `propertySaleSummaryProjection`): son decenas de fotos por
  tarjeta. Así que la portada —lo único que la tarjeta ya tiene— se muestra al instante y el resto
  se pide al abrir, sólo para la propiedad abierta y una vez por propiedad. Si esa lectura falla,
  queda la portada: se ve menos, nunca se ve roto.

  Hay propiedades cuya fuente no publica galería (Mercado Libre, Facebook y Casasweb devuelven
  cero fotos extra): ahí el visor abre igual, con la portada a tamaño completo.
-->
<template>
  <MediaPhotoViewer
    v-model="open"
    :photos="media"
    :title="title"
    :dialog-label="dialogLabel"
    referrer-policy="no-referrer"
  >
    <template #status>
      <p v-if="pending" class="property-lightbox__status" role="status">
        {{ $t('photoViewer.loading') }}
      </p>
    </template>
    <template #credit="{ photo }">
      <a :href="photo.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">
        {{ $t('photoViewer.source', { source: photo.sourceName }) }}
        <VIcon icon="mdi-open-in-new" size="14" />
      </a>
      <NuxtLink v-if="detailHref" :to="detailHref" @click="open = false">
        {{ $t('photoViewer.detail') }}
        <VIcon icon="mdi-arrow-right" size="14" />
      </NuxtLink>
    </template>
  </MediaPhotoViewer>
</template>

<script setup lang="ts">
import type { PhotoViewerMedia, PropertyGallerySource, PropertyPhotoRef } from '~/utils/photoViewer'
import { rentalPhotoRefs } from '~/utils/rentalPresentation'
import { propertySalePhotoRefs } from '~/utils/propertySalesPhotos'
import type { RentalPropertyDetailResponse } from '~/utils/rentals'
import type { PropertySaleDetailResponse } from '~/utils/propertySales'

const props = withDefaults(
  defineProps<{
    title: string
    /** Lo que la tarjeta ya tenía; normalmente una sola portada. */
    photos: PropertyPhotoRef[]
    source?: PropertyGallerySource | null
    detailHref?: string
  }>(),
  { source: null, detailHref: '' }
)

const open = defineModel<boolean>({ required: true })
const { t } = useI18n()

const galleries = ref(new Map<string, PropertyPhotoRef[]>())
const pending = ref(false)
let request: AbortController | null = null

const sourceId = computed(() => (props.source ? `${props.source.kind}:${props.source.key}` : null))
const media = computed<PhotoViewerMedia[]>(() => {
  const refs = (sourceId.value ? galleries.value.get(sourceId.value) : null) ?? props.photos
  return refs.map((photo, index) => ({
    url: photo.url,
    alt: t('photoViewer.photoAlt', { title: props.title, n: index + 1 }),
    sourceName: photo.sourceName,
    sourceUrl: photo.sourceUrl,
  }))
})
const dialogLabel = computed(() => t('photoViewer.dialogAria', { title: props.title }))

async function fetchGallery(source: PropertyGallerySource): Promise<PropertyPhotoRef[]> {
  if (source.kind === 'rental') {
    const detail = await $fetch<RentalPropertyDetailResponse>(
      `/api/rentals/propiedad/${encodeURIComponent(source.key)}`,
      { query: source.params, retry: 0, signal: request?.signal }
    )
    return detail?.property ? rentalPhotoRefs(detail.property) : []
  }
  const detail = await $fetch<PropertySaleDetailResponse>(
    `/api/property-sales/ficha/${encodeURIComponent(source.key)}`,
    { retry: 0, signal: request?.signal }
  )
  return detail?.property ? propertySalePhotoRefs(detail.property) : []
}

async function load(source: PropertyGallerySource, id: string) {
  if (galleries.value.has(id)) return
  request?.abort()
  const current = new AbortController()
  request = current
  pending.value = true
  try {
    const refs = await fetchGallery(source)
    // Una ficha sin galería propia no reemplaza la portada por una lista vacía.
    if (request === current && refs.length) {
      galleries.value = new Map(galleries.value).set(id, refs)
    }
  } catch {
    // La portada de la tarjeta sigue en pantalla; una galería que no llegó no vacía el visor.
  } finally {
    if (request === current) pending.value = false
  }
}

watch(
  [open, sourceId],
  ([isOpen, id]) => {
    if (!isOpen) {
      request?.abort()
      request = null
      pending.value = false
      return
    }
    if (props.source && id) void load(props.source, id)
  },
  { immediate: true }
)
</script>

<style scoped>
.property-lightbox__status {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.72;
}
</style>
