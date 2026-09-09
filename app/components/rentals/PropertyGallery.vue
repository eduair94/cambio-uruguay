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
// La portada recorta como los portales (cover). Una foto vertical —una fachada, un pasillo— se
// recortaría por la mitad, así que se la muestra entera sobre un fondo oscuro. Se decide con la
// foto ya cargada, no antes: el origen no publica las medidas.
const portrait = ref(new Set<string>())
const cover = ref<HTMLImageElement | null>(null)
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
function measure(image: HTMLImageElement | null, url: string | undefined) {
  if (!image || !url || !image.naturalWidth) return
  if (image.naturalHeight > image.naturalWidth * 0.95) portrait.value.add(url)
}
// `load` no vuelve a dispararse para una foto que ya estaba completa al hidratar —el caso normal,
// porque la portada viaja en el HTML del servidor—, así que también se mide a mano.
function measureCover() {
  void nextTick(() => measure(cover.value, current.value?.url))
}
onMounted(measureCover)
watch(selected, measureCover)
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
    portrait.value = new Set()
  }
)
</script>

<template>
  <figure class="property-gallery" data-testid="rental-property-gallery">
    <template v-if="current && available.length">
      <div class="property-gallery__stage" :class="{ 'is-portrait': portrait.has(current.url) }">
        <button
          ref="openButton"
          type="button"
          class="property-gallery__open"
          :aria-label="t('expandPhoto')"
          @click="expanded = true"
        >
          <img
            ref="cover"
            :src="current.url"
            :alt="
              t('photoDescription', { title: current.title || property.title, n: selected + 1 })
            "
            width="960"
            height="600"
            fetchpriority="high"
            decoding="async"
            referrerpolicy="no-referrer"
            @load="measure($event.target as HTMLImageElement, current.url)"
            @error="markFailed(current.url)"
          />
          <span class="property-gallery__expand"
            ><VIcon icon="mdi-arrow-expand-all" size="18" />{{ t('expandPhoto') }}</span
          >
        </button>
        <template v-if="available.length > 1">
          <button
            type="button"
            class="property-gallery__arrow is-prev"
            :aria-label="t('previousPhoto')"
            @click="move(-1)"
          >
            <VIcon icon="mdi-chevron-left" size="28" />
          </button>
          <button
            type="button"
            class="property-gallery__arrow is-next"
            :aria-label="t('nextPhoto')"
            @click="move(1)"
          >
            <VIcon icon="mdi-chevron-right" size="28" />
          </button>
        </template>
        <span class="property-gallery__count" aria-hidden="true">
          <VIcon icon="mdi-image-multiple-outline" size="16" />
          <span>{{ selected + 1 }} / {{ photos.length }}</span>
        </span>
      </div>
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
            width="96"
            height="72"
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
        <span>{{ t('photoHint') }}</span>
      </figcaption>
    </template>
    <div v-else class="property-gallery__empty">
      <VIcon icon="mdi-home-city-outline" size="44" /><span>{{ t('noGallery') }}</span>
    </div>
    <MediaPhotoViewer
      v-model="expanded"
      :photos="media"
      :title="property.title"
      :dialog-label="t('photos')"
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
/* `width: 100%` va declarado: sin él, `max-height` con una proporción angosta encoge el ANCHO y el
   escenario deja de llegar al borde de la columna (693 de 788 medidos). */
.property-gallery__stage {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  max-height: 520px;
  /* El mismo fondo tonal que la tarjeta del directorio usa detrás de una foto. */
  background: rgba(var(--v-theme-on-surface), 0.06);
}
/* Una foto vertical entra entera en un escenario más alto: con 16/10 el mismo aviso perdía un
   tercio del ancho en bandas. Es la proporción que usan los portales para fotos de celular. */
.property-gallery__stage.is-portrait {
  aspect-ratio: 4 / 3;
  max-height: 620px;
}
/* Sin este reset la foto queda 8px adentro por cada lado: es el padding que el navegador le da a
   todo <button>, y el fondo del escenario asoma alrededor como un marco que nadie dibujó. */
.property-gallery__open {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  /* `buttonface` es un gris claro y este botón cubre todo el escenario: sin esto, las bandas de
     una foto vertical salen del navegador y no de nuestra paleta. */
  background: transparent;
  cursor: zoom-in;
}
.property-gallery__open > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.property-gallery__stage.is-portrait > .property-gallery__open > img {
  object-fit: contain;
}
.property-gallery__expand,
.property-gallery__count {
  position: absolute;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  min-height: 36px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8rem;
  font-weight: 700;
  /* El contorno de un pixel es lo único que separa la pastilla de una foto clara. */
  box-shadow:
    0 0 0 1px rgba(var(--v-border-color), var(--v-border-opacity)),
    0 6px 16px rgba(0, 0, 0, 0.15);
}
.property-gallery__expand {
  right: 12px;
}
.property-gallery__count {
  left: 12px;
  font-variant-numeric: tabular-nums;
}
.property-gallery__arrow {
  position: absolute;
  top: 50%;
  translate: 0 -50%;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow:
    0 0 0 1px rgba(var(--v-border-color), var(--v-border-opacity)),
    0 6px 16px rgba(0, 0, 0, 0.15);
  opacity: 0.92;
  transition:
    opacity 150ms ease,
    background-color 150ms ease;
}
.property-gallery__arrow:hover {
  opacity: 1;
}
.property-gallery__arrow.is-prev {
  left: 12px;
}
.property-gallery__arrow.is-next {
  right: 12px;
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
/* La barra nativa de Windows mide 17px, se comía la fila y dejaba una banda gris de punta a punta.
   La miniatura cortada del borde ya dice que hay más, que es como lo resuelven los portales. */
.property-gallery__thumbs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 12px 0 0;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}
.property-gallery__thumbs::-webkit-scrollbar {
  display: none;
}
.property-gallery__thumbs button {
  flex: 0 0 96px;
  height: 72px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  overflow: hidden;
  opacity: 0.72;
  outline: 2px solid transparent;
  outline-offset: -2px;
  scroll-snap-align: start;
  transition: opacity 150ms ease;
}
.property-gallery__thumbs button:hover {
  opacity: 1;
}
.property-gallery__thumbs button[aria-pressed='true'] {
  opacity: 1;
  outline-color: rgb(var(--v-theme-primary));
}
.property-gallery__thumbs button:disabled {
  opacity: 0.3;
}
.property-gallery__thumbs img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.property-gallery figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  margin-top: 10px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
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
.property-gallery__thumbs button:focus-visible {
  outline-offset: -2px;
}
@media (max-width: 599px) {
  .property-gallery__stage {
    aspect-ratio: 4 / 3;
    max-height: 340px;
  }
  /* En una pantalla angosta lo que sobra es alto, no ancho: una foto vertical en 4/3 quedaba
     de 179px y con bandas a los costados. */
  .property-gallery__stage.is-portrait {
    aspect-ratio: 1 / 1;
    max-height: 420px;
  }
  .property-gallery__thumbs button {
    flex-basis: 84px;
    height: 64px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .property-gallery__arrow,
  .property-gallery__thumbs button {
    transition: none;
  }
}
</style>
