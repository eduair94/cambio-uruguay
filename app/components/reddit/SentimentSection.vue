<template>
  <section class="reddit-section" :aria-label="title">
    <h2 class="reddit-heading mb-1">{{ title }}</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      <slot name="intro">
        Nuestro puntaje es nuestro criterio. Esto es el contrapeso: lo que dicen los uruguayos en
        Reddit. Todos los días leemos los hilos de
        <span class="text-medium-emphasis">{{ subs }}</span
        >, atribuimos cada frase a la marca de la que habla y la puntuamos. El número sale de las
        opiniones, no de las menciones al pasar —y si a alguien casi nadie lo juzgó, decimos
        <em>sin datos</em> en vez de inventar un veredicto.
      </slot>
    </p>

    <ClientOnly>
      <template #default>
        <VCard v-if="pending" variant="flat" class="reddit-placeholder pa-6 d-flex align-center">
          <VProgressCircular indeterminate size="22" width="2" color="primary" class="mr-3" />
          <span class="text-body-2 text-medium-emphasis">Leyendo Reddit…</span>
        </VCard>

        <template v-else-if="judgedEntities.length">
          <div class="reddit-grid">
            <VCard
              v-for="e in judgedEntities"
              :key="e.id"
              variant="flat"
              class="reddit-card pa-4"
              :class="`rd-${netClass(e.net)}`"
            >
              <div class="d-flex align-center ga-2 mb-2">
                <span class="tile-mono" :style="monoStyle(e.id)">{{
                  monogram(displayName(e))
                }}</span>
                <span class="text-subtitle-2 font-weight-bold entity-name">{{
                  displayName(e)
                }}</span>
                <VChip
                  size="x-small"
                  variant="tonal"
                  class="ml-auto font-weight-bold flex-shrink-0"
                  :color="netColor(e.net)"
                >
                  {{ e.label }}
                </VChip>
              </div>

              <!-- Net sentiment, −100 … +100, drawn from the centre -->
              <div
                class="rd-bar"
                role="img"
                :aria-label="`Sentimiento neto de ${displayName(e)}: ${e.net} sobre 100`"
              >
                <span class="rd-zero" />
                <span
                  class="rd-fill"
                  :style="{
                    left: e.net >= 0 ? '50%' : `${50 + e.net / 2}%`,
                    width: `${Math.abs(e.net) / 2}%`,
                    background: netHue(e.net),
                  }"
                />
              </div>
              <p class="rd-counts mb-3">
                <strong :style="{ color: netHue(e.net) }"
                  >{{ e.net > 0 ? '+' : '' }}{{ e.net }}</strong
                >
                · {{ e.opinions }} opiniones ({{ e.positive }} 👍 / {{ e.negative }} 👎) sobre
                {{ e.mentions }} menciones
              </p>

              <p v-if="e.summary" class="reddit-summary mb-3">{{ e.summary }}</p>

              <RedditQuoteList :quotes="e.quotes" :max="maxQuotes" />

              <div v-if="e.themes.length" class="d-flex flex-wrap ga-1 mt-3">
                <VChip
                  v-for="t in e.themes.slice(0, 3)"
                  :key="t.theme"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                >
                  {{ REDDIT_THEME_LABELS[t.theme] ?? t.theme }} · {{ t.count }}
                </VChip>
              </div>
            </VCard>
          </div>

          <p v-if="unjudged.length" class="text-caption text-medium-emphasis mt-4 mb-0">
            <VIcon size="14" class="mr-1">mdi-help-circle-outline</VIcon>
            Sin datos suficientes en Reddit ({{ minSample }} opiniones mínimo):
            <strong>{{ unjudged.map(e => displayName(e)).join(', ') }}</strong
            >. Que no se hable de una marca no dice nada bueno ni malo de ella.
          </p>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            <VIcon size="14" class="mr-1">mdi-alert-outline</VIcon>
            <slot name="caveat">
              Reddit amplifica la queja: se escribe más cuando algo sale mal, y quien postea es una
              porción joven y urbana del país. Tomalo como una señal, no como el veredicto del
              mercado — por eso no toca los puntajes de arriba.
            </slot>
            <span v-if="asOf">Actualizado {{ asOf }}.</span>
          </p>
        </template>

        <VCard v-else variant="flat" class="reddit-placeholder pa-6">
          <span class="text-body-2 text-medium-emphasis">
            Todavía no hay suficientes opiniones en Reddit sobre estas marcas. Cuando las haya, las
            vas a ver acá — no inventamos un veredicto mientras tanto.
          </span>
        </VCard>
      </template>
      <template #fallback>
        <VCard variant="flat" class="reddit-placeholder pa-6">
          <span class="text-body-2 text-medium-emphasis">Cargando opiniones…</span>
        </VCard>
      </template>
    </ClientOnly>
  </section>
</template>

<script setup lang="ts">
import { monoStyle, monogram } from '~/utils/brandColors'
import {
  REDDIT_THEME_LABELS,
  netClass,
  netColor,
  netHue,
  useRedditSentiment,
  type RedditEntitySentiment,
} from '~/composables/useRedditSentiment'

const props = withDefaults(
  defineProps<{
    /** Restrict (and order) the section to these Reddit entity ids. */
    ids?: readonly string[]
    title?: string
    maxQuotes?: number
    /** Display-name overrides, e.g. { oca: 'OCA / OCA Blue' }. */
    nameFor?: Readonly<Record<string, string>>
  }>(),
  { ids: undefined, title: 'Qué dice Reddit', maxQuotes: 3, nameFor: undefined }
)

const { pending, judgedList, unjudgedList, subs, asOf, minSample } = useRedditSentiment()

const judgedEntities = computed(() => judgedList(props.ids))
const unjudged = computed(() => unjudgedList(props.ids))

function displayName(e: RedditEntitySentiment): string {
  return props.nameFor?.[e.id] ?? e.name
}
</script>

<style scoped>
/* Mirrors the .section-heading used across these pages. */
.reddit-heading {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}
.reddit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
@media (max-width: 380px) {
  .reddit-grid {
    grid-template-columns: 1fr;
  }
}
.reddit-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  min-width: 0;
}
.reddit-card.rd-neg {
  border-left: 3px solid #dc2626;
}
.reddit-card.rd-mix {
  border-left: 3px solid #ca8a04;
}
.reddit-card.rd-pos {
  border-left: 3px solid #16a34a;
}
.entity-name {
  min-width: 0;
  overflow-wrap: anywhere;
}
.tile-mono {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
/* Net sentiment bar: zero sits in the middle, the fill grows to its side. */
.rd-bar {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--v-border-color), 0.16);
  overflow: hidden;
}
.rd-zero {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(var(--v-theme-on-surface), 0.35);
}
.rd-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
}
.rd-counts {
  font-size: 0.74rem;
  opacity: 0.75;
  margin-top: 6px;
  margin-bottom: 0;
}
.reddit-summary {
  font-size: 0.85rem;
  line-height: 1.6;
  opacity: 0.9;
  overflow-wrap: anywhere;
}
.reddit-placeholder {
  border: 1px dashed rgba(var(--v-border-color), 0.25);
  border-radius: 14px;
}
</style>
