<!--
  Vista previa de fotos de una propiedad, desde cualquier listado: alquileres, oportunidades y
  ventas. Ver las fotos no debería costar una navegación — al cerrar, la búsqueda, el scroll y los
  filtros siguen donde estaban.

  Ningún listado manda la galería COMPLETA en el payload de la búsqueda, y es a propósito
  (`rentalPublicPropertyProjection`, `propertySaleSummaryProjection`): son decenas de fotos por
  tarjeta. La tarjeta de alquiler trae sus primeras fotos (las del carrusel) y las de venta sólo la
  portada; eso se muestra al instante y el resto se pide al abrir, sólo para la propiedad abierta y
  una vez por propiedad (`usePropertyGalleries`, el mismo caché que usa el carrusel). Si esa
  lectura falla, queda lo que la tarjeta tenía: se ve menos, nunca se ve roto. El visor abre en la
  foto que se estaba mirando (`startIndex`): tarjeta, visor y ficha usan el mismo orden.

  Hay propiedades cuya fuente no publica galería (Mercado Libre, Facebook y Casasweb devuelven
  cero fotos extra): ahí el visor abre igual, con la portada a tamaño completo.
-->
<template>
  <MediaPhotoViewer
    v-model="open"
    :photos="media"
    :title="title"
    :dialog-label="dialogLabel"
    :start-index="startIndex"
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
import { largePhotoUrl } from '~/utils/photoSizes'

const props = withDefaults(
  defineProps<{
    title: string
    /** Lo que la tarjeta ya tenía: su portada, o las fotos de su carrusel. */
    photos: PropertyPhotoRef[]
    source?: PropertyGallerySource | null
    detailHref?: string
    /** La foto que se estaba mirando en la tarjeta. */
    startIndex?: number
  }>(),
  { source: null, detailHref: '', startIndex: 0 }
)

const open = defineModel<boolean>({ required: true })
const { t } = useI18n()
const { load, cached, real } = usePropertyGalleries()

const pending = ref(false)
const sourceId = computed(() => (props.source ? `${props.source.kind}:${props.source.key}` : null))
const media = computed<PhotoViewerMedia[]>(() => {
  const gallery = cached(props.source)
  // La galería completa reemplaza a lo de la tarjeta sólo si no tiene MENOS fotos: el orden es el
  // mismo, así que la foto abierta sigue siendo la misma.
  const refs = real(gallery && gallery.length >= props.photos.length ? gallery : props.photos)
  // A pantalla completa, la foto original aunque la tarjeta muestre la chica (`largePhotoUrl`).
  return refs.map((photo, index) => ({
    url: largePhotoUrl(photo.url),
    alt: t('photoViewer.photoAlt', { title: props.title, n: index + 1 }),
    sourceName: photo.sourceName,
    sourceUrl: photo.sourceUrl,
  }))
})
const dialogLabel = computed(() => t('photoViewer.dialogAria', { title: props.title }))

let reading = 0
// Se abre con v-model, sin activador: al cerrar, el foco volvería al principio de la página. Vuelve
// a lo que lo abrió (la foto del carrusel, la de la tarjeta), si sigue en la página.
let opener: HTMLElement | null = null
watch(open, isOpen => {
  if (!import.meta.client) return
  if (isOpen) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return
  }
  const target = opener
  opener = null
  if (target?.isConnected) void nextTick(() => target.focus({ preventScroll: true }))
})

watch(
  [open, sourceId],
  async ([isOpen]) => {
    const current = ++reading
    if (!isOpen || !props.source || cached(props.source)) {
      pending.value = false
      return
    }
    pending.value = true
    await load(props.source)
    // Una lectura de una propiedad anterior no apaga el aviso de la que está abierta ahora.
    if (current === reading) pending.value = false
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
