<!--
  Las fotos de la ficha de una propiedad, en grilla: alquileres y ventas.

  Grilla y no masonry, a propósito. Las fotos de inmuebles son casi todas horizontales, y una grilla
  pareja se lee en orden; la masonry por columnas reordena (arriba-abajo por columna) y deja el pie
  desparejo. La primera foto ocupa dos por dos —es la que más pesa en la decisión y la LCP de la
  página—, las demás van recortadas a 4:3, y la foto entera está siempre a un toque: cada una abre el
  visor a pantalla completa en esa misma foto.

  Arranca mostrando cinco (la principal y cuatro): con más, la quinta dice "+N" y un botón despliega
  la grilla entera en la página, sin otro diálogo. Una foto que no carga sale de la grilla y del visor
  a la vez, para que el número de cada foto siga siendo el mismo en los dos.
-->
<template>
  <figure class="photo-grid" :aria-label="t('photoViewer.gallery', { title })">
    <div v-if="available.length" class="photo-grid__tiles" :class="`has-${layout}`">
      <button
        v-for="(photo, position) in shown"
        :key="photo.url"
        :ref="element => remember(element, position)"
        type="button"
        class="photo-grid__tile"
        :class="{ 'is-lead': position === 0 }"
        :aria-label="
          position === moreAt
            ? t('photoViewer.morePhotos', { n: hidden })
            : t('photoViewer.openPhoto', { n: position + 1, total: available.length })
        "
        @click="position === moreAt ? expand() : openAt(position)"
      >
        <img
          :src="photo.url"
          :alt="photo.alt"
          :width="position === 0 ? 960 : 480"
          :height="position === 0 ? 720 : 360"
          :loading="position === 0 ? 'eager' : 'lazy'"
          :fetchpriority="position === 0 ? 'high' : undefined"
          decoding="async"
          referrerpolicy="no-referrer"
          @load="checkLoaded(photo.url, $event.target as HTMLImageElement)"
          @error="markFailed(photo.url)"
        />
        <span v-if="position === moreAt" class="photo-grid__more" aria-hidden="true">
          +{{ hidden }}
        </span>
      </button>
    </div>
    <div v-else class="photo-grid__empty">
      <slot name="empty" />
    </div>
    <div v-if="available.length > COLLAPSED || $slots.credit" class="photo-grid__foot">
      <figcaption v-if="$slots.credit" class="photo-grid__credit">
        <slot name="credit" />
      </figcaption>
      <VBtn
        v-if="available.length > COLLAPSED"
        variant="text"
        color="primary"
        class="photo-grid__toggle cu-btn-flush"
        :prepend-icon="expanded ? 'mdi-chevron-up' : 'mdi-view-grid-outline'"
        :aria-expanded="expanded"
        @click="expanded ? collapse() : expand()"
      >
        {{
          expanded
            ? t('photoViewer.fewerPhotos')
            : t('photoViewer.allPhotos', { n: available.length })
        }}
      </VBtn>
    </div>
    <MediaPhotoViewer
      v-model="open"
      :photos="available"
      :title="title"
      :dialog-label="t('photoViewer.dialogAria', { title })"
      :start-index="start"
      referrer-policy="no-referrer"
    />
  </figure>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { PhotoViewerMedia } from '~/utils/photoViewer'

const props = defineProps<{ photos: PhotoViewerMedia[]; title: string }>()
const { t } = useI18n()

/** La principal y cuatro: dos filas parejas en la grilla de cuatro columnas. */
const COLLAPSED = 5

const failed = ref(new Set<string>())
const expanded = ref(false)
const open = ref(false)
const start = ref(0)
const tiles = new Map<number, HTMLElement>()

const { checkLoaded, real } = usePropertyGalleries()
const available = computed(() => real(props.photos).filter(photo => !failed.value.has(photo.url)))
const shown = computed(() =>
  expanded.value ? available.value : available.value.slice(0, COLLAPSED)
)
const hidden = computed(() => available.value.length - shown.value.length)
/** La última foto visible lleva el "+N" mientras haya fotos plegadas. */
const moreAt = computed(() => (hidden.value > 0 ? shown.value.length - 1 : -1))
/** De una a cuatro fotos cada cantidad tiene su composición; de cinco en adelante, la de mosaico. */
const layout = computed(() => Math.min(shown.value.length, COLLAPSED))

