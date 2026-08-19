<!--
  One video in the list.

  The heading is a link to YouTube and the player is the facade below it: somebody who wants to
  watch here presses play, somebody who wants the channel's page clicks through. Both are offered
  because a listing that traps the visitor is the kind of page Google demotes.

  The date is always visible and never softened into "hace un tiempo". The feeds this page reads
  reach back four months, so a card with no date would let a February explainer read as today's.
-->
<template>
  <article class="video-card">
    <VideosEmbed :video-id="video.videoId" :title="video.title" :thumbnail="video.thumbnail" />

    <div class="video-card__body">
      <h3 class="video-card__title">
        <a :href="video.url" target="_blank" rel="noopener noreferrer">{{ video.title }}</a>
      </h3>

      <p class="video-card__meta">
        <a
          v-if="video.channelHandle"
          class="video-card__channel"
          :href="`https://www.youtube.com/${video.channelHandle}`"
          target="_blank"
          rel="noopener noreferrer"
          >{{ video.channelName }}</a
        >
        <span v-else class="video-card__channel">{{ video.channelName }}</span>
        <span class="video-card__sep">·</span>
        <time :datetime="video.publishedAt">{{ publishedLabel }}</time>
        <template v-if="viewsLabel">
          <span class="video-card__sep">·</span>
          <span>{{ viewsLabel }}</span>
        </template>
      </p>

      <p v-if="video.description" class="video-card__desc">{{ video.description }}</p>

      <div v-if="chips.length" class="video-card__chips">
        <VChip
          v-for="chip in chips"
          :key="chip.slug"
          :to="localePath(`/videos-de-economia-uruguay/${chip.slug}`)"
          size="small"
          variant="tonal"
          color="primary"
        >
          {{ chip.label }}
        </VChip>
        <VChip v-if="video.channelCountry === 'UY'" size="small" variant="tonal" color="success">
          Uruguay
        </VChip>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { VideoItem } from '~/server/models/VideosSnapshot'
import { getVideoTopicPage } from '~/utils/videoTopics'

const props = withDefaults(
  defineProps<{
    video: VideoItem
    /** Topic already implied by the surrounding page: shown without a chip pointing at itself. */
    hideTopic?: string
  }>(),
  { hideTopic: '' }
)

const localePath = useLocalePath()

const chips = computed(() =>
  props.video.topics
    .filter(slug => slug !== props.hideTopic)
    .map(slug => ({ slug, label: getVideoTopicPage(slug)?.label ?? slug }))
    .slice(0, 2)
)

/**
 * The publish date, in Montevideo time.
 *
 * Pinned to the zone and not to the renderer: the server formats in UTC and the browser in the
 * reader's zone, which for a Uruguayan page is both the wrong day near midnight and a hydration
 * mismatch — the exact bug the trends page already shipped once.
 */
const publishedLabel = computed(() =>
  new Date(props.video.publishedAt).toLocaleDateString('es-UY', {
    timeZone: 'America/Montevideo',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
)

/** YouTube's own view count, rounded the way YouTube itself rounds it. Null when the feed omits it. */
const viewsLabel = computed(() => {
  const n = props.video.views
  if (!n || n < 100) return ''
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} M de vistas`
  if (n >= 1000) return `${Math.round(n / 1000)} mil vistas`
  return `${n} vistas`
})
</script>

<style scoped>
.video-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.video-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.9rem 1rem 1rem;
}

.video-card__title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
}

.video-card__title a {
  color: inherit;
  text-decoration: none;
}

.video-card__title a:hover,
.video-card__title a:focus-visible {
  text-decoration: underline;
}

.video-card__meta {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.video-card__channel {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.video-card__channel:hover {
  text-decoration: underline;
}

.video-card__sep {
  margin: 0 0.35rem;
}

.video-card__desc {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.72);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.35rem;
}
</style>
