<template>
  <!-- ClientOnly lives inside the component so no page can forget it: the
       snapshot is fetched client-side, so SSR would otherwise mismatch. -->
  <ClientOnly>
    <div v-if="entity" class="reddit-entity-block">
      <div class="d-flex align-center flex-wrap ga-2 mb-2">
        <VIcon size="16" color="primary">mdi-reddit</VIcon>
        <span class="text-caption font-weight-bold">{{ heading }}</span>
        <VChip
          size="x-small"
          variant="tonal"
          :color="netColor(entity.net)"
          class="font-weight-bold"
        >
          {{ entity.label }} ({{ entity.net > 0 ? '+' : '' }}{{ entity.net }})
        </VChip>
        <span class="text-caption text-medium-emphasis counts">
          {{ entity.opinions }} opiniones · {{ entity.positive }} a favor / {{ entity.negative }} en
          contra
        </span>
      </div>

      <p v-if="entity.summary" class="reddit-summary mb-2">{{ entity.summary }}</p>

      <RedditQuoteList :quotes="entity.quotes" :max="maxQuotes" show-votes />

      <p class="text-caption text-medium-emphasis mt-2 mb-0">{{ note }}</p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { netColor, useRedditSentiment } from '~/composables/useRedditSentiment'

const props = withDefaults(
  defineProps<{
    /** Reddit entity id (see REDDIT_ENTITIES). Renders nothing when unjudged. */
    entityId: string | null | undefined
    /** Override the heading, e.g. to name the issuer behind a card. */
    heading?: string
    maxQuotes?: number
    note?: string
  }>(),
  {
    heading: 'Qué dicen en Reddit',
    maxQuotes: 3,
    note: 'Comentarios reales de uruguayos, no editados. Reddit se queja más de lo que elogia: es una señal, no el veredicto — no toca el puntaje de arriba.',
  }
)

const { judged } = useRedditSentiment()
const entity = computed(() => judged(props.entityId))
</script>

<style scoped>
.reddit-entity-block {
  border-top: 1px dashed rgba(var(--v-border-color), 0.22);
  padding-top: 12px;
  margin-top: 16px;
  min-width: 0;
}
.counts {
  min-width: 0;
}
.reddit-summary {
  font-size: 0.85rem;
  line-height: 1.6;
  opacity: 0.9;
  overflow-wrap: anywhere;
}
</style>
