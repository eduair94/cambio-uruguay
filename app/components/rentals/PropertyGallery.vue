<script setup lang="ts">
import { rentalPageMessages } from '~/utils/rentalPageMessages'
import { rentalPhotos } from '~/utils/rentalPresentation'
import { RENTAL_SOURCE_LABEL, type RentalPublicProperty } from '~/utils/rentals'

const props = defineProps<{ property: RentalPublicProperty }>()
const { t } = useI18n({ useScope: 'local', messages: rentalPageMessages })
const photos = computed(() => rentalPhotos(props.property))
// El visor a pantalla completa es el mismo de todo el sitio; acá las fotos ya vinieron con la
// ficha, así que no hay nada que pedir: sólo se traducen al formato que espera.
const media = computed(() =>
  photos.value.map((photo, index) => ({
    url: photo.url,
    alt: t('photoDescription', { title: photo.title || props.property.title, n: index + 1 }),
    sourceName: RENTAL_SOURCE_LABEL[photo.source],
    sourceUrl: photo.sourceUrl,
  }))
)
const selected = ref(0)
const expanded = ref(false)
const openButton = ref<HTMLButtonElement | null>(null)
function restoreFocus() {
  openButton.value?.focus({ preventScroll: true })
}
const failed = ref(new Set<string>())
const current = computed(() => photos.value[selected.value])
const available = computed(() => photos.value.filter(photo => !failed.value.has(photo.url)))
function move(direction: number) {
  for (let offset = 1; offset <= photos.value.length; offset++) {
    const index = (selected.value + direction * offset + photos.value.length) % photos.value.length
    if (!failed.value.has(photos.value[index]!.url)) {
      selected.value = index
      break
    }
  }
}
function markFailed(url: string) {
  failed.value.add(url)
  if (current.value?.url === url) move(1)
}
// Al cerrar el visor el foco vuelve a la foto que lo abrió, no al principio de la página.
watch(expanded, isOpen => {
  if (!isOpen) void nextTick(restoreFocus)
})
watch(
  () => props.property.key,
  () => {
    selected.value = 0
    expanded.value = false
    failed.value = new Set()
  }
)
</script>

<template>
  <figure class="property-gallery" data-testid="rental-property-gallery">
    <template v-if="current && available.length">
      <button
        ref="openButton"
        type="button"
        class="property-gallery__open"
        :aria-label="`${t('expandPhoto')}: ${current.title || property.title}`"
        @click="expanded = true"
      >
        <img
          :src="current.url"
          :alt="t('photoDescription', { title: current.title || property.title, n: selected + 1 })"
          width="720"
          height="450"
          fetchpriority="high"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="markFailed(current.url)"
        />
        <span><VIcon icon="mdi-arrow-expand-all" size="18" />{{ t('expandPhoto') }}</span>
      </button>
      <div v-if="photos.length > 1" class="property-gallery__thumbs" :aria-label="t('photos')">
        <button
          v-for="(photo, index) in photos"
          :key="photo.url"
          type="button"
          :aria-label="
            t('photoNumber', { n: index + 1, source: RENTAL_SOURCE_LABEL[photo.source] })
          "
          :aria-pressed="selected === index"
          :disabled="failed.has(photo.url)"
          @click="selected = index"
        >
          <img
            :src="photo.url"
            :alt="t('photoDescription', { title: photo.title || property.title, n: index + 1 })"
            width="80"
            height="60"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            @error="markFailed(photo.url)"
          />
        </button>
      </div>
      <figcaption>
        <a :href="current.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">{{
          t('photoCredit', { source: RENTAL_SOURCE_LABEL[current.source] })
        }}</a>
        <p>{{ t('photoHint') }}</p>
      </figcaption>
    </template>
    <div v-else class="property-gallery__empty">
      <VIcon icon="mdi-home-city-outline" size="44" /><span>{{ t('noGallery') }}</span>
    </div>
    <MediaPhotoViewer
      v-model="expanded"
      :photos="media"
      :title="property.title"
      :start-index="selected"
      referrer-policy="no-referrer"
    />
  </figure>
</template>

<style scoped>
.property-gallery {
  margin: 0;
  min-width: 0;
}
.property-gallery__open {
  display: block;
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.property-gallery__open > img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 8 / 5;
  max-height: 460px;
  object-fit: contain;
}
.property-gallery__open > span {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 8px;
  font-size: 0.875rem;
}
.property-gallery__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 220px;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.property-gallery__thumbs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 2px 2px;
}
.property-gallery__thumbs button {
  flex: 0 0 84px;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  height: 64px;
}
.property-gallery__thumbs button[aria-pressed='true'] {
  border-color: rgb(var(--v-theme-primary));
}
.property-gallery__thumbs button:disabled {
  opacity: 0.35;
}
.property-gallery__thumbs img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.property-gallery figcaption {
  font-size: 0.8125rem;
  margin-top: 12px;
}
.property-gallery figcaption p {
  margin: 6px 0 0;
  line-height: 1.6;
}
.property-gallery a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.property-gallery button:focus-visible,
.property-gallery a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (max-width: 599px) {
  .property-gallery__open > img {
    max-height: 300px;
  }
}
</style>
