<!--
  El modelo explicado: el resumen de Wikipedia y hasta cuatro videos de YouTube que lo prueban
  (currency-autos-models, classes/autos/modelInfo/). Lo usan la ficha de cada aviso y la página de
  precios del modelo. Los videos son la fachada de /videos-de-economia-uruguay: nada de YouTube se
  carga hasta que alguien aprieta play.
-->
<template>
  <section class="car-model-info" data-testid="car-model-info">
    <h2 class="text-h6 mb-1">Qué es el {{ info.brand }} {{ info.model }}</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Para conocer el modelo antes de ir a verlo: qué dice la enciclopedia y quién lo probó.
    </p>

    <article v-if="info.wiki" class="car-model-info__wiki mb-6">
      <img
        v-if="info.wiki.thumbnail"
        :src="info.wiki.thumbnail"
        :alt="info.wiki.title"
        class="car-model-info__thumb"
        width="160"
        height="110"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <div>
        <h3 class="text-subtitle-1 font-weight-bold mb-1">
          {{ info.wiki.title }}
          <span v-if="info.wiki.lang === 'en'" class="text-caption text-medium-emphasis">
            (en inglés)
          </span>
        </h3>
        <p v-if="!wikiNamesModel" class="text-body-2 text-medium-emphasis mb-1">
          Wikipedia describe al {{ info.model }} dentro del artículo de {{ info.wiki.title }}.
        </p>
        <p class="text-body-2 mb-2">{{ info.wiki.extract }}</p>
        <a :href="info.wiki.url" target="_blank" rel="noopener" class="text-body-2">
          Seguir leyendo en Wikipedia
          <VIcon size="14" aria-hidden="true">mdi-open-in-new</VIcon>
        </a>
        <p class="text-caption text-medium-emphasis mt-1 mb-0">
          Texto de Wikipedia, bajo licencia
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.es"
            target="_blank"
            rel="noopener"
            >CC BY-SA 4.0</a
          >.
        </p>
      </div>
    </article>

    <template v-if="info.videos.length">
      <h3 class="text-subtitle-1 font-weight-bold mb-1">Videos que lo prueban</h3>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Reseñas publicadas en YouTube por sus autores; no son nuestras ni las patrocinamos. Pueden
        mostrar otra versión o año{{ forAdvert ? ' que el del aviso' : '' }}.
      </p>
      <div class="car-model-info__videos">
        <figure v-for="video in info.videos" :key="video.id" class="car-model-info__video">
          <VideosEmbed
            :video-id="video.id"
            :title="video.title"
            :thumbnail="carVideoThumbnail(video.id)"
          />
          <figcaption class="mt-2">
            <a :href="carVideoUrl(video.id)" target="_blank" rel="noopener" class="text-body-2">
              {{ video.title }}
            </a>
            <span class="d-block text-caption text-medium-emphasis">{{ video.channel }}</span>
          </figcaption>
        </figure>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { carVideoThumbnail, carVideoUrl, type PublicCarModelInfo } from '~/utils/carModelInfo'

const props = defineProps<{
  info: PublicCarModelInfo
  /** En la ficha de un aviso (y no en la página del modelo). */
  forAdvert?: boolean
}>()

const plain = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
const wikiNamesModel = computed(
  () => !props.info.wiki || plain(props.info.wiki.title).includes(plain(props.info.model))
)
</script>

<style scoped>
.car-model-info__wiki {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.car-model-info__thumb {
  flex: 0 0 auto;
  width: 160px;
  height: auto;
  max-height: 140px;
  object-fit: cover;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.car-model-info__videos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.car-model-info__video {
  margin: 0;
}
@media (max-width: 599px) {
  .car-model-info__wiki {
    flex-direction: column;
  }
  .car-model-info__thumb {
    width: 100%;
    max-height: 200px;
  }
}
</style>
