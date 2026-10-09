<!--
  Las fotos de una tarjeta de propiedad, en carrusel.

  Una tira con `scroll-snap`: en el teléfono se desliza con el dedo, sin JavaScript de por medio; con
  mouse aparecen flechas al pasar por encima o con foco. Tocar una foto abre el visor a pantalla
  completa EN ESA FOTO (`open`): el carrusel, el visor y la ficha ordenan las fotos igual.

  Las primeras fotos llegan con la búsqueda; si la propiedad tiene más, se piden al acercarse al
  final (`usePropertyGalleries`, el mismo caché del visor, así que nadie las pide dos veces). Una foto
  que no carga deja un hueco con un ícono, no corre las demás: el número de cada foto tiene que
  seguir siendo el del visor. Si no carga ninguna, la tarjeta pasa a "sin foto" (`failed`).

  En la miniatura angosta de la tarjeta horizontal (menos de 200 px) no entran flechas ni contador:
  quedan los puntos, que dicen lo mismo en una línea.
-->
<template>
  <div
    class="photo-carousel"
    :class="{ 'is-raised': raisedIndicator }"
    role="region"
    :aria-roledescription="t('photoViewer.carouselRole')"
    :aria-label="t('photoViewer.carousel', { title })"
    @keydown.left.prevent="go(index - 1)"
    @keydown.right.prevent="go(index + 1)"
  >
    <div ref="track" class="photo-carousel__track" @scroll.passive="onScroll">
      <button
        v-for="(photo, position) in slides"
        :key="photo.url"
        type="button"
        class="photo-carousel__slide"
        :tabindex="position === index ? 0 : -1"
        :aria-label="t('photoViewer.openPhoto', { n: position + 1, total: count })"
        @click="emit('open', position)"
      >
        <img
          v-if="!failed.has(photo.url)"
          :src="photo.url"
          :alt="t('photoViewer.photoAlt', { title, n: position + 1 })"
          :loading="eager && position === 0 ? 'eager' : 'lazy'"
          decoding="async"
          width="400"
          height="260"
          referrerpolicy="no-referrer"
          @load="checkLoaded(photo.url, $event.target as HTMLImageElement)"
          @error="markFailed(photo.url)"
        />
        <span v-else class="photo-carousel__missing" aria-hidden="true">
          <VIcon size="28">mdi-image-off-outline</VIcon>
        </span>
      </button>
    </div>
    <template v-if="count > 1">
      <button
        type="button"
        class="photo-carousel__arrow is-prev"
        :disabled="index === 0"
        :aria-label="t('photoViewer.previous')"
        @click="go(index - 1)"
      >
        <span class="photo-carousel__arrow-face"><VIcon size="22">mdi-chevron-left</VIcon></span>
      </button>
      <button
        type="button"
        class="photo-carousel__arrow is-next"
        :disabled="index >= count - 1"
        :aria-label="t('photoViewer.next')"
        @click="go(index + 1)"
      >
        <span class="photo-carousel__arrow-face"><VIcon size="22">mdi-chevron-right</VIcon></span>
      </button>
      <span class="photo-carousel__count" aria-hidden="true">{{ index + 1 }} / {{ count }}</span>
      <span class="photo-carousel__dots" aria-hidden="true">
        <span v-for="dot in dots" :key="dot" :class="{ 'is-on': dot === activeDot }" />
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PropertyGallerySource, PropertyPhotoRef } from '~/utils/photoViewer'

const props = withDefaults(
  defineProps<{
    /** Lo que la tarjeta ya tiene: las primeras fotos, o la portada sola. */
    photos: PropertyPhotoRef[]
    /** Cuántas fotos tiene la propiedad en total; sin el dato, se averigua al llegar al final. */
    total?: number | null
    /** De dónde pedir las fotos que la búsqueda no mandó. */
    source?: PropertyGallerySource | null
    title: string
    /** La primera foto de las tarjetas de arriba se pide ya: es lo primero que se ve. */
    eager?: boolean
    /** Sube los puntos cuando hay una chapa al pie de la foto (la de "N portales"). */
    raisedIndicator?: boolean
  }>(),
  { total: null, source: null, eager: false, raisedIndicator: false }
)
const emit = defineEmits<{ open: [index: number]; failed: [] }>()
const { t } = useI18n()
const { load, cached, checkLoaded, real } = usePropertyGalleries()

const track = ref<HTMLElement | null>(null)
const index = ref(0)
const failed = ref(new Set<string>())
const asked = ref(false)

const slides = computed(() => {
  const gallery = cached(props.source)
  // El mismo orden de un lado y del otro: la galería completa sólo agrega fotos al final.
  return real(gallery && gallery.length >= props.photos.length ? gallery : props.photos)
})
// Sin el total de la búsqueda, lo que se sabe es lo cargado; una vez pedida la galería, eso es todo.
const count = computed(() => Math.max(slides.value.length, asked.value ? 0 : props.total || 0))

