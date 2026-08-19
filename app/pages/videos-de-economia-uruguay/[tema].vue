<template>
  <!-- Gated on `topic`: un slug desconocido tira 404 en setup, así que el render del camino de
       error queda vacío y no explota en SSR. -->
  <VContainer v-if="topic" class="page py-6 py-md-10">
    <div class="mb-4">
      <VBtn
        :to="localePath('/videos-de-economia-uruguay')"
        variant="text"
        size="small"
        class="px-1"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Videos de economía
      </VBtn>
    </div>

    <header class="hero mb-6">
      <p class="eyebrow">
        <VIcon size="small" class="mr-1">{{ topic.icon }}</VIcon>
        {{ topic.label }} · se actualiza solo
      </p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">{{ topic.h1 }}</h1>
      <p class="text-body-1 text-medium-emphasis mb-4 lead">{{ topic.intro }}</p>

      <VAlert
        v-if="snapshot && topicVideos.length"
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-clock-outline"
      >
        <strong>{{ topicVideos.length }} video{{ topicVideos.length === 1 ? '' : 's' }}</strong> en
        esta lectura, de {{ contributingChannels.length }} canal{{
          contributingChannels.length === 1 ? '' : 'es'
        }}. Última lectura: <strong>{{ capturedLabel }}</strong
        >. Los videos son de sus autores; acá se listan y se enlazan.
      </VAlert>
    </header>

    <!-- Videos -->
    <section v-if="topicVideos.length" class="mb-10">
      <h2 class="section-heading mb-1">Del más nuevo al más viejo</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        La fecha está en cada tarjeta. Se listan los videos publicados en los últimos
        {{ MAX_AGE_DAYS }} días; los Shorts quedan afuera.
      </p>
      <div class="video-grid">
        <VideosCard
          v-for="video in topicVideos"
          :key="video.videoId"
          :video="video"
          :hide-topic="topic.slug"
        />
      </div>
    </section>

    <VAlert v-else type="info" variant="tonal" class="mb-10" icon="mdi-video-off-outline">
      <p class="mb-1 font-weight-bold">
        Ahora mismo no hay videos recientes sobre {{ topic.label.toLowerCase() }}
      </p>
      <p class="mb-0 text-body-2">
        Los canales que leemos no publicaron nada del tema en los últimos {{ MAX_AGE_DAYS }} días, o
        lo publicaron con un título que no lo dice. Lo de abajo contesta la misma pregunta por
        escrito, y la lista se rearma sola en la próxima lectura.
      </p>
    </VAlert>

    <!-- Which channels are behind this topic. Unique per topic and per lectura, and it is the
         attribution the list owes: quién publicó lo que estás viendo acá. -->
    <section v-if="contributingChannels.length" class="mb-10">
      <h2 class="section-heading mb-3">Quién está publicando sobre esto</h2>
      <div class="channel-grid">
        <div v-for="channel in contributingChannels" :key="channel.id" class="channel">
          <div class="channel-head">
            <a
              v-if="channel.handle"
              :href="`https://www.youtube.com/${channel.handle}`"
              target="_blank"
              rel="noopener noreferrer"
              class="channel-name"
              >{{ channel.name }}</a
            >
            <span v-else class="channel-name">{{ channel.name }}</span>
            <VChip v-if="channel.country === 'UY'" size="x-small" variant="tonal" color="success">
              Uruguay
            </VChip>
            <VChip v-else size="x-small" variant="tonal">{{ channel.country }}</VChip>
          </div>
          <p class="channel-count">
            {{ channel.count }} video{{ channel.count === 1 ? '' : 's' }} de
            {{ topic.label.toLowerCase() }} en esta lectura.
          </p>
        </div>
      </div>
    </section>

    <!-- The site's own answer to the same question. This is what keeps a topic page from being a
         list of somebody else's videos and nothing more. -->
    <section class="mb-10">
      <h2 class="section-heading mb-1">Lo mismo, por escrito y con los números de hoy</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Un video queda fijo en el día que se grabó. Estas páginas del sitio se actualizan con los
        datos vigentes.
      </p>
      <ul class="practica">
        <li v-for="link in topic.related" :key="link.to">
          <NuxtLink :to="localePath(link.to)">{{ link.label }}</NuxtLink>
        </li>
      </ul>
    </section>

    <!-- Sibling topics: el camino lateral entre las páginas de la familia. -->
    <section class="mb-4">
      <h2 class="section-heading mb-3">Otros temas</h2>
      <div class="topic-chips">
        <VChip
          v-for="other in siblingTopics"
          :key="other.slug"
          :to="localePath(`/videos-de-economia-uruguay/${other.slug}`)"
          variant="tonal"
          color="primary"
        >
          <VIcon start size="small">{{ other.icon }}</VIcon>
          {{ other.label }}
          <span v-if="other.count" class="topic-count">{{ other.count }}</span>
        </VChip>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { VideosSnapshotDoc } from '~/server/models/VideosSnapshot'
