<script setup lang="ts">
import { largePhotoUrl } from '~/utils/photoSizes'
import { rentalPageMessages } from '~/utils/rentalPageMessages'
import { rentalPhotos } from '~/utils/rentalPresentation'
import { RENTAL_SOURCE_LABEL, type RentalPublicProperty } from '~/utils/rentals'

const props = defineProps<{ property: RentalPublicProperty }>()
const { t } = useI18n({ useScope: 'local', messages: rentalPageMessages })
// Todas las fotos de todos sus avisos, en el mismo orden que el carrusel de la tarjeta y el visor.
const photos = computed(() => rentalPhotos(props.property))
const media = computed(() =>
  photos.value.map((photo, index) => ({
    url: largePhotoUrl(photo.url),
    alt: t('photoDescription', { title: photo.title || props.property.title, n: index + 1 }),
    sourceName: RENTAL_SOURCE_LABEL[photo.source],
    sourceUrl: photo.sourceUrl,
  }))
)
// Ninguna foto es nuestra: cada portal que las publicó queda nombrado y enlazado a su aviso.
const credits = computed(() => {
  const bySource = new Map<string, { name: string; url: string }>()
  for (const photo of photos.value) {
    if (!bySource.has(photo.source)) {
      bySource.set(photo.source, { name: RENTAL_SOURCE_LABEL[photo.source], url: photo.sourceUrl })
    }
  }
  return [...bySource.values()]
})
</script>

<template>
  <PropertyPhotoGrid
    :photos="media"
    :title="property.title"
    class="property-gallery"
    data-testid="rental-property-gallery"
  >
    <template v-if="credits.length" #credit>
      <span>{{ $t('photoViewer.credit') }}</span>
      <span v-for="credit in credits" :key="credit.url" class="property-gallery__credit">
        <a :href="credit.url" target="_blank" rel="noopener noreferrer nofollow">{{
          credit.name
        }}</a>
      </span>
    </template>
    <template #empty>
      <VIcon icon="mdi-home-city-outline" size="44" /><span>{{ t('noGallery') }}</span>
    </template>
  </PropertyPhotoGrid>
</template>

<style scoped>
.property-gallery__credit {
  margin-inline-start: 4px;
}
/* Entre un portal y el siguiente, un punto medio; el lector de pantalla ya separa los enlaces. */
.property-gallery__credit + .property-gallery__credit::before {
  content: '·';
  margin-inline-end: 4px;
}
.property-gallery :deep(a) {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.property-gallery :deep(a:focus-visible) {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
</style>
