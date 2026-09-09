<!--
  Visor de fotos a pantalla completa: una pista deslizable sobre todas las fotos que tenemos, con
  clic para acercar sobre la actual. El crédito y el enlace al origen quedan siempre visibles —
  estas son fotos de catálogos y avisos ajenos, nunca tomas propias.

  Salió del visor de sillas y ahora lo comparten la galería de sillas y la de alquileres. Lo único
  que cambia entre uno y otro es el texto del crédito (`credit`), así que va por slot: el resto
  —zoom, paneo, teclado, miniaturas, deslizar— es el mismo trabajo en las dos páginas.

  Las fotos de los portales caducan: cuando una da error se marca y la navegación la saltea, en vez
  de dejar un hueco que el usuario tiene que cruzar a mano.
-->
<template>
  <VDialog
    v-model="open"
    :max-width="1180"
    :fullscreen="fullscreen"
    :scrim-opacity="0.86"
    :aria-label="dialogLabel || $t('photoViewer.dialogAria', { title })"
    @after-leave="reset"
  >
    <div ref="surface" class="viewer" tabindex="-1" @keydown="onKeydown">
      <header class="viewer__bar">
        <div class="viewer__id">
          <p class="viewer__title">{{ title }}</p>
          <p v-if="photos.length > 1" class="viewer__counter">
            {{ $t('photoViewer.counter', { index: index + 1, total: photos.length }) }}
          </p>
        </div>

        <div class="viewer__tools">
          <VBtn
            variant="text"
            size="small"
            icon="mdi-magnify-minus-outline"
            :disabled="zoom === 1"
            :aria-label="$t('photoViewer.zoomOut')"
            @click="reset"
          />
          <VBtn
            variant="text"
            size="small"
            icon="mdi-magnify-plus-outline"
            :disabled="zoom > 1"
            :aria-label="$t('photoViewer.zoomIn')"
            @click="zoomIn()"
          />
          <VBtn
            variant="text"
            size="small"
            icon="mdi-close"
            :aria-label="$t('photoViewer.close')"
            @click="open = false"
          />
        </div>
      </header>

      <div class="viewer__stage">
        <VWindow v-model="index" class="viewer__window" :touch="zoom === 1">
          <VWindowItem v-for="(photo, position) in photos" :key="photo.url" :value="position">
            <div
              class="viewer__frame"
              :class="{ 'is-zoomed': zoom > 1 && position === index }"
              role="button"
              tabindex="0"
              :aria-label="zoom > 1 ? $t('photoViewer.zoomOut') : $t('photoViewer.zoomIn')"
              @click="toggleZoom($event)"
              @keydown.enter.prevent="toggleZoom()"
              @keydown.space.prevent="toggleZoom()"
              @pointerdown="startPan"
              @pointermove="pan"
              @pointerup="endPan"
              @pointercancel="endPan"
            >
              <img
                v-if="!failed.has(photo.url)"
                :src="photo.url"
                :alt="photo.alt"
                :style="position === index ? zoomStyle : undefined"
                :loading="position === startIndex ? 'eager' : 'lazy'"
                :referrerpolicy="referrerPolicy"
                decoding="async"
                draggable="false"
                @error="markFailed(photo.url)"
              />
              <p v-else class="viewer__gone">{{ $t('photoViewer.unavailable') }}</p>
            </div>
          </VWindowItem>
        </VWindow>

        <template v-if="photos.length > 1">
          <VBtn
            class="viewer__nav is-prev"
            icon="mdi-chevron-left"
            variant="flat"
            :aria-label="$t('photoViewer.previous')"
            @click="step(-1)"
          />
          <VBtn
            class="viewer__nav is-next"
            icon="mdi-chevron-right"
            variant="flat"
            :aria-label="$t('photoViewer.next')"
            @click="step(1)"
          />
        </template>
      </div>

      <div v-if="photos.length > 1" class="viewer__thumbs">
        <button
          v-for="(photo, position) in photos"
          :key="`thumb-${photo.url}`"
          type="button"
          class="viewer__thumb"
          :class="{ 'is-active': position === index }"
          :aria-current="position === index"
          :aria-label="$t('photoViewer.goTo', { index: position + 1 })"
          :disabled="failed.has(photo.url)"
          @click="select(position)"
        >
          <img
            :src="photo.url"
            alt=""
            loading="lazy"
            decoding="async"
            :referrerpolicy="referrerPolicy"
            @error="markFailed(photo.url)"
          />
        </button>
      </div>

      <slot name="status" />

      <footer v-if="current" class="viewer__credit">
        <slot name="credit" :photo="current">
          <span>{{ current.alt }}</span>
          <a :href="current.sourceUrl" target="_blank" rel="noopener noreferrer">
            {{ $t('photoViewer.source', { source: current.sourceName }) }}
            <VIcon icon="mdi-open-in-new" size="14" />
          </a>
        </slot>
      </footer>
    </div>
  </VDialog>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { VWindow, VWindowItem } from 'vuetify/components'
import type { PhotoViewerMedia } from '~/utils/photoViewer'

