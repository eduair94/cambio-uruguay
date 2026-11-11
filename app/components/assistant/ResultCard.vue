<template>
  <a
    class="result-card"
    :href="card.url"
    target="_blank"
    rel="noopener"
    :aria-label="ariaLabel"
    data-testid="assistant-result-card"
  >
    <div :class="['media', { packshot: card.vertical === 'producto' }]">
      <img
        v-if="card.image && !failed"
        :src="card.image"
        alt=""
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <AssistantArt v-else :vertical="card.vertical" />
      <span v-if="card.mentioned" class="cited">
        <VIcon icon="mdi-star-four-points" size="14" />
        En la respuesta
      </span>
    </div>

    <div class="body">
      <div class="price">{{ card.price }}</div>
      <div v-if="card.priceCaption" class="caption">{{ card.priceCaption }}</div>
      <div class="title">{{ card.title }}</div>
      <div v-if="card.facts.length" class="facts">{{ card.facts.join(' · ') }}</div>
      <ul v-if="card.badges.length" class="badges">
        <li
          v-for="badge in card.badges.slice(0, 3)"
          :key="badge.label"
          :class="['badge', badge.tone]"
        >
          {{ badge.label }}
        </li>
      </ul>
      <div class="foot">
        <span v-if="card.place" class="place">
          <VIcon icon="mdi-map-marker-outline" size="14" />
          {{ card.place }}
        </span>
        <span v-if="card.source" class="source">{{ card.source }}</span>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
import type { ResultCard } from '~/utils/chatResults'

const props = defineProps<{ card: ResultCard }>()

/** A photo can stop loading (portals rotate their CDN paths): the drawing takes its place. */
const failed = ref(false)

const ariaLabel = computed(() =>
  [
    props.card.title,
    props.card.price,
    props.card.place,
    props.card.mentioned ? 'citado en la respuesta' : '',
    'abre en una pestaña nueva',
  ]
    .filter(Boolean)
    .join(', ')
)
</script>

<style scoped>
.result-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  overflow: hidden;
  transition:
    transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.result-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}
.v-theme--dark .result-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}
.media {
  position: relative;
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  background: rgba(var(--v-theme-on-surface), 0.04);
  overflow: hidden;
}
.media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* A product's photo is a catalogue packshot on white: cropping it to fill cuts the product, so it
   is shown whole, on the white it was shot on, in both themes. */
.media.packshot {
  background: #fff;
}
.media.packshot img {
  padding: 12px;
  object-fit: contain;
}
/* The one filled mark on a card: the answer cites it. */
.cited {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24);
}
.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding: 12px 16px 16px;
}
.price {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.caption {
  margin-top: 4px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-variant-numeric: tabular-nums;
}
.title {
  margin-top: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.facts {
  margin-top: 4px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
/* The tone is a dot; the word stays in the surface's ink, so it reads in both themes. */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.5;
}
.badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.badge.good::before {
  background: rgb(var(--v-theme-success));
}
.badge.info::before {
  background: rgb(var(--v-theme-info));
}
.badge.warn::before {
  background: rgb(var(--v-theme-warning));
}
.foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.place {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.source {
  margin-left: auto;
  flex-shrink: 0;
}
@media (prefers-reduced-motion: reduce) {
  .result-card:hover {
    transform: none;
  }
}
</style>