import { buildVideoPageSchema, SITE_URL } from '~/utils/videoSchema'
import { getVideoTopicPage, VIDEO_TOPIC_PAGES, videoTopicSlugs } from '~/utils/videoTopics'

// Un slug que no está en el catálogo es 404 de verdad, no una página vacía. OJO: `validate` se
// extrae en build, así que editar la lista exige reiniciar el dev server.
definePageMeta({
  validate: route => videoTopicSlugs().includes(String(route.params.tema ?? '')),
})

/** Mirrors `MAX_AGE_DAYS` in classes/videos/refresh.ts; see the note on the hub page. */
const MAX_AGE_DAYS = 120

const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.tema ?? ''))
const topic = computed(() => getVideoTopicPage(slug.value))

// Cinturón y tiradores: `validate` ya 404ea, pero el setup también, para que el template nunca
// renderice un tema indefinido.
if (!topic.value) {
  throw createError({ statusCode: 404, statusMessage: 'Tema no encontrado' })
}

const { data: snapshot } = await useFetch<VideosSnapshotDoc | null>('/api/videos', {
  // Misma key que el hub: una sola lectura del snapshot por navegación, no una por tema visitado.
  key: 'videos-uy',
  default: () => null,
})

/** This topic's videos, newest first — on a topic page recency beats our own ranking. */
const topicVideos = computed(() =>
  (snapshot.value?.videos ?? [])
    .filter(v => v.topics.includes(slug.value))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
)

/** Channels that actually contributed to THIS topic, with their count for it. */
const contributingChannels = computed(() => {
  const counts = new Map<string, number>()
  for (const video of topicVideos.value) {
    counts.set(video.channelKey, (counts.get(video.channelKey) ?? 0) + 1)
  }
  return (snapshot.value?.channels ?? [])
    .filter(channel => counts.has(channel.id))
    .map(channel => ({ ...channel, count: counts.get(channel.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
})

const siblingTopics = computed(() =>
  VIDEO_TOPIC_PAGES.filter(t => t.slug !== slug.value).map(t => ({
    ...t,
    count: snapshot.value?.topicCounts?.[t.slug] ?? 0,
  }))
)

const capturedLabel = computed(() => {
  const at = snapshot.value?.capturedAt
  if (!at) return ''
  return new Date(at).toLocaleString('es-UY', {
    timeZone: 'America/Montevideo',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
})

const canonicalUrl = computed(() => `${SITE_URL}/videos-de-economia-uruguay/${slug.value}`)

defineOgImageComponent('Cambio', {
  title: () => topic.value?.h1 ?? 'Videos de economía',
  subtitle: () => topic.value?.label ?? '',
  tag: 'VIDEOS',
})

useSeoMeta({
  title: () => `${topic.value?.seoTitle ?? ''} | Cambio Uruguay`,
  description: () => topic.value?.seoDescription ?? '',
  ogTitle: () => topic.value?.seoTitle ?? '',
  ogDescription: () => topic.value?.seoDescription ?? '',
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => topic.value?.seoTitle ?? '',
  twitterDescription: () => topic.value?.seoDescription ?? '',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [{ name: 'keywords', content: (topic.value?.keywords ?? []).join(', ') }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(
        buildVideoPageSchema({
          url: canonicalUrl.value,
          name: topic.value?.h1 ?? '',
          description: topic.value?.seoDescription ?? '',
          // Every video listed here gets a player, so every one may be marked up.
          videos: topicVideos.value,
          capturedAt: snapshot.value?.capturedAt ?? null,
          parent: {
            name: 'Videos de economía en Uruguay',
            url: `${SITE_URL}/videos-de-economia-uruguay`,
          },
        })
      ),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 0.35rem;
}

.lead {
  max-width: 68ch;
}

.section-heading {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.25;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.channel {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  padding: 0.8rem 1rem;
}

.channel-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
}

.channel-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: inherit;
  text-decoration: none;
}

.channel-name:hover {
  text-decoration: underline;
}

.channel-count {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.topic-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.topic-count {
  margin-left: 0.45rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(var(--v-theme-primary), 0.16);
}

.practica {
  margin: 0;
  padding-left: 1.15rem;
  display: grid;
  gap: 0.5rem;
  line-height: 1.55;
}

@media (max-width: 599px) {
  .video-grid {
    grid-template-columns: 1fr;
  }
}
</style>