const props = withDefaults(
  defineProps<{
    photos: PhotoViewerMedia[]
    title: string
    startIndex?: number
    /** Etiqueta accesible del diálogo cuando el genérico no describe lo que se está mirando. */
    dialogLabel?: string
    /** Los portales que sirven fotos de alquiler responden mejor sin `Referer`. */
    referrerPolicy?: string
  }>(),
  { startIndex: 0, dialogLabel: undefined, referrerPolicy: undefined }
)

const open = defineModel<boolean>({ required: true })

const { smAndDown } = useDisplay()

const ZOOM = 2.4
const index = ref(props.startIndex)
const zoom = ref(1)
const origin = ref({ x: 50, y: 50 })
const panning = ref(false)
const surface = ref<HTMLElement | null>(null)
const failed = ref(new Set<string>())

const fullscreen = computed(() => smAndDown.value)
const current = computed(() => props.photos[index.value] ?? props.photos[0] ?? null)
const zoomStyle = computed(() => ({
  transform: `scale(${zoom.value})`,
  transformOrigin: `${origin.value.x}% ${origin.value.y}%`,
}))

const reset = () => {
  zoom.value = 1
  origin.value = { x: 50, y: 50 }
  panning.value = false
}

const setOrigin = (event: PointerEvent | MouseEvent) => {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return
  const box = target.getBoundingClientRect()
  origin.value = {
    x: Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)),
    y: Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100)),
  }
}

const zoomIn = (event?: MouseEvent) => {
  if (event) setOrigin(event)
  zoom.value = ZOOM
}

const toggleZoom = (event?: MouseEvent) => {
  if (zoom.value > 1) reset()
  else zoomIn(event)
}

const startPan = (event: PointerEvent) => {
  if (zoom.value === 1) return
  panning.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

const pan = (event: PointerEvent) => {
  if (!panning.value) return
  event.preventDefault()
  setOrigin(event)
}

const endPan = (event: PointerEvent) => {
  panning.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
}

const select = (position: number) => {
  index.value = position
  reset()
}

/** Avanza a la próxima foto que todavía carga; una caída no puede convertirse en un callejón. */
const step = (direction: number) => {
  const total = props.photos.length
  if (!total) return
  for (let offset = 1; offset <= total; offset++) {
    const position = (((index.value + direction * offset) % total) + total) % total
    if (!failed.value.has(props.photos[position]!.url)) {
      select(position)
      return
    }
  }
}

const markFailed = (url: string) => {
  if (failed.value.has(url)) return
  failed.value = new Set(failed.value).add(url)
  if (current.value?.url === url) step(1)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowRight') step(1)
  else if (event.key === 'ArrowLeft') step(-1)
  else if (event.key === '+' || event.key === '=') zoom.value = ZOOM
  else if (event.key === '-' || event.key === '0') reset()
  else return
  event.preventDefault()
}

watch(open, async isOpen => {
  if (!isOpen) return
  index.value = Math.min(Math.max(props.startIndex, 0), Math.max(props.photos.length - 1, 0))
  reset()
  await nextTick()
  surface.value?.focus()
})
</script>

<style scoped>
.viewer {
  display: grid;
  gap: 14px;
  padding: 14px 16px 16px;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.viewer:focus {
  outline: none;
}

.viewer__bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.viewer__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
}

.viewer__counter {
  margin: 2px 0 0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.68;
}

.viewer__tools {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
}

.viewer__stage {
  position: relative;
}

.viewer__window,
.viewer__frame {
  border-radius: 12px;
}

/* Flex, not grid: a centered grid item sizes the row to the image's intrinsic height first, so
   `max-height: 100%` resolves against the image itself and a 1000px photo escapes the frame. */
.viewer__frame {
  display: flex;
  overflow: hidden;
  height: min(62vh, 560px);
  align-items: center;
  justify-content: center;
  background: #fff;
  cursor: zoom-in;
  touch-action: pan-y;
}

.viewer__frame.is-zoomed {
  cursor: zoom-out;
  touch-action: none;
}

.viewer__frame img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.viewer__gone {
  margin: 0;
  padding: 0 24px;
  color: #1c1c1c;
  font-size: 0.875rem;
  text-align: center;
}

.viewer__nav {
  position: absolute;
  top: 50%;
  translate: 0 -50%;
  background: rgba(10, 14, 26, 0.72);
  color: #fff;
}

.viewer__nav.is-prev {
  left: 8px;
}

.viewer__nav.is-next {
  right: 8px;
}

.viewer__thumbs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
}

.viewer__thumb {
  flex: 0 0 auto;
  width: 62px;
  height: 62px;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: border-color 160ms ease;
}

.viewer__thumb.is-active {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.viewer__thumb:disabled {
  opacity: 0.35;
  cursor: default;
}

.viewer__thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.viewer__credit {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
}

/* El crédito se puede reemplazar por slot, y el contenido de un slot lleva el scope del padre: sin
   `:slotted` estas reglas sólo alcanzarían al texto por defecto. */
.viewer__credit span,
.viewer__credit :slotted(span) {
  opacity: 0.72;
}

.viewer__credit a,
.viewer__credit :slotted(a) {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  color: rgb(var(--v-theme-link));
  font-weight: 700;
  text-decoration: none;
}

@media (max-width: 599px) {
  .viewer {
    align-content: start;
    height: 100%;
    border-radius: 0;
  }

  .viewer__frame {
    height: min(56vh, 420px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .viewer__frame img {
    transition: none;
  }
}
</style>
