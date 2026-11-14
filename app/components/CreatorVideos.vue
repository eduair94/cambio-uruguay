<!--
  CreatorVideos — el video de un creador uruguayo que contesta la misma pregunta que la página.

  POR QUÉ EXISTE: hay creadores que explican en video lo mismo que una página explica en tablas,
  y algunos nos mencionan. Ponerlos al lado del tema les manda audiencia que ya está interesada,
  que es la única que se suscribe. La lista y sus reglas viven en `utils/creatorVideos.ts`.

  Dos detalles que hacen que la ayuda llegue de verdad al creador:
    - el reproductor es la fachada de `videos/Embed.vue` (nada de YouTube hasta el play, sin
      cookies): la vista embebida cuenta igual para el canal;
    - los enlaces salen con `rel="noopener"` y SIN `noreferrer`, para que YouTube Analytics le
      muestre al creador que la visita vino de cambio-uruguay.com.
-->
<template>
  <section v-if="videos.length" class="creator-videos mb-6" :aria-labelledby="headingId">
    <SurfaceCard>
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon color="#cc0000" size="22" aria-hidden="true">mdi-youtube</VIcon>
        <h2 :id="headingId" class="text-h6 font-weight-bold mb-0">{{ title || t('title') }}</h2>
      </div>
      <p class="text-body-2 text-medium-emphasis creator-videos__intro">
        {{ intro || t('intro') }}
      </p>

      <div
        class="creator-videos__grid"
        :class="{ 'creator-videos__grid--single': videos.length === 1 }"
      >
        <article v-for="v in videos" :key="v.videoId" class="creator-videos__item">
          <VideosEmbed :video-id="v.videoId" :title="v.title" :thumbnail="videoThumbnail(v)" />
          <div class="creator-videos__body">
            <h3 class="creator-videos__title">
              <a
                :href="videoUrl(v)"
                target="_blank"
                rel="noopener"
                @click="onClick(v.creatorId, 'video')"
                >{{ v.title }}</a
              >
            </h3>
            <p class="creator-videos__meta">
              {{ creatorName(v.creatorId) }} ·
              <time :datetime="v.publishedAt">{{ formatVideoDate(v.publishedAt, locale) }}</time>
            </p>
            <p class="creator-videos__summary">{{ v.summary }}</p>
          </div>
        </article>
      </div>

      <div v-for="c in creators" :key="c.id" class="creator-videos__channel">
        <div class="creator-videos__channel-text">
          <a
            :href="channelUrl(c)"
            target="_blank"
            rel="noopener"
            class="creator-videos__channel-name"
            @click="onClick(c.id, 'channel')"
            >{{ c.name }}</a
          >
          <span class="creator-videos__handle">{{ c.handle }}</span>
          <p class="creator-videos__blurb">{{ c.blurb }}</p>
        </div>
        <VBtn
          :href="subscribeUrl(c)"
          target="_blank"
          rel="noopener"
          color="#cc0000"
          variant="flat"
          prepend-icon="mdi-youtube"
          class="creator-videos__subscribe"
          data-cta="creator-subscribe"
          @click="onClick(c.id, 'subscribe')"
        >
          {{ t('subscribe') }}
        </VBtn>
        <p class="creator-videos__relationship">{{ c.relationship }}</p>
      </div>
    </SurfaceCard>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import {
  channelUrl,
  creatorVideosFor,
  formatVideoDate,
  getCreator,
  subscribeUrl,
  videoThumbnail,
  videoUrl,
  type Creator,
} from '~/utils/creatorVideos'

const props = withDefaults(
  defineProps<{
    /** Ruta del sitio (sin locale) cuyos videos mostrar. */
    page: string
    /** Título del bloque; por defecto, "En video". */
    title?: string
    /** Bajada; por defecto, una genérica que dice de dónde salen. */
    intro?: string
  }>(),
  { title: '', intro: '' }
)

const { t, locale } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      title: 'Este tema, en video',
      intro:
        'Un creador uruguayo explica lo mismo en video. Lo elegimos porque contesta la pregunta de esta página; si te sirve, suscribite a su canal.',
      subscribe: 'Suscribirme al canal',
    },
    en: {
      title: 'This topic, on video',
      intro:
        'A Uruguayan creator covers the same question on video (in Spanish). We picked it because it answers what this page is about; if it helps, subscribe to the channel.',
      subscribe: 'Subscribe to the channel',
    },
    pt: {
      title: 'Este tema, em vídeo',
      intro:
        'Um criador uruguaio explica o mesmo em vídeo (em espanhol). Escolhemos porque responde à pergunta desta página; se ajudar, inscreva-se no canal.',
      subscribe: 'Inscrever-me no canal',
    },
  },
})

const route = useRoute()
const track = useTrack()

const videos = computed(() => creatorVideosFor(props.page))

const creators = computed<Creator[]>(() => {
  const ids = [...new Set(videos.value.map(v => v.creatorId))]
  return ids.map(id => getCreator(id)).filter((c): c is Creator => Boolean(c))
})

const headingId = computed(() => `creator-videos-${props.page.replace(/[^a-z0-9]+/gi, '-')}`)

function creatorName(id: string): string {
  return getCreator(id)?.name ?? ''
}

/** Para poder contarle al creador cuánta gente mandamos y por dónde. */
function onClick(creatorId: string, linkKind: 'video' | 'channel' | 'subscribe') {
  track('creator_click', { creator_id: creatorId, link_kind: linkKind, content_path: route.path })
}
</script>

<style scoped>
.creator-videos__intro {
  margin: 0 0 16px;
  max-width: 70ch;
}

/* `min(100%, …)`: en un teléfono de 320 px la tarjeta deja ~232 px y una columna de 240 fijos
   sacaba el video por el borde derecho, fuera del relleno. */
.creator-videos__grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
}

.creator-videos__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

/* Un solo video: reproductor y texto lado a lado en pantallas anchas, para que el embed no ocupe
   todo el ancho de la columna. */
@media (min-width: 760px) {
  .creator-videos__grid--single .creator-videos__item {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    align-items: center;
    gap: 20px;
  }
}

.creator-videos__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.creator-videos__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.creator-videos__title a {
  color: inherit;
  text-decoration: none;
}

.creator-videos__title a:hover,
.creator-videos__title a:focus-visible {
  text-decoration: underline;
}

.creator-videos__meta,
.creator-videos__summary {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.creator-videos__meta {
  font-size: 0.8rem;
}

.creator-videos__channel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.creator-videos__channel-text {
  flex: 1 1 260px;
  min-width: 0;
}

.creator-videos__channel-name {
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
}

.creator-videos__channel-name:hover,
.creator-videos__channel-name:focus-visible {
  text-decoration: underline;
}

/* Renglón propio: un handle es una sola palabra larga y, al lado del nombre, se cortaba en la
   última letra ("@JavierGutierrezFinanza" / "s"). */
.creator-videos__handle {
  display: block;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
  overflow-wrap: anywhere;
}

.creator-videos__blurb {
  margin: 2px 0 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.creator-videos__subscribe {
  flex: 0 0 auto;
}

.creator-videos__relationship {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
</style>
