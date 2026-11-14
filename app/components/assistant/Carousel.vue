<template>
  <section class="carousel" :aria-label="label" aria-roledescription="carrusel">
    <header class="head">
      <VIcon :icon="icon" size="20" class="head-icon" />
      <h3 class="head-title">{{ block.title }}</h3>
      <span class="head-count">{{ countLabel }}</span>
      <VSpacer />
      <a
        v-if="block.moreUrl"
        :href="block.moreUrl"
        target="_blank"
        rel="noopener"
        class="more"
        data-link-area="assistant_cards"
      >
        Ver todos
        <VIcon icon="mdi-arrow-top-right" size="16" />
      </a>
      <div v-if="overflows" class="nav">
        <VBtn
          icon="mdi-chevron-left"
          size="small"
          variant="tonal"
          :disabled="!canPrev"
          :aria-controls="trackId"
          aria-label="Anteriores"
          @click="page(-1)"
        />
        <VBtn
          icon="mdi-chevron-right"
          size="small"
          variant="tonal"
          :disabled="!canNext"
          :aria-controls="trackId"
          aria-label="Siguientes"
          @click="page(1)"
        />
      </div>
    </header>

    <ul
      :id="trackId"
      ref="track"
      :class="['track', { 'fade-end': canNext, 'fade-start': canPrev }]"
      data-link-area="assistant_cards"
      @scroll.passive="measure"
    >
      <li v-for="card in block.cards" :key="card.id" class="slide">
        <AssistantResultCard :card="card" />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { CardsBlock } from '~/utils/chatResults'

const props = defineProps<{ block: CardsBlock }>()

const ICONS: Record<CardsBlock['vertical'], string> = {
  alquiler: 'mdi-home-city-outline',
  oportunidad: 'mdi-tag-outline',
  auto: 'mdi-car-outline',
  producto: 'mdi-shopping-outline',
}
const icon = computed(() => ICONS[props.block.vertical])
const trackId = useId()

const int = new Intl.NumberFormat('es-UY')
const countLabel = computed(() => {
  const shown = props.block.cards.length
  const total = props.block.total
  return total && total > shown ? `${int.format(shown)} de ${int.format(total)}` : int.format(shown)
})
const label = computed(() => `${props.block.title}: ${countLabel.value} resultados`)

const track = ref<HTMLElement | null>(null)
const canPrev = ref(false)
const canNext = ref(false)
const overflows = ref(false)

function measure() {
  const el = track.value
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
  overflows.value = max > 4
  canPrev.value = el.scrollLeft > 4
  canNext.value = el.scrollLeft < max - 4
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** One screenful at a time, landing on a card edge (the track snaps). */
function page(direction: 1 | -1) {
  const el = track.value
  if (!el) return
  el.scrollBy({
    left: direction * el.clientWidth * 0.85,
    behavior: reducedMotion() ? 'auto' : 'smooth',
  })
}

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && track.value) {
    observer = new ResizeObserver(measure)
    observer.observe(track.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.carousel {
  min-width: 0;
}
/* Título y cuenta no se parten, así que la fila sí: en un teléfono de 320-340 px "Oportunidades ·
   8 de 1.234 · Ver todos" no entra en el ancho del turno y empujaba el chat de costado. "Ver todos"
   baja al renglón siguiente, alineado a la derecha. */
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 8px;
  margin-bottom: 8px;
  min-height: 40px;
}
.head > .more {
  margin-left: auto;
}
.head-icon {
  color: rgb(var(--v-theme-link));
}
.head-title {
  margin: 0;
  white-space: nowrap;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}
.head-count {
  white-space: nowrap;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-variant-numeric: tabular-nums;
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 4px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.more:hover {
  text-decoration: underline;
}
.nav {
  display: flex;
  gap: 4px;
}
.track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(208px, 232px);
  gap: 16px;
  margin: 0;
  /* Room for the lift and its shadow, which the scroller would otherwise clip. */
  padding: 4px 4px 12px;
  list-style: none;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 4px;
  scrollbar-width: thin;
}
.slide {
  min-width: 0;
  scroll-snap-align: start;
}
/* The fade says "there is more this way"; it only exists while there is. */
.track.fade-end {
  mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
}
.track.fade-start {
  mask-image: linear-gradient(to left, #000 calc(100% - 40px), transparent);
}
.track.fade-start.fade-end {
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 40px,
    #000 calc(100% - 40px),
    transparent
  );
}
@media (max-width: 599.98px) {
  /* A phone swipes; a peek of the next card is the affordance, and the arrows would crowd the
     header. */
  .nav {
    display: none;
  }
  .track {
    grid-auto-columns: 78%;
  }
}
</style>
