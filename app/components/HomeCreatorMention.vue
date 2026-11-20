<!--
  HomeCreatorMention — "Nos mencionaron en YouTube", en la portada.

  Un canal uruguayo puso a Cambio Uruguay, con enlace, en la descripción de un video. Esto lo
  devuelve: cuenta la mención con sus palabras textuales y enlace al original (la misma regla que
  `PressMentions`: nada de "nos recomendaron" sin poder verlo) y muestra videos suyos con un botón
  para suscribirse, que es lo que lo ayuda a crecer.

  Los datos viven en `utils/creatorVideos.ts` (`HOME_CREATOR_FEATURE`). Los reproductores son la
  fachada de `videos/Embed.vue`: tres miniaturas diferidas, nada de YouTube hasta el play, así que
  la portada no paga peso por esto. Los enlaces salen sin `noreferrer` para que el creador vea en
  YouTube Analytics que la visita vino de acá.
-->
<template>
  <section
    v-if="creator && videos.length"
    v-reveal
    class="creator-mention-section py-12"
    aria-labelledby="creator-mention-title"
  >
    <VContainer>
      <VRow>
        <VCol cols="12" md="10" lg="8" class="mx-auto text-center mb-6">
          <p class="creator-mention__eyebrow">
            <VIcon color="#cc0000" size="20" aria-hidden="true">mdi-youtube</VIcon>
            {{ t('eyebrow') }}
          </p>
          <h2 id="creator-mention-title" class="creator-mention__title">
            {{ t('title', { name: creator.name }) }}
          </h2>
          <p class="creator-mention__subtitle">{{ t('subtitle', { name: creator.name }) }}</p>
        </VCol>
      </VRow>

      <VRow v-if="mentionVideo" justify="center" class="mb-6">
        <VCol cols="12" md="10" lg="8">
          <figure class="creator-mention__quote">
            <blockquote>
              <p>“{{ MENTION_QUOTE }}”</p>
            </blockquote>
            <figcaption>
              {{ t('quoteSource', { name: creator.name }) }}
              <a
                :href="videoUrl(mentionVideo)"
                target="_blank"
                rel="noopener"
                @click="onClick('mention')"
                >«{{ mentionVideo.title }}»</a
              >
            </figcaption>
          </figure>
        </VCol>
      </VRow>

      <!-- En el teléfono, una tira que se desliza (la tarjeta siguiente asoma): apilados, los tres
           videos medían más de dos pantallas antes de llegar a los botones. -->
      <ul class="creator-mention__videos" :aria-label="t('videosLabel', { name: creator.name })">
        <li v-for="v in videos" :key="v.videoId" class="creator-mention__slide">
          <article class="creator-mention__card">
            <VideosEmbed :video-id="v.videoId" :title="v.title" :thumbnail="videoThumbnail(v)" />
            <div class="creator-mention__card-body">
              <h3 class="creator-mention__card-title">
                <a :href="videoUrl(v)" target="_blank" rel="noopener" @click="onClick('video')">{{
                  v.title
                }}</a>
              </h3>
              <!-- div y no párrafo: el chip es de bloque y rompería la hidratación. -->
              <div class="creator-mention__card-meta">
                <time :datetime="v.publishedAt">{{ formatVideoDate(v.publishedAt, locale) }}</time>
                <VChip
                  v-if="v.mentionsUs"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  class="ml-2"
                >
                  {{ t('mentionsUs') }}
                </VChip>
              </div>
            </div>
          </article>
        </li>
      </ul>

      <div class="creator-mention__actions d-flex justify-center flex-wrap ga-3 mt-6">
        <VBtn
          :href="subscribeUrl(creator)"
          target="_blank"
          rel="noopener"
          color="#cc0000"
          variant="flat"
          size="large"
          prepend-icon="mdi-youtube"
          data-cta="creator-subscribe"
          @click="onClick('subscribe')"
        >
          {{ t('subscribe') }}
        </VBtn>
        <VBtn
          :href="channelUrl(creator)"
          target="_blank"
          rel="noopener"
          variant="outlined"
          size="large"
          @click="onClick('channel')"
        >
          {{ t('channel') }}
        </VBtn>
        <VBtn
          :to="localePath('/videos-de-economia-uruguay')"
          variant="text"
          size="large"
          append-icon="mdi-arrow-right"
        >
          {{ t('more') }}
        </VBtn>
      </div>

      <p class="creator-mention__relationship">{{ creator.relationship }}</p>
    </VContainer>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import {
  channelUrl,
  formatVideoDate,
  getCreator,
  getCreatorVideo,
  HOME_CREATOR_FEATURE,
  subscribeUrl,
  videoThumbnail,
  videoUrl,
  type CreatorVideo,
} from '~/utils/creatorVideos'

/**
 * Textual, tal como está en la descripción del video (leída el 13/11/2026). Es el título con el
 * que el creador presenta la referencia a Cambio Uruguay y el enlace que la sigue.
 */
const MENTION_QUOTE = 'Una referencia para quienes siguen el mundo de las finanzas y la inversión'