function remember(element: Element | ComponentPublicInstance | null, position: number) {
  if (element instanceof HTMLElement) tiles.set(position, element)
  else tiles.delete(position)
}

function openAt(position: number) {
  start.value = position
  open.value = true
}

function expand() {
  const first = shown.value.length - 1
  expanded.value = true
  // El foco sigue al contenido nuevo: la primera foto que estaba plegada.
  void nextTick(() => tiles.get(first + 1)?.focus({ preventScroll: false }))
}

function collapse() {
  expanded.value = false
  void nextTick(() => tiles.get(0)?.scrollIntoView({ block: 'nearest' }))
}

function markFailed(url: string) {
  failed.value = new Set(failed.value).add(url)
}

// Una foto que ya estaba cargada al hidratar —la principal viene en el HTML del servidor— no vuelve
// a disparar `load`: se revisa a mano.
onMounted(() => {
  for (const [position, tile] of tiles) {
    const image = tile.querySelector('img')
    const photo = shown.value[position]
    if (image?.complete && photo) checkLoaded(photo.url, image)
  }
})

// Al cerrar el visor el foco vuelve a la foto que lo abrió, no al principio de la página.
watch(open, isOpen => {
  if (!isOpen) void nextTick(() => tiles.get(start.value)?.focus({ preventScroll: true }))
})

watch(
  () => props.photos.map(photo => photo.url).join('\n'),
  () => {
    failed.value = new Set()
    expanded.value = false
    start.value = 0
  }
)
</script>

<style scoped>
.photo-grid {
  margin: 0;
  min-width: 0;
}
.photo-grid__tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  border-radius: 12px;
  overflow: hidden;
}
.photo-grid__tile {
  position: relative;
  min-width: 0;
  aspect-ratio: 4 / 3;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
  cursor: zoom-in;
}
.photo-grid__tile img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (hover: hover) {
  .photo-grid__tile:hover img {
    transform: scale(1.03);
  }
}
.photo-grid__tile:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -4px;
}
/* La principal: dos columnas por dos filas. Sin proporción propia, su alto es el de dos fotos
   chicas más el espacio entre ellas, así el mosaico cierra parejo. */
.photo-grid__tile.is-lead {
  grid-column: span 2;
  grid-row: span 2;
  aspect-ratio: auto;
}
/* Una sola foto: ancha, como el escenario que reemplaza. */
.photo-grid__tiles.has-1 {
  grid-template-columns: minmax(0, 1fr);
}
.photo-grid__tiles.has-1 .is-lead {
  grid-column: auto;
  grid-row: auto;
  aspect-ratio: 16 / 10;
  max-height: 520px;
}
/* Dos: mitad y mitad. */
.photo-grid__tiles.has-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.photo-grid__tiles.has-2 .is-lead {
  grid-column: auto;
  grid-row: auto;
  aspect-ratio: 4 / 3;
}
/* Tres: la principal a la izquierda y dos apiladas a la derecha. */
.photo-grid__tiles.has-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
/* Cuatro: la principal a lo ancho y tres debajo. */
.photo-grid__tiles.has-4 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.photo-grid__tiles.has-4 .is-lead {
  grid-column: 1 / -1;
  grid-row: auto;
  aspect-ratio: 16 / 9;
}
.photo-grid__more {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* El "+N" va sobre la foto oscurecida: es lo único que dice que hay más. */
  background: rgba(10, 14, 26, 0.56);
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.photo-grid__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-top: 8px;
}
.photo-grid__credit {
  min-width: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.photo-grid__toggle {
  margin-inline-start: auto;
}
.photo-grid__empty {
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
/* En el teléfono la grilla es de dos: la principal a lo ancho (dos por dos) y las demás de a dos. */
@media (max-width: 599px) {
  .photo-grid__tiles,
  .photo-grid__tiles.has-3,
  .photo-grid__tiles.has-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
  }
  .photo-grid__tiles.has-4 .is-lead {
    grid-column: span 2;
    grid-row: span 2;
    aspect-ratio: auto;
  }
  .photo-grid__more {
    font-size: 1.25rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .photo-grid__tile img {
    transition: none;
  }
}
</style>