// Hasta 8 puntos: con más fotos, cada punto es un tramo y se enciende el que contiene la actual.
const DOTS = 8
const dots = computed(() => Array.from({ length: Math.min(count.value, DOTS) }, (_, i) => i))
const activeDot = computed(() =>
  count.value <= DOTS ? index.value : Math.round((index.value * (DOTS - 1)) / (count.value - 1))
)

async function loadMore() {
  if (asked.value || !props.source) return
  asked.value = true
  await load(props.source)
}

function reducedMotion(): boolean {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

async function go(target: number) {
  const next = Math.min(Math.max(target, 0), Math.max(count.value - 1, 0))
  if (next >= slides.value.length) await loadMore()
  const element = track.value
  if (!element || next >= slides.value.length) return
  element.scrollTo({
    left: next * element.clientWidth,
    behavior: reducedMotion() ? 'auto' : 'smooth',
  })
  index.value = next
  // Con teclado el foco acompaña a la foto: si no, queda en una que ya no se ve.
  if (element.contains(document.activeElement)) {
    void nextTick(() =>
      (element.children[next] as HTMLElement | undefined)?.focus({ preventScroll: true })
    )
  }
}

let frame = 0
function onScroll() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    const element = track.value
    if (!element || !element.clientWidth) return
    index.value = Math.round(element.scrollLeft / element.clientWidth)
  })
}

// Dos fotos antes del final ya se pide el resto: llegar a la última y esperar no es un carrusel.
watch(index, position => {
  if (position >= slides.value.length - 2 && count.value > slides.value.length) void loadMore()
})

function markFailed(url: string) {
  failed.value = new Set(failed.value).add(url)
  if (slides.value.every(photo => failed.value.has(photo.url))) emit('failed')
}

watch(
  () => props.photos.map(photo => photo.url).join('\n'),
  () => {
    index.value = 0
    failed.value = new Set()
    asked.value = false
    track.value?.scrollTo({ left: 0 })
  }
)

// La primera foto de las tarjetas de arriba llega en el HTML del servidor y puede estar cargada
// antes de hidratar, cuando `load` ya no se vuelve a disparar: se revisa a mano.
onMounted(() => {
  track.value?.querySelectorAll('img').forEach((image, position) => {
    const photo = slides.value[position]
    if (image.complete && photo) checkLoaded(photo.url, image)
  })
})

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
})
</script>

<style scoped>
.photo-carousel {
  position: relative;
  width: 100%;
  height: 100%;
  container-type: inline-size;
}
/* Sin barra: la nativa de Windows mide 17 px y le come el pie a la foto. La tira se nota sola. */
.photo-carousel__track {
  display: flex;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}
.photo-carousel__track::-webkit-scrollbar {
  display: none;
}
.photo-carousel__slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  cursor: zoom-in;
}
.photo-carousel__slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-carousel__slide:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -4px;
}
.photo-carousel__missing {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(var(--v-theme-on-surface), 0.6);
  background: rgba(var(--v-theme-on-surface), 0.06);
}
/* 44 px de blanco, 36 de botón dibujado: la cara es lo que se ve, el botón es lo que se toca. */
.photo-carousel__arrow {
  position: absolute;
  top: 50%;
  translate: 0 -50%;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 150ms ease-out;
}
.photo-carousel__arrow.is-prev {
  left: 4px;
}
.photo-carousel__arrow.is-next {
  right: 4px;
}
.photo-carousel__arrow-face {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow:
    0 0 0 1px rgba(var(--v-border-color), var(--v-border-opacity)),
    0 4px 12px rgba(0, 0, 0, 0.18);
}
.photo-carousel:hover .photo-carousel__arrow:not(:disabled),
.photo-carousel:focus-within .photo-carousel__arrow:not(:disabled) {
  opacity: 1;
}
.photo-carousel__arrow:disabled {
  visibility: hidden;
}
.photo-carousel__arrow:focus-visible {
  outline: none;
}
.photo-carousel__arrow:focus-visible .photo-carousel__arrow-face {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
/* El dedo desliza: en una pantalla táctil las flechas sólo taparían la foto. */
@media (hover: none) {
  .photo-carousel__arrow {
    display: none;
  }
}
.photo-carousel__count {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  box-shadow: 0 0 0 1px rgba(var(--v-border-color), var(--v-border-opacity));
  pointer-events: none;
}
.photo-carousel__dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  translate: -50% 0;
  display: none;
  gap: 4px;
  pointer-events: none;
}
.photo-carousel__dots > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  opacity: 0.6;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.24);
  transition: opacity 150ms ease-out;
}
.photo-carousel__dots > span.is-on {
  opacity: 1;
}
.photo-carousel.is-raised .photo-carousel__dots {
  bottom: 36px;
}
@container (max-width: 199px) {
  .photo-carousel__arrow,
  .photo-carousel__count {
    display: none;
  }
  .photo-carousel__dots {
    display: flex;
  }
}
@media (prefers-reduced-motion: reduce) {
  .photo-carousel__arrow,
  .photo-carousel__dots > span {
    transition: none;
  }
}
</style>