const { t, locale } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      eyebrow: 'Nos mencionaron en YouTube',
      title: '{name} habla de Cambio Uruguay',
      subtitle:
        '{name} es un canal uruguayo de finanzas personales, inversión y psicología del dinero. Nos menciona en sus videos, y estos son algunos de los suyos: si te sirven, suscribite y ayudalo a crecer.',
      quoteSource: '— {name}, en la descripción de',
      mentionsUs: 'Nos menciona',
      subscribe: 'Suscribirme al canal',
      channel: 'Ver el canal',
      more: 'Más videos de economía',
      videosLabel: 'Videos de {name}',
    },
    en: {
      eyebrow: 'Mentioned on YouTube',
      title: '{name} talks about Cambio Uruguay',
      subtitle:
        '{name} is a Uruguayan channel about personal finance, investing and the psychology of money (in Spanish). It mentions us in its videos, and here are a few of them: if they help, subscribe and help it grow.',
      quoteSource: '— {name}, in the description of',
      mentionsUs: 'Mentions us',
      subscribe: 'Subscribe to the channel',
      channel: 'See the channel',
      more: 'More economy videos',
      videosLabel: 'Videos by {name}',
    },
    pt: {
      eyebrow: 'Fomos mencionados no YouTube',
      title: '{name} fala do Cambio Uruguay',
      subtitle:
        '{name} é um canal uruguaio de finanças pessoais, investimentos e psicologia do dinheiro (em espanhol). Ele nos menciona nos seus vídeos, e aqui estão alguns: se forem úteis, inscreva-se e ajude o canal a crescer.',
      quoteSource: '— {name}, na descrição de',
      mentionsUs: 'Menciona a gente',
      subscribe: 'Inscrever-me no canal',
      channel: 'Ver o canal',
      more: 'Mais vídeos de economia',
      videosLabel: 'Vídeos de {name}',
    },
  },
})

const localePath = useLocalePath()
const route = useRoute()
const track = useTrack()

const creator = getCreator(HOME_CREATOR_FEATURE.creatorId)
const videos: CreatorVideo[] = HOME_CREATOR_FEATURE.videoIds
  .map(id => getCreatorVideo(id))
  .filter((v): v is CreatorVideo => Boolean(v))
const mentionVideo = videos.find(v => v.mentionsUs)

/** Para poder contarle al creador cuánta gente le mandamos desde la portada. */
function onClick(linkKind: 'mention' | 'video' | 'channel' | 'subscribe') {
  track('creator_click', {
    creator_id: HOME_CREATOR_FEATURE.creatorId,
    link_kind: linkKind,
    content_path: route.path,
  })
}
</script>

<style scoped>
/* Las variables --ink/--ink-soft/--hairline las define la portada (.home-container); el
   respaldo sirve si el bloque aparece en otra parte. */
.creator-mention__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft, rgba(var(--v-theme-on-surface), 0.72));
}

.creator-mention__title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink, rgb(var(--v-theme-on-surface)));
}

.creator-mention__subtitle {
  max-width: 62ch;
  margin: 0 auto;
  font-size: 1.02rem;
  line-height: 1.6;
  color: var(--ink-soft, rgba(var(--v-theme-on-surface), 0.72));
}

/* Contorno completo, nunca pestaña lateral (DESIGN.md, "The No Side Tab Rule"). */
.creator-mention__quote {
  margin: 0;
  padding: 16px 20px;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
  text-align: center;
}

.creator-mention__quote blockquote {
  margin: 0;
}

.creator-mention__quote blockquote p {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-style: italic;
  line-height: 1.5;
  color: var(--ink, rgb(var(--v-theme-on-surface)));
}

.creator-mention__quote figcaption {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ink-soft, rgba(var(--v-theme-on-surface), 0.72));
}

.creator-mention__quote figcaption a {
  color: rgb(var(--v-theme-link));
}

.creator-mention__videos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.creator-mention__slide {
  min-width: 0;
}

/* Teléfono: tira horizontal con imán. El 84 % deja asomar la tarjeta siguiente, que es la señal de
   que se desliza; la tira llega hasta el borde de la pantalla para que no parezca cortada. */
@media (max-width: 599.98px) {
  .creator-mention__videos {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: 84%;
    gap: 12px;
    margin-inline: -16px;
    padding: 0 16px 8px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 16px;
    scrollbar-width: none;
  }

  .creator-mention__videos::-webkit-scrollbar {
    display: none;
  }

  .creator-mention__slide {
    scroll-snap-align: start;
  }

  /* Los botones, del mismo ancho y apilados: tres anchos distintos centrados parecían sueltos. */
  .creator-mention__actions > .v-btn {
    flex: 1 1 100%;
    max-width: 360px;
  }
}

.creator-mention__card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--hairline, rgba(var(--v-border-color), 0.16));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

/* La tarjeta ya redondea: el reproductor no repite el radio arriba. */
.creator-mention__card :deep(.yt) {
  border-radius: 0;
}

.creator-mention__card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 14px;
}

.creator-mention__card-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.35;
}

.creator-mention__card-title a {
  color: var(--ink, rgb(var(--v-theme-on-surface)));
  text-decoration: none;
}

.creator-mention__card-title a:hover,
.creator-mention__card-title a:focus-visible {
  text-decoration: underline;
}

.creator-mention__card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft, rgba(var(--v-theme-on-surface), 0.72));
}

.creator-mention__relationship {
  max-width: 62ch;
  margin: 16px auto 0;
  font-size: 0.78rem;
  line-height: 1.45;
  text-align: center;
  color: var(--ink-soft, rgba(var(--v-theme-on-surface), 0.72));
}
</style>
