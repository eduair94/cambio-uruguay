<!--
  Vista previa de fotos de una propiedad, desde la lista del directorio.

  La lista NO trae la galería: `rentalPublicPropertyProjection` deja `details.images` afuera a
  propósito, porque 24 fotos por tarjeta multiplicarían el payload de cada búsqueda. Así que la
  portada —lo único que la tarjeta ya tiene— se muestra al instante y la galería completa se pide
  al abrir, sólo para la propiedad que se abrió. Si esa lectura falla, queda la portada: se ve
  menos, nunca se ve roto.

  Las fotos que ya se trajeron se guardan por propiedad, así volver a abrir la misma tarjeta no
  vuelve a pegarle a la API.
-->
<template>
  <MediaPhotoViewer
    v-model="open"
    :photos="photos"
    :title="property?.title || ''"
    :dialog-label="dialogLabel"
    referrer-policy="no-referrer"
  >
    <template #status>
      <p v-if="pending" class="rental-lightbox__status" role="status">{{ t('loadingPhotos') }}</p>
    </template>
    <template #credit="{ photo }">
      <a :href="photo.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">
        {{ t('photoCredit', { source: photo.sourceName }) }}
        <VIcon icon="mdi-open-in-new" size="14" />
      </a>
      <NuxtLink v-if="detailHref" :to="detailHref" @click="open = false">
        {{ t('detail') }}
        <VIcon icon="mdi-arrow-right" size="14" />
      </NuxtLink>
    </template>
  </MediaPhotoViewer>
</template>

<script setup lang="ts">
import type { PhotoViewerMedia } from '~/utils/photoViewer'
import { rentalPageMessages } from '~/utils/rentalPageMessages'
import { rentalPhotos } from '~/utils/rentalPresentation'
import {
  RENTAL_SOURCE_LABEL,
  type RentalPropertyDetailResponse,
  type RentalPublicProperty,
} from '~/utils/rentals'

const props = defineProps<{
  property: RentalPublicProperty | null
  /** Los mismos filtros con los que se armó la lista: la ficha se resuelve con ese contexto. */
  params?: Record<string, unknown>
  detailHref?: string
}>()

const open = defineModel<boolean>({ required: true })
const { t } = useI18n({ useScope: 'local', messages: rentalPageMessages })

const galleries = ref(new Map<string, RentalPublicProperty>())
const pending = ref(false)
let request: AbortController | null = null

const expanded = computed(() => {
  const key = props.property?.key
  return (key ? galleries.value.get(key) : null) ?? props.property
})

const photos = computed<PhotoViewerMedia[]>(() => {
  const property = expanded.value
  if (!property) return []
  return rentalPhotos(property).map((photo, index) => ({
    url: photo.url,
    alt: t('photoDescription', { title: photo.title || property.title, n: index + 1 }),
    sourceName: RENTAL_SOURCE_LABEL[photo.source],
    sourceUrl: photo.sourceUrl,
  }))
})

const dialogLabel = computed(() =>
  props.property ? `${t('photos')}: ${props.property.title}` : t('photos')
)

async function load(property: RentalPublicProperty) {
  if (galleries.value.has(property.key)) return
  request?.abort()
  const current = new AbortController()
  request = current
  pending.value = true
  try {
    const detail = await $fetch<RentalPropertyDetailResponse>(
      `/api/rentals/propiedad/${encodeURIComponent(property.key)}`,
      { query: props.params, signal: current.signal, retry: 0 }
    )
    if (request === current && detail?.property) {
      galleries.value = new Map(galleries.value).set(property.key, detail.property)
    }
  } catch {
    // La portada de la tarjeta sigue en pantalla; una galería que no llegó no vacía el visor.
  } finally {
    if (request === current) pending.value = false
  }
}

watch(
  [open, () => props.property?.key],
  ([isOpen]) => {
    if (!isOpen) {
      request?.abort()
      request = null
      pending.value = false
      return
    }
    if (props.property) void load(props.property)
  },
  { immediate: true }
)
</script>

<style scoped>
.rental-lightbox__status {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.72;
}
</style>
